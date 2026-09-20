# ShikshaMesh Hackathon Demo Runbook

## Cost guardrail

Keep the demo under the $45 target. The separate $140 hard alert leaves a safety margin below the $161 credit balance. Before deploying, replace `REPLACE_WITH_YOUR_EMAIL` in `infra/cli/budget-alerts.json`, then run:

```powershell
aws budgets create-budget --account-id YOUR_ACCOUNT_ID --budget file://infra/cli/budget-alerts.json --region us-east-1
```

This sends alerts at $25, $50, $100, and $140. Do not create a SageMaker real-time endpoint, RDS instance, ECS cluster, or Redis instance for the demo.

## Preflight

```powershell
docker compose up -d db
npm test
npm run build
npm run realtime
```

Apply migrations to an existing database before the demo, including `015_diagram_templates.sql` and `016_account_deletion_requests.sql`.

## Document-grounded validation

1. Upload one small PDF/DOCX for the selected class.
2. Confirm Qdrant indexing is available immediately.
3. Start one Bedrock Knowledge Base ingestion and wait for `COMPLETE`; do not retry rapidly on a `429` throttle.
4. Generate one Hindi quiz and one AI interview only after ingestion completes.
5. Verify every answer shows a relevant document source; generic content means the fallback was used.

## Two-user classroom validation

1. Sign in as a teacher and a student in separate browser profiles.
2. Join the same scheduled lesson at `/live`.
3. Send a chat message, raise a hand, publish a Canvas object, and confirm both profiles receive it.
4. Check attendance and the teacher misconception screen.
5. Test optional IVS video only if the stage is configured; do not simulate video.

## Production demo configuration

- Deploy the web app and Socket.IO service separately.
- Set `ALLOW_DEMO_IDENTITY=false`, `DEBUG_LOGS=false`, `DEPLOYMENT_ENV=production`.
- Use exact HTTPS `REALTIME_ALLOWED_ORIGIN` and `NEXT_PUBLIC_REALTIME_URL` values.
- Put provider keys in AWS Secrets Manager and use IAM runtime roles. Rotate any key ever pasted into chat or screenshots.
- Run `GET /api/health` after deployment and verify `safety.ready` is `true`.
