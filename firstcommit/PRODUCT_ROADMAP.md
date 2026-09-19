# ShikshaMesh product roadmap

This roadmap prioritizes a polished, demonstrable learning experience first, then validates models and moves the platform safely to production. No learner-impacting AI decision should be deployed until its evaluation gate passes.

## Phase 1 — Product experience and Concept X-Ray

### Production UI polish

- Review every route at desktop and mobile widths.
- Make button placement, padding, spacing, focus states, and navigation consistent.
- Add consistent loading, empty, offline, and recoverable error states.
- Complete the public landing page, dedicated authentication flow, and signed-in account/logout controls.

### Concept X-Ray

**Goal:** identify the first incorrect assumption in a learner's reasoning rather than merely marking an answer wrong.

```text
Text, voice, code, or canvas explanation
  -> extract reasoning claims
  -> retrieve the relevant authorized course concepts
  -> identify the earliest misconception and confidence
  -> show a visual correction and evidence
  -> run a two-minute recovery challenge
  -> update mastery only after a successful re-explanation
```

- Build a course-scoped concept graph from uploaded notes.
- Support evidence inputs from tutor answers, AI interview transcripts, code, and canvas objects.
- Display a learner-facing misconception path with a clear correction bridge.
- Generate a small recovery task rather than a generic retry.
- Record evidence, confidence, and recovery outcome in PostgreSQL; never update mastery from an LLM assertion alone.
- Add a teacher misconception heatmap, aggregated by class and concept, with minimum cohort thresholds for privacy.
- Let a teacher open an approved correction exercise on the shared canvas from a misconception cluster.

### Explain It Back

- After remediation, ask the learner to teach the concept back in English, Hindi, Hinglish, voice, drawing, or code.
- Evaluate concept coverage and reasoning against authorized notes.
- Show constructive feedback and one missing concept at a time.
- Mark a concept as improved only after an objective check plus a successful explanation.

## Phase 2 — Collaborative classroom

- Improve Live Class and Canvas with real multi-user collaboration persistence.
- Add real teacher lesson creation and scheduling.
- Persist chat history, attendance, participant profiles, hand raises, and moderation decisions.
- Support shared canvas objects, presence, and conflict-safe updates.
- Add optional WebRTC/video-provider integration; do not simulate video.

## Phase 3 — Realtime production deployment

- Deploy Socket.IO separately from the Next.js application through ECS, App Runner, or EC2.
- Configure HTTPS and exact production CORS origins.
- Add a Redis adapter before horizontally scaling beyond one realtime server.
- Add connection, room, authentication-failure, and latency monitoring.

## Phase 4 — Real ML/DL model work

- Build a reviewed, consent-safe dataset of 300–500+ labeled intent queries.
- Train and evaluate the GRU/intent classifier and mastery model against the deterministic baseline.
- Record precision, recall, F1, calibration, subgroup behavior, and fallback rate.
- Deploy a model only if it demonstrably beats the heuristic baseline and passes safety review.
- Create SageMaker endpoints or asynchronous batch inference only after the evaluation gate succeeds.
- Keep deterministic routing and teacher review as fallbacks.

## Phase 5 — Real document validation

- Upload several representative PDF and DOCX documents.
- Confirm Bedrock Knowledge Base ingestion reaches `COMPLETE` for each document.
- Run course-grounded tutor, quiz, and interview checks.
- Verify citations and generated questions are relevant to the selected document only.
- Test corrupted, scanned, duplicate, oversized, and unauthorized document cases.

## Phase 6 — AWS production hardening

- Deploy the Next.js app and background workers to AWS.
- Add CloudWatch dashboards, alarms, structured logs, budgets, and billing alerts.
- Store secrets in AWS Secrets Manager; never deploy `.env.local`.
- Use least-privilege IAM roles and separate development/staging/production resources.
- Disable `ALLOW_DEMO_IDENTITY` and debug logging in production.

## Phase 7 — Database production setup

- Provision managed PostgreSQL (RDS) or an explicitly managed production PostgreSQL host.
- Introduce versioned database migrations.
- Configure backups, restore drills, connection pooling, encryption, and retention rules.
- Add data-access auditing and tenant-isolation tests.

## Phase 8 — Final quality and governance

- Add end-to-end browser tests for signup, upload, quiz, interview, canvas, and live class.
- Complete an accessibility pass: keyboard flow, contrast, labels, focus, and screen-reader semantics.
- Add privacy policy, consent text, and student-data retention/deletion controls.
- Conduct load, security, and failure-mode testing before public deployment.

## Immediate sequence

1. Review landing and authentication pages in the browser at mobile and desktop widths.
2. Persist Live Class chat and shared-canvas events in PostgreSQL.
3. Build the Concept X-Ray data model and evidence-capture API.
4. Add Explain It Back as the recovery step in tutor and interview flows.
