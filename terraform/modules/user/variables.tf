variable "primary_email" {
  type        = string
  description = "The user's primary email address"
}

variable "given_name" {
  type        = string
  description = "The user's first name. Required when creating a user account."
}

variable "family_name" {
  type        = string
  description = "The user's last name. Required when creating a user account."
}

variable "aliases" {
  type        = list(string)
  description = "List of the user's alias email addresses."
  default     = null
}

variable "recovery_email" {
  type        = string
  description = "Recovery email of the user."
  default     = null
}

variable "recovery_phone" {
  type        = string
  description = "Recovery phone of the user. The phone number must be in the E.164 format, starting with the plus sign (+). Example: +16506661212."
  default     = null
}

variable "organization_name" {
  type        = string
  description = "The name of the organization."
  default     = "company.com"
}

variable "organization_primary" {
  type        = bool
  description = "Indicates if this is the user's primary organization. A user may only have one primary organization."
  default     = true
}

variable "organization_title" {
  type        = string
  description = "The user's title within the organization, for example 'member' or 'engineer'."
}

variable "organization_type" {
  type        = string
  description = "The type of organization"
  default     = "work"
}

variable "suspended" {
  type        = bool
  description = "Indicates if user is suspended"
  default     = false
}

variable "password" {
  type    = string
  default = ""
}

variable "group_ids" {
  type    = list(string)
  default = []
}

variable "org_unit_path" {
  type    = string
  default = "/special"
}

variable "is_admin" {
  type        = bool
  description = "Indicates if user is admin"
  default     = false
}