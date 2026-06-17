# kb.npi.msk.ru

Docker deployment for the NPI knowledge base running `flameshikari/outline-ru:0.85.0`.

This repository keeps the Outline runtime patches needed for Storj-backed file storage. Secrets are not committed; create `docker.env` from `docker.env.example` during deployment.

## Deploy

```sh
cp docker.env.example docker.env
# fill docker.env with deploy secrets and Storj credentials
docker compose up -d
```

## Storj Upload Patch

The Storj S3 gateway was timing out on larger single `PutObject` uploads from the server. The patched storage layer writes larger files as 8 KB chunk objects plus a small metadata object, disables S3 keep-alive for Storj requests, and serves downloads back through Outline with `/api/files.get`.

The mounted patches are:

- `patches/S3Storage.js` - chunked Storj storage, backend signed download URLs, no keep-alive S3 client.
- `patches/Attachment.js` - buffers uploaded temp files before storage.
- `patches/attachments.js` - makes browser uploads go to Outline backend `/api/files.create`.
- `patches/api-index.js` - mounts the storage plugin upload route while `FILE_STORAGE=s3`.

## Nginx

The reverse proxy must pass the original host to Outline:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

An example config is in `nginx/wiki.npi.msk.ru.conf`.

