# NPI knowledge base and IT Help

Production deployment for the internal Outline editor and the public,
mobile-first instruction service.

- Editor: `https://wiki.npi.msk.ru`
- Public instructions: `https://kb.it-help.online`
- Storj public domain: `https://media.npi.msk.ru` (bucket `strapi`)

## Runtime

- Outline RU `1.9.2` on port `3000`
- QR sidecar on port `3001`
- PostgreSQL 15 and Redis 7
- Maximum Outline and Nginx upload size: 512 MiB

The public hostname is bound to one shared Outline collection. Authentication,
settings, administration, and editing API routes are blocked at Nginx. Editors
continue to work through `wiki.npi.msk.ru`.

Every public page receives a mobile QR button from the patched Outline HTML
template. The sidecar generates an SVG for the current page and provides a
download/copy dialog.

## Deploy

```sh
cp docker.env.example docker.env
# Fill docker.env with deployment secrets and Storj credentials.
docker compose up -d --build
```

The mounted runtime patches are in `patches/`. Reverse-proxy configurations for
the editor and public hostname are in `nginx/`.

## Storj status

The existing S3 credentials can write small objects to `strapi`, and those
objects are available through `media.npi.msk.ru`. Sustained uploads through the
Storj S3 gateway currently stall; this was reproduced from two servers with a
1 MiB probe. Until the gateway or a native Storj access grant is fixed, video
uploads remain on Outline local storage to avoid stalled or false-success
uploads. The 512 MiB application limit is already active.
