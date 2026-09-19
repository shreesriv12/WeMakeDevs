output "course_content_bucket" { value = aws_s3_bucket.course_content.id }
output "audit_event_bus_name" { value = aws_cloudwatch_event_bus.audit.name }
output "cognito_user_pool_id" { value = aws_cognito_user_pool.users.id }
output "cognito_app_client_id" { value = aws_cognito_user_pool_client.web.id }
output "quiz_workflow_state_machine_arn" { value = aws_sfn_state_machine.quiz.arn }
