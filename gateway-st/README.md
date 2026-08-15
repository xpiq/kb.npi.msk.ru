# GatewayST CT

Runtime target: `root@10.233.100.125` (Debian 12).

- GatewayST listens on `10.233.100.125:7777`.
- nftables permits the S3 port only from Outline at `10.233.100.107`.
- The access grant and generated S3 credentials live only in
  `/var/lib/gateway-st/config.yaml` with mode `0600`.
- Persistent GatewayST state lives in `/var/lib/gateway-st`.
- The service runs as an unprivileged `gateway-st` user with a 2 GiB memory limit.

The binary is installed from the official `storj/gateway-st` release and its
SHA-256 digest is verified before installation.

`finish-gateway-setup` converts a Storj API key into a serialized Access Grant
locally. The encryption passphrase is read without terminal echo, passed only
through stdin, and is not written to disk.
