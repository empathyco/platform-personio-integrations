module "analytics" {
  source             = "./modules/user"
  family_name        = "Account"
  given_name         = "Analytics"
  primary_email      = "analytics@company.com"
  recovery_email     = "someone@company.com"
  organization_title = "None"
}

module "info" {
  source             = "./modules/user"
  aliases            = ["admin@company.com"]
  family_name        = "Company"
  given_name         = "Info"
  primary_email      = "info@company.com"
  recovery_email     = "somebody@company.com"
  recovery_phone     = "+34666666666"
  organization_title = "None"
}

