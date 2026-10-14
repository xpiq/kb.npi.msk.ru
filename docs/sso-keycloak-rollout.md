# Outline SSO rollout through the existing Keycloak

Status: prepared only. Do not apply the identity mapping or enable OIDC until
the proposed pairs below have been manually confirmed.

## Verified current state

- Outline: `https://wiki.npi.msk.ru`, one team (`No Problem IT`), four active
  users, no configured authentication provider and no `user_authentications`
  rows.
- Existing email/SMTP sign-in is the recovery path and must remain enabled
  throughout the rollout.
- Keycloak: `26.8.0`, realm `master`, issuer
  `https://sso.npi.msk.ru/realms/master`.
- OIDC discovery is healthy at
  `https://sso.npi.msk.ru/realms/master/.well-known/openid-configuration`.
- There is no existing Keycloak client for Outline.
- Outline 1.10.1 requires an `email` claim. To attach an SSO identity to an
  existing account it also requires `email_verified=true` and a unique,
  case-insensitive exact email match.
- Only 6 of the 61 current Keycloak users have an email, and the three likely
  candidates below currently have `email_verified=false`.

## Mapping to confirm

| Existing Outline account | Proposed Keycloak account | Current result | Required decision/action |
| --- | --- | --- | --- |
| `pk@npi.msk.ru` (`pq`, admin) | `pk` / `pk@npi.msk.ru` | Exact email, strong match | Confirm pair; mark the Keycloak email verified |
| `margarita@sahara.casa` (`Маргарита`) | `kmm` / Margarita Kirillova | Strong name match; Keycloak email is empty | Confirm pair; set the exact Outline email in Keycloak and mark it verified |
| `zs@npi.msk.ru` (`Заур`) | `z.samedov` / `z.samedov@npi.msk.ru` | Strong name match, email mismatch | Confirm pair and choose the canonical email; make it identical on both sides and verified in Keycloak |
| `a9778351310@gmail.com` (`Алексей`) | Not identified | No safe unique candidate | Select the Keycloak login manually, or leave this account on email sign-in until identified |

Do not create rows directly in `user_authentications`. After confirmation,
Outline will create the association itself on the first successful OIDC login
and store the stable Keycloak `sub` identifier. Later email changes will then
not break the association.

## Keycloak client to create after confirmation

Create one confidential OpenID Connect client:

- Client ID: `outline`
- Client authentication: enabled
- Standard flow: enabled
- Direct access grants, implicit flow and service accounts: disabled
- Root/Home URL: `https://wiki.npi.msk.ru`
- Valid redirect URI: `https://wiki.npi.msk.ru/auth/oidc.callback`
- Valid post-logout redirect URI: `https://wiki.npi.msk.ru/*`
- Web origin: `https://wiki.npi.msk.ru`
- Client scopes: `openid profile email`
- PKCE: `S256`

The returned claims must include `sub`, `email`, `email_verified`, `name` and
`preferred_username`. Test them for the pilot account before changing any
other user.

## Outline configuration to stage

Use automatic discovery and keep the client secret outside Git:

```dotenv
OIDC_ISSUER_URL=https://sso.npi.msk.ru/realms/master
OIDC_CLIENT_ID=outline
OIDC_CLIENT_SECRET_FILE=/run/secrets/outline_oidc_client_secret
OIDC_DISPLAY_NAME=NPI SSO
OIDC_USERNAME_CLAIM=preferred_username
OIDC_SCOPES=openid profile email
OIDC_DISABLE_REDIRECT=true
```

Mount `/run/secrets/outline_oidc_client_secret` read-only into the Outline
container. `OIDC_DISABLE_REDIRECT=true` keeps the existing email sign-in visible
as the recovery path. Back up `docker.env`, the Compose file and PostgreSQL
before changing the runtime configuration, then recreate only the Outline
container.

## Safe activation sequence

1. Confirm every proposed pair and the canonical email for it.
2. Correct only the confirmed Keycloak email fields and set
   `email_verified=true`. Do not alter LDAP usernames or Keycloak user IDs.
3. Create the Keycloak client above and store its secret in a root-readable
   file on the Outline host; never place the secret in this repository.
4. Back up Outline configuration and database, add the OIDC variables and
   recreate only `outline-ru-outline-1`.
5. Keep the existing Outline admin session open. From that session, start the
   OIDC flow once as `pk`; this associates the new provider with the existing
   `No Problem IT` team rather than provisioning another team.
6. In a separate private browser window, sign in through `NPI SSO` as `pk`.
   Verify that the resulting Outline user ID is still
   `e40a8bbb-0454-4a02-8d2a-a0e8282ec99c`, the role is still `admin`, and the
   existing collections/documents are accessible.
7. Verify that exactly one OIDC `authentication_providers` row and one pilot
   `user_authentications` row were created. Then test each confirmed member one
   at a time and verify that no fifth Outline user appears.
8. Leave email sign-in enabled until all mapped users have completed a
   successful SSO login and the backup admin path has been tested.

## Stop and rollback conditions

Stop immediately if Outline creates a new team, creates a duplicate user,
changes an existing role, or Keycloak omits/does not verify the email claim.
Keep the original browser session open, remove the OIDC environment variables,
restore the previous Compose configuration, and recreate only the Outline
container. The existing SMTP login remains usable; do not delete users or edit
authentication rows as part of rollback.

## References

- Outline OIDC configuration: https://docs.getoutline.com/s/hosting/doc/oidc-8CPBm6uC0I
- Outline environment sample: https://github.com/outline/outline/blob/main/.env.sample
