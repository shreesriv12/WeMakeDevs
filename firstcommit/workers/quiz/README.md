# Quiz workflow worker

One Lambda deployment package exposes four stages through `event.stage`:

- `generate` creates a quiz payload.
- `translate` creates one localized quiz result per requested language.
- `notify` schedules delivery.
- `analytics` initializes aggregate-only analytics.

The Step Functions definition in `infra/cli/quiz-workflow.asl.json` supplies the stage value. The worker deliberately contains no learner PII and no answer keys leave the server-side workflow.

Quiz generation uses OpenRouter when `OPENROUTER_API_KEY` is configured and the execution input contains `useOpenRouter: true`. It falls back to deterministic questions if OpenRouter cannot respond.

When enabled, the worker first retrieves course chunks from the configured Bedrock Knowledge Base using institution, class, and selected document ID metadata filters. It does not call Nova if retrieval returns no authorized chunks. The teacher page receives the document ID after upload and supplies it as `lectureSourceId` when launching the workflow.

Translation uses OpenRouter when `OPENROUTER_API_KEY` is configured. The translation stage validates the model response and otherwise returns the current deterministic status fallback.
