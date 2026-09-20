# ShikshaMesh MVP

An offline-first, multilingual education orchestration prototype. The first vertical slice accepts a student request, applies deterministic authorization, builds a visible task graph, and returns a grounded mock response. External research is optional and passes through a server-only SerpAPI gateway.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Add `SERPAPI_API_KEY` only if external research is enabled; the app runs without it.

For development uploads without AWS credentials, set `COURSE_STORAGE_PROVIDER=local` in `.env.local`. Original files are saved in the ignored `.local-course-storage/` directory; Qdrant and OpenRouter configuration is still required to index and search their contents. Start PostgreSQL with `docker compose up -d db` to persist the course list. Omit this setting to use S3. Local storage is rejected in production.

## Continuous integration

The GitHub Actions workflow in `.github/workflows/ci.yml` runs type checking, tests, intent evaluation, and a production build on pushes to `main` and pull requests. It has no AWS credentials and does not deploy resources.

### PostgreSQL with Docker

```bash
docker compose up -d db
```

The database uses host port `5433` by default because Windows/WSL commonly reserves `5432`. The initial schema and demo data are applied on the first database start from `db/init/`. Copy `.env.example` to `.env.local` to point the app at it. For an existing local database volume, apply new migrations with `docker compose exec db psql -U shikshamesh -d shikshamesh -f /docker-entrypoint-initdb.d/002_mastery_training_events.sql`. To intentionally reset the local database, run `docker compose down -v` and start it again.

## Implemented foundation

- Next.js UI that visualizes the orchestrator execution graph.
- Deterministic RBAC/ABAC authorization policy, separate from any LLM.
- Intent routing heuristic ready to be replaced with the SageMaker-hosted multi-label classifier.
- Tenant- and class-scoped course retrieval development repository and learner-mastery stub.
- SerpAPI server-side Search Gateway with PII redaction, allowlist, timeout and normalized citations.
- AWS-ready S3 course-upload adapter, Bedrock Converse tutor adapter and SageMaker endpoint router adapter; all use IAM credentials from the runtime environment.
- Bedrock Knowledge Bases retrieval adapter with institution/class metadata filters. It falls back to the local repository only when `BEDROCK_KNOWLEDGE_BASE_ID` is not configured.
- Cognito access-token verifier; tenant and class scope are derived from signed custom claims. `ALLOW_DEMO_IDENTITY` is for local development only.
- PWA manifest, navigation service worker, and IndexedDB request queue. Queued requests replay only when connectivity returns; privileged writes remain server-authorized.
- Teacher quiz-workflow endpoint that starts an AWS Step Functions execution when configured, or returns a local execution ID in development.
- Privacy-aware audit events for completed orchestrations and workflow starts; EventBridge is used when `AUDIT_EVENT_BUS_NAME` is configured.
- Intent routing selects the SageMaker multi-label endpoint when configured and falls back safely to the local deterministic router when it is unavailable.
- Grounded tutor generation invokes Bedrock only with retrieved course chunks; a local fallback keeps development and outage behavior explicit.
- Authorized S3 uploads optionally start a Bedrock Knowledge Base ingestion job when its data-source configuration is complete.
- SerpAPI is now executed only for an external-research intent, through the policy-gated Search Gateway; results are visibly labeled separately from course evidence.
- Adaptive Assessment Agent endpoints select questions by learner mastery and never send answer keys to the quiz-generation client payload.
- LangGraph routes interactive requests to Tutor, Teacher/Quiz, or Research agent roles; authorization remains enforced by the server-side tools and AWS workflows.
- MCP tool factory exposes actor-bound `course_search` and policy-gated `official_research` capabilities in [`mcp/`](mcp/README.md).

## Next milestones

The prioritized product, production, and ML delivery plan is in [`PRODUCT_ROADMAP.md`](PRODUCT_ROADMAP.md). Its signature learning capability is **Concept X-Ray**, which identifies and repairs a learner's first incorrect reasoning assumption using authorized course evidence; **Explain It Back** then validates recovery through text, voice, code, or canvas input.

## AWS infrastructure

The deployable foundation is in [`infra/`](infra/README.md). It intentionally requires a `terraform plan` review before any AWS resources are created.

## Hackathon submission

The track-ready project narrative, demo flow, and accurate AWS architecture mapping are in [`HACKATHON_SUBMISSION.md`](HACKATHON_SUBMISSION.md).

## ML and deep learning

The model roadmap and evaluation gates are documented in [`ML_DL_IMPLEMENTATION_PLAN.md`](ML_DL_IMPLEMENTATION_PLAN.md). SageMaker-ready multilingual Transformer training is in [`ml/intent/`](ml/intent/README.md); the GRU Deep Knowledge Tracing baseline and its pseudonymous event schema are in [`ml/mastery/`](ml/mastery/README.md). Training and endpoint deployment are intentionally manual cost-controlled steps, not part of the normal web-app build.

## Container deployment

```bash
docker build -t shikshamesh .
docker run --rm -p 3000:3000 --env-file .env.local shikshamesh
```

The container exposes `GET /api/health`; configure your ECS or App Runner health check to use that path.

The Socket.IO classroom service is deployed separately; see [`realtime/DEPLOYMENT.md`](realtime/DEPLOYMENT.md).

## Library Management System recording

Open `/demo` for the recording sequence. Upload `Library_Management_System_Report.pdf` as a teacher, then use a student account in the same class for tutor, notes, interview, Concept X-Ray, and practice. Inputs are prepared in `lib/demo-content.ts`; generated responses still use authorized uploaded notes. The five library diagram templates and fixed adaptive question bank are teaching examples, not generated output. Existing classes and historical records are retained.
