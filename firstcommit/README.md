# ShikshaMesh

> A document-grounded learning workspace that helps students understand difficult concepts, practise explaining them, and collaborate with teachers in context.

[Live frontend demo](https://firstcommit-umber.vercel.app) · [Demo runbook](HACKATHON_DEMO_RUNBOOK.md) · [Submission notes](HACKATHON_SUBMISSION.md)

## The problem

Students often have notes, recorded lectures, assignments, and doubts, but no connected way to use them. Generic AI chatbots can answer confidently without following the teacher's material. Meanwhile, teachers struggle to see *why* students are confused, especially in large or mixed-language classrooms.

ShikshaMesh turns a teacher's uploaded course material into a private learning space. Students can ask grounded questions, create visual notes and diagrams, practise in an AI interview, take adaptive quizzes, and receive feedback that identifies the first incorrect assumption in their reasoning. Teachers can use the same workspace to upload content, schedule assessments, monitor learning signals, and run collaborative live sessions.

The project is designed for college learners, especially students studying technical subjects in English, Hindi, or Hinglish, where one misunderstood foundational concept can make the rest of a topic feel inaccessible.

## What ShikshaMesh includes

### Student learning workspace

| Feature | What it does | Why it matters |
| --- | --- | --- |
| **Grounded AI Tutor** | Answers questions using retrieved chunks from the student's own course material and displays source references. | Keeps learning tied to the class notes instead of generic web knowledge. |
| **Smart Notes** | Converts a topic into structured revision notes with headings, key ideas, examples, recall prompts, and bilingual-friendly explanations. | Gives students a usable study guide instead of a long unstructured answer. |
| **Adaptive assessment** | Builds quizzes, tracks attempts, estimates mastery, and recommends the next learning action. | Lets a learner practise at the level they currently need. |
| **AI Interview** | Asks progressively deeper, note-grounded oral questions and supports text, speech-to-text, and text-to-speech. | Helps students practise explaining concepts, not just selecting options. |
| **Concept X-Ray** | Analyses an answer, voice transcript, code snippet, or explanation to identify the earliest likely misconception and gives a short recovery challenge. | Moves feedback from “wrong answer” to “this is where your understanding broke.” |
| **Explain It Back** | Lets a student teach the corrected idea back in English, Hindi, Hinglish, voice, text, code, or a drawing. | Reinforces active recall and checks whether the correction actually worked. |
| **Learning Canvas** | Provides a visual workspace for notes, freehand drawing, shapes, connectors, code snippets, geometry objects, diagrams, and export. | Supports learners who understand better by drawing a table, graph, flow, or system diagram. |
| **Diagram Studio** | Generates and edits Mermaid diagrams, including UML, flowcharts, database schemas, system design diagrams, and DSA visualisations. | Makes abstract relationships visible without requiring students to learn diagram syntax first. |
| **Code workspace** | Adds a Monaco-based code surface for small programming explanations and algorithm practice. | Lets technical learners show reasoning through code, not only prose. |
| **Official resource discovery** | Uses governed SerpApi search to discover relevant official learning resources and topic-focused video playlists. | Extends a lesson with current, credible material while preserving domain controls. |
| **Offline-friendly experience** | Includes offline status and resilient client behaviour for interrupted connectivity. | Makes the workspace more usable for students with unreliable internet. |

### Teacher and classroom workspace

| Feature | What it does | Why it matters |
| --- | --- | --- |
| **Teacher document upload** | Uploads PDF, DOCX, and TXT course material to a class-scoped knowledge base. | Establishes the trusted source of truth for every downstream experience. |
| **Ingestion tracking** | Shows document processing and knowledge-base ingestion status. | Makes it clear when uploaded material is ready to use. |
| **Quiz creation and scheduling** | Creates course-aware quizzes and triggers an auditable workflow for generation, translation, notification, and analytics. | Reduces repetitive teacher work while preserving control over the source and schedule. |
| **Teacher dashboard** | Separates teacher-only actions such as uploads, lesson controls, scheduling, learner signals, and interventions. | Avoids mixing student and teacher workflows in the same interface. |
| **Misconception heatmap** | Aggregates recurring Concept X-Ray patterns for a class. | Helps a teacher revisit the exact idea a large group is misunderstanding. |
| **Live Class** | Offers presence, chat, raised hands, linked canvas objects, collaborative discussion, and optional video-room integration. | Keeps live explanation tied to the same visual and document context students use independently. |
| **Teacher diagram templates** | Provides reusable templates for UML, flowcharts, database schemas, system design, and DSA activities. | Lets teachers begin a lesson with a meaningful visual instead of a blank board. |
| **Attendance and activity signals** | Captures classroom events and learning activity for follow-up workflows. | Gives teachers useful context without pretending that activity alone equals mastery. |

### Platform, privacy, and accessibility

- Cognito-based sign-up, sign-in, password recovery, account controls, and role-aware navigation.
- Student, teacher, and admin permissions with Cedar policy evaluation for local policy checks.
- Consent controls for optional research/training participation.
- Account-deletion request flow and auditable learner-data events.
- Source citations, loading states, empty states, error states, and offline-state messaging across key learning flows.
- Keyboard-friendly forms, labelled controls, responsive layouts, and readable high-contrast UI foundations.

## How it works

```text
Teacher uploads PDF / DOCX / TXT
             |
             v
S3 course storage --> extraction and chunking --> Qdrant retrieval index
             |                                      |
             |                                      v
             |                           Bedrock Knowledge Base ingestion
             v
Student asks, draws, codes, speaks, or takes a quiz
             |
             v
Retriever selects only class-scoped course context
             |
             +--> Tutor / Smart Notes / AI Interview / Concept X-Ray
             +--> Adaptive Quiz workflow
             +--> Diagram and Canvas learning activities
             |
             v
PostgreSQL mastery, consent, classroom, and audit records
```

## Architecture and technology

| Area | Technology |
| --- | --- |
| Web application | Next.js 15, React 19, TypeScript |
| Authentication | Amazon Cognito |
| Course files | Amazon S3 |
| Knowledge retrieval | Qdrant Cloud, OpenRouter embeddings, Amazon Bedrock Knowledge Bases where configured |
| AI generation | Amazon Bedrock Nova and OpenRouter model fallback/configuration |
| Quiz workflow | AWS Lambda, AWS Step Functions, Amazon EventBridge, Amazon Translate |
| Database | PostgreSQL, locally through Docker and production-ready for hosted PostgreSQL |
| Live collaboration | Socket.IO, React Konva, Mermaid, Monaco Editor |
| Optional video room | Amazon IVS Real-Time participant-token integration |
| Voice | Deepgram speech-to-text and Deepgram/ElevenLabs text-to-speech when configured |
| Current-resource search | SerpApi with an allow-list for trusted educational domains |
| Local policy | Cedar via `@cedar-policy/cedar-wasm` |
| Local cloud testing | AWS SAM templates and LocalStack profile/configuration |
| Deployment | Vercel frontend deployment; Render-ready full-stack Next.js deployment configuration |

## AWS services used in this project

ShikshaMesh uses AWS services where they provide a real product capability. The table intentionally distinguishes active implementation from planned scale-up services.

| Service | Use in ShikshaMesh |
| --- | --- |
| **Amazon Cognito** | Authentication, user identity, roles, and protected student/teacher access. |
| **Amazon S3** | Class-scoped course document storage. |
| **Amazon Bedrock Knowledge Bases** | Optional managed ingestion and retrieval for course documents. |
| **Amazon Bedrock Nova** | Grounded generation when enabled by the relevant workflow configuration. |
| **AWS Lambda** | Quiz worker execution. |
| **AWS Step Functions** | Orchestrates quiz generation, translation, notifications, and analytics stages. |
| **Amazon EventBridge** | Audit and learning-workflow events. |
| **Amazon Translate** | Quiz translation workflow support. |
| **Amazon CloudWatch** | Workflow visibility, logs, and dashboard/alarm foundation. |
| **AWS IAM and IAM Identity Center** | Access management and least-privilege-oriented administration. |
| **Amazon IVS Real-Time** | Optional, server-issued participant-token video-room capability. |

### Build It, local and open-source tooling

| Tool | Role |
| --- | --- |
| **Docker Desktop** | Runs local PostgreSQL and supporting development services. |
| **AWS SAM CLI templates** | Defines local Lambda invocation and API testing paths. |
| **LocalStack profile** | Provides a local-emulation configuration for S3, Lambda, SQS, and EventBridge experiments. |
| **Cedar** | Evaluates authorization policies locally. |

### Deliberately not claimed as active ShikshaMesh infrastructure

EC2, ECS/Fargate, EKS, RDS/Aurora, App Runner, CloudFront, Route 53, SQS, SNS, DynamoDB, and SageMaker hosted endpoints are not currently active ShikshaMesh production dependencies. They are sensible future options for scaling the service, but this README does not represent them as deployed merely because they were evaluated or are available in AWS.

## Quick start

### Prerequisites

- Node.js 22+
- npm
- Docker Desktop for local PostgreSQL
- A configured `.env.local` file. Never commit this file or API keys.

### Run locally

```powershell
git clone https://github.com/shreesriv12/WeMakeDevs.git
cd WeMakeDevs\firstcommit
npm install
docker compose up -d db
npm run db:migrate
npm run dev
```

Open `http://localhost:3000` or the port printed by Next.js.

For development uploads without AWS credentials, set `COURSE_STORAGE_PROVIDER=local` in `.env.local`. Original files are saved in the ignored `.local-course-storage/` directory; Qdrant and OpenRouter configuration is still required to index and search their contents. Start PostgreSQL with `docker compose up -d db` to persist the course list. Omit this setting to use S3. Local storage is rejected in production.

## Continuous integration

```powershell
npm run realtime
```

### Environment configuration

Copy the example file and fill only the services you intend to test:

```powershell
Copy-Item .env.example .env.local
```

At minimum, local database work needs `DATABASE_URL`. Cognito flows need the Cognito region, user-pool ID, and app-client ID. Document-grounded generation additionally needs the S3, Qdrant, and selected model-provider configuration. Keep production secrets in the deployment provider's encrypted environment-variable settings, never in Git.

### Hosted PostgreSQL migration

For a hosted database, set its external TLS-enabled connection string only for the migration command:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
npm run db:migrate
Remove-Item Env:DATABASE_URL
```

The migration runner records completed files in `schema_migrations` and applies the SQL files in `db/init` in order.

## Validation commands

```powershell
npx tsc --noEmit
npm test
npm run policy:cedar
npm run db:migrate
```

Use real, small course documents for the first knowledge-base test. Keep managed-generation toggles off until ingestion reports `COMPLETE`, then run one grounded validation and inspect the resulting sources.

## Deploying the demo

The public frontend is currently deployed on Vercel:

```text
https://firstcommit-umber.vercel.app
```

For a fresh production deployment from the project directory:

```powershell
npx vercel@latest --prod --archive=tgz
```

The container exposes `GET /api/health`; configure your ECS or App Runner health check to use that path.

The Socket.IO classroom service is deployed separately; see [`realtime/DEPLOYMENT.md`](realtime/DEPLOYMENT.md).

## Library Management System recording

Open `/demo` for the recording sequence. Upload `Library_Management_System_Report.pdf` as a teacher, then use a student account in the same class for tutor, notes, interview, Concept X-Ray, and practice. Inputs are prepared in `lib/demo-content.ts`; generated responses still use authorized uploaded notes. The five library diagram templates and fixed adaptive question bank are teaching examples, not generated output. Existing classes and historical records are retained.
