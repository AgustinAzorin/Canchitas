# Infraestructura como código (ADR 0013). Esqueleto de M0: providers y variables, sin recursos.
# El VPS, el DNS y los buckets de R2 se agregan en M1 con el deploy a staging; el proveedor del
# VPS se decide ahí.
terraform {
  required_version = "= 1.12.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "= 5.26.0"
    }
  }

  # El estado va a un bucket de R2 (backend s3) cuando existan recursos. Hasta entonces, local.
}
