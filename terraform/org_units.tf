resource "googleworkspace_org_unit" "company" {
  name                 = "company.com"
  description          = "Company OU"
  parent_org_unit_path = ""
}

resource "googleworkspace_org_unit" "employees" {
  name                 = "employees"
  description          = "Company employees org unit"
  parent_org_unit_path = "/"
}

resource "googleworkspace_org_unit" "special" {
  name                 = "special"
  description          = "Company special users to avoid 2FA"
  parent_org_unit_path = "/"
}