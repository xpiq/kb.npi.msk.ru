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
button, but it points to the immutable `wiki.npi.msk.ru/doc/<urlId>` address and
requires authentication.

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
