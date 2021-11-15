resource "googleworkspace_group" "all" {
  email       = "all@company.com"
  aliases     = ["all@domain.com"]
  name        = "Full list"
  description = "All users from the company"
}

resource "googleworkspace_group" "backend" {
  email       = "backend@company.com"
  name        = "Backend developers"
  description = "All backend developers"
}

resource "googleworkspace_group" "frontend" {
  email       = "frontend@company.com"
  name        = "Frontend developers"
  description = "All frontend developers"
}