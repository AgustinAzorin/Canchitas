variable "ambiente" {
  description = "staging o prod (ADR 0013)."
  type        = string

  validation {
    condition     = contains(["staging", "prod"], var.ambiente)
    error_message = "El ambiente es staging o prod."
  }
}

variable "cloudflare_account_id" {
  description = "Cuenta de Cloudflare para DNS y R2."
  type        = string
}
