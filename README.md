# NPI knowledge base and IT Help

Production deployment for the internal Outline editor and the public,
mobile-first instruction service.

- Editor: `https://wiki.npi.msk.ru`
- Public instructions: `https://kb.it-help.online`
- RustDesk download shortcut: `https://rust.npi.msk.ru`
- Storj public domain: `https://media.npi.msk.ru` (bucket `strapi`)

## Runtime

- Outline RU `1.10.1` on port `3000`
- QR sidecar on port `3001`
- PostgreSQL 15 and Redis 7
- Maximum Outline and Nginx upload size: 512 MiB

The public hostname uses one shared Outline collection only as its publication
source. The collection index, direct Outline document routes, search,
authentication, administration, and general API routes are blocked at Nginx.
Editors continue to work through `wiki.npi.msk.ru`.

Every instruction receives a mobile QR button from the patched Outline HTML
template. Public instructions get a stable anonymous URL such as
`https://kb.it-help.online/kb583104927`; the name is `kb` plus nine random
digits. A persistent registry guarantees that every public document keeps the
same unique code, so renaming it does not invalidate printed QR codes. Outline
still enforces the public share: a code stops resolving while its document is
outside the published IT Help tree. The QR sidecar renders an isolated,
mobile-first page containing only that document; neighboring instructions and
the collection tree are never exposed. Internal instructions keep the same QR
button, but it points to Outline's full canonical
`wiki.npi.msk.ru/doc/<slug>-<urlId>` address and requires authentication. The
full path is preserved because the deployed Outline fork does not reliably
resolve the shortened `/doc/<urlId>` form after login.

## Deploy

```sh
cp docker.env.example docker.env
# Fill docker.env with deployment secrets and Storj credentials.
docker compose up -d --build
```

The mounted runtime patches are in `patches/` and are rebased on the matching
Outline `1.10.1` sources. Reverse-proxy configurations for the editor and public
hostname are in `nginx/`.

`nginx/rust.npi.msk.ru.redirect.conf` is an isolated temporary redirect to the
public RustDesk download instruction at
`https://kb.it-help.online/kb478550122`. The vhost uses the existing
`*.npi.msk.ru` certificate and does not proxy to, or modify, the Outline
service. Its DNS A record must point to the shared Nginx proxy
(`79.137.227.154` in public DNS and `10.233.100.102` in internal split-DNS).

The reviewed, confirmation-gated Keycloak migration procedure and the current
four-user mapping preview are in `docs/sso-keycloak-rollout.md`. No SSO changes
are applied by that document.

## Storj status

The existing S3 credentials can write small objects to `strapi`, and those
objects are available through `media.npi.msk.ru`. Sustained uploads through the
Storj S3 gateway currently stall; this was reproduced from two servers with a
1 MiB probe. Until the gateway or a native Storj access grant is fixed, video
uploads remain on Outline local storage to avoid stalled or false-success
uploads. The 512 MiB application limit is already active.
