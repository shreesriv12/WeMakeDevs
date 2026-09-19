export function runtimeStatus() {
  return {
    aws: Boolean(process.env.AWS_REGION),
    cognito: Boolean(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_APP_CLIENT_ID),
    courseStorage: Boolean(process.env.COURSE_CONTENT_BUCKET),
    knowledgeBase: Boolean(process.env.BEDROCK_KNOWLEDGE_BASE_ID && process.env.BEDROCK_KNOWLEDGE_BASE_DATA_SOURCE_ID),
    tutorModel: Boolean(process.env.BEDROCK_TUTOR_MODEL_ID),
    quizWorkflow: Boolean(process.env.QUIZ_WORKFLOW_STATE_MACHINE_ARN),
    auditBus: Boolean(process.env.AUDIT_EVENT_BUS_NAME),
    serpapi: Boolean(process.env.SERPAPI_API_KEY && process.env.SERPAPI_ALLOWED_DOMAINS),
    sagemaker: Boolean(process.env.SAGEMAKER_INTENT_ENDPOINT)
  };
}
