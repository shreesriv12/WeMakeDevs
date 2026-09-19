locals { name = "${var.project}-${var.environment}" }

resource "aws_kms_key" "content" {
  description             = "${local.name} course-content encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_s3_bucket" "course_content" { bucket = var.course_bucket_name }

resource "aws_s3_bucket_public_access_block" "course_content" {
  bucket = aws_s3_bucket.course_content.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "course_content" {
  bucket = aws_s3_bucket.course_content.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "course_content" {
  bucket = aws_s3_bucket.course_content.id
  rule {
    apply_server_side_encryption_by_default { kms_master_key_id = aws_kms_key.content.arn, sse_algorithm = "aws:kms" }
    bucket_key_enabled = true
    blocked_encryption_types = ["SSE-C"]
  }
}

resource "aws_cloudwatch_event_bus" "audit" { name = "${local.name}-audit" }

resource "aws_cognito_user_pool" "users" {
  name = "${local.name}-users"
  username_attributes = ["email"]
  auto_verified_attributes = ["email"]
  schema {
    name = "institution_id"
    attribute_data_type = "String"
    mutable = true
    required = false
    string_attribute_constraints {
      min_length = 1
      max_length = 80
    }
  }
  schema {
    name = "class_ids"
    attribute_data_type = "String"
    mutable = true
    required = false
    string_attribute_constraints {
      min_length = 0
      max_length = 1000
    }
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name = "${local.name}-web"
  user_pool_id = aws_cognito_user_pool.users.id
  generate_secret = false
  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}

resource "aws_iam_role" "workflow" {
  name = "${local.name}-quiz-workflow"
  assume_role_policy = jsonencode({ Version="2012-10-17", Statement=[{ Effect="Allow", Principal={ Service="states.amazonaws.com" }, Action="sts:AssumeRole" }] })
}

resource "aws_sfn_state_machine" "quiz" {
  name = "${local.name}-quiz"
  role_arn = aws_iam_role.workflow.arn
  type = "STANDARD"
  definition = jsonencode({ Comment="Quiz workflow integration contract", StartAt="ValidateRequest", States={ ValidateRequest={ Type="Pass", Next="DispatchQuizWorker" }, DispatchQuizWorker={ Type="Pass", End=true } } })
}
