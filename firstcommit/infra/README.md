# ShikshaMesh AWS foundation

This Terraform module creates the non-application AWS foundation only: encrypted/versioned course S3 storage, EventBridge audit bus, Cognito user pool and web client, and a placeholder Standard Step Functions quiz state machine. It does **not** deploy application compute, a Bedrock Knowledge Base, or a SageMaker endpoint.

## Apply

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Use the outputs to set `COURSE_CONTENT_BUCKET`, `AUDIT_EVENT_BUS_NAME`, `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`, and `QUIZ_WORKFLOW_STATE_MACHINE_ARN` in the application runtime. Set `ALLOW_DEMO_IDENTITY=false` outside local development.

Before production, replace the two `Pass` states in the Step Functions definition with independently deployed quiz-generation, translation, scheduling, and analytics worker tasks. Do not apply this module from a personal AWS account without reviewing the plan and your organization’s retention, KMS, and data-residency policies.
