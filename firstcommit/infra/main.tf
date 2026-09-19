resource "aws_cognito_user_pool" "users" {
  name = "${local.name}-users"

  username_attributes = [
    "email"
  ]

  auto_verified_attributes = [
    "email"
  ]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  schema {
    name                = "institution_id"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 80
    }
  }

  schema {
    name                = "class_ids"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 0
      max_length = 1000
    }
  }
}

resource "aws_cognito_user_group" "student" {
  user_pool_id = aws_cognito_user_pool.users.id
  name         = "student"
  description  = "ShikshaMesh students"
  precedence   = 30
}

resource "aws_cognito_user_group" "teacher" {
  user_pool_id = aws_cognito_user_pool.users.id
  name         = "teacher"
  description  = "ShikshaMesh teachers"
  precedence   = 20
}

resource "aws_cognito_user_group" "admin" {
  user_pool_id = aws_cognito_user_pool.users.id
  name         = "admin"
  description  = "ShikshaMesh administrators"
  precedence   = 10
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${local.name}-web"
  user_pool_id = aws_cognito_user_pool.users.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"

  read_attributes = [
    "email",
    "name",
    "custom:institution_id",
    "custom:class_ids"
  ]

  write_attributes = [
    "email",
    "name",
    "custom:institution_id",
    "custom:class_ids"
  ]
}