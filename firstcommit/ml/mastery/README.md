# Deep Knowledge Tracing (GRU)

The mastery model predicts whether a learner will answer the next question correctly. It consumes chronological, pseudonymous attempt events:

```csv
learner_id,topic_id,question_id,is_correct,occurred_at,difficulty
learner-a,fractions,q-12,1,2026-09-19T10:00:00Z,easy
```

Run after real consented attempts exist:

```bash
python ml/mastery/train.py --events data/mastery/attempts.csv --output ml/artifacts/mastery
```

Synthetic data may validate the code path but must never be used to claim model quality.

## Application inference contract

The application keeps SageMaker inference disabled by default. After the GRU beats the historical baseline on real consented data, deploy an endpoint that accepts:

```json
{"attempts":[{"topic_id":"fractions","question_id":"q-12","is_correct":1,"difficulty":"easy"}]}
```

and returns:

```json
{"mastery":{"fractions":0.74},"modelVersion":"dkt-2026-09-19"}
```

Then set `SAGEMAKER_MASTERY_ENDPOINT` and `ENABLE_SAGEMAKER_MASTERY=true`. If the endpoint is unavailable or returns invalid data, ShikshaMesh uses the student’s tenant-scoped PostgreSQL attempt history instead.

For a local pipeline-only test, generate the included pseudonymous synthetic events:

```bash
npm run generate:synthetic-mastery
python ml/mastery/train.py --events data/mastery/synthetic-attempts.csv --output ml/artifacts/mastery-synthetic
```
