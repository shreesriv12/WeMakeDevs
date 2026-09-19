export type DeploymentSafety = { production: boolean; ready: boolean; issues: string[] };

export function deploymentSafety(): DeploymentSafety {
  const production = process.env.NODE_ENV === "production" || process.env.DEPLOYMENT_ENV === "production";
  if (!production) return { production: false, ready: true, issues: [] };
  const issues: string[] = [];
  if (process.env.ALLOW_DEMO_IDENTITY === "true") issues.push("Demo identity must be disabled in production");
  if (process.env.DEBUG_LOGS === "true") issues.push("Debug logs must be disabled in production");
  if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_APP_CLIENT_ID) issues.push("Cognito configuration is required in production");
  if (!process.env.DATABASE_URL) issues.push("PostgreSQL configuration is required in production");
  if (!process.env.SIGNUP_ROLE_TOKEN_SECRET || process.env.SIGNUP_ROLE_TOKEN_SECRET.length < 32) issues.push("A strong signup role token secret is required in production");
  if (!process.env.REALTIME_ALLOWED_ORIGIN?.startsWith("https://")) issues.push("Realtime must have an exact HTTPS allowed origin in production");
  return { production: true, ready: issues.length === 0, issues };
}
