# ShikshaMesh — Ship It / Agents and AI

## Track

**Primary:** Ship It → Agents and AI

ShikshaMesh is a deployed-AWS-ready learning platform that turns authorized course notes into grounded tutoring, adaptive quizzes, AI interviews, Concept X-Ray reasoning diagnosis, shared visual workspaces, and teacher intervention signals.

## Problem

Students often receive a score or generic chatbot reply after getting something wrong. Teachers do not see the first incorrect assumption that caused the mistake, especially across text, voice, code, and drawings.

## Solution

**Concept X-Ray** finds the earliest likely misconception from a student explanation using only their course material. It gives a correction bridge and a short Explain It Back challenge. A successful recovery is recorded in the learner’s mastery history, while teachers receive privacy-conscious misconception clusters to guide the next lesson.

## AWS architecture

| Capability | AWS service / implementation |
| --- | --- |
| Identity and roles | Amazon Cognito |
| Course documents | Amazon S3 |
| Grounded retrieval and generation | Amazon Bedrock Knowledge Bases and Bedrock models |
| Intent and mastery ML path | Amazon SageMaker endpoint adapter with local evaluation gates |
| Quiz orchestration | AWS Step Functions and Lambda worker path |
| Audit events | Amazon EventBridge |
| Structured data | PostgreSQL locally; Amazon RDS-ready deployment path |
| App and realtime delivery | Docker, ECS/App Runner-ready Next.js and Socket.IO services |
| Observability | CloudWatch-ready structured logs, alarms, budgets planned in infrastructure runbook |

## AI workflow

```text
Authorized course document
  → S3 / Knowledge Base or Qdrant development retrieval
  → Tutor, quiz, interview, Smart Notes, Diagram Studio, or Concept X-Ray
  → cited response / visual learning artifact
  → Explain It Back recovery
  → PostgreSQL mastery history + teacher misconception heatmap
```

## What judges can demo

1. Sign in as a student and ask a document-grounded tutor question.
2. Open Smart Notes, Diagram Studio, Canvas, or AI Interview for that exact topic.
3. Submit a flawed explanation in Concept X-Ray and complete Explain It Back.
4. Sign in as a teacher and open **Misconceptions** to see aggregated class signals.
5. Save a class diagram template, load it in Diagram Studio, and publish it to the shared Canvas.
6. Open the same lesson Canvas in two accounts to demonstrate persisted collaboration, presence, cursors, chat, and optional video room support.

## Local demo commands

```powershell
docker compose up -d db
npm run dev
npm run realtime
```

Open `http://localhost:3000` (or the port selected by Next.js). For a newly added migration on an existing database volume, run the relevant SQL file from `db/init/` with `psql`.

## Honest deployment status

The AWS adapters, Terraform foundation, container images, Cognito integration, workflow definitions, and runtime configuration are implemented. A public production URL requires the account owner to apply Terraform/deployment changes and configure secrets in AWS Secrets Manager. No AWS resources are created by this document or by normal local development.

## Differentiator

ShikshaMesh does not merely mark answers wrong. It identifies where the reasoning broke, teaches the bridge back to the correct concept, verifies the student can explain it back, and gives the teacher a class-level visual signal for the next intervention.
