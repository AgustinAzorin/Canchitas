# OpenTofu

Esqueleto de M0 (ADR 0013): solo providers y variables. Los recursos (VPS, DNS, buckets de R2 para
backups y PMTiles) llegan en M1, junto con el deploy a staging.

```sh
docker run --rm -v "$PWD":/w -w /w ghcr.io/opentofu/opentofu:1.12.6 init -backend=false
docker run --rm -v "$PWD":/w -w /w ghcr.io/opentofu/opentofu:1.12.6 validate
```
