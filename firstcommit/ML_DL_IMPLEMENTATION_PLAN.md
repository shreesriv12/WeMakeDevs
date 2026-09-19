# ShikshaMesh ML and deep-learning delivery plan

## Objective

Add measurable, trained ML/DL components to the existing AWS and RAG foundation without routing student data across tenants or deploying an unproven model.

## Model roadmap

| Order | Model | Type | Input | Output | Deployment gate |
| --- | --- | --- | --- | --- | --- |
| 1 | Multilingual intent classifier | Fine-tuned Transformer | Student query | One or more supported intents plus confidence | Test micro-F1 must beat the heuristic baseline (currently 0.903) and every class must have enough reviewed examples |
| 2 | Mastery predictor | Deep Knowledge Tracing (GRU) | Ordered, pseudonymous quiz attempts | Probability of next-question correctness by topic | AUC and calibration must beat a simple per-topic historical baseline |
| 3 | Question-quality scorer | Gradient-boosted or Transformer classifier | Generated question and source metadata | Valid / revise / reject and predicted difficulty | Human-reviewed validation set and minimum precision threshold |
| 4 | Tutor and quiz generation | Bedrock LLM with RAG | Authorized retrieved course chunks | Cited response or validated quiz JSON | Grounding and tenant-isolation tests pass |

## Delivery phases

### Phase A — Data governance and datasets

1. Keep student identifiers out of training files. Use a stable, salted `learner_id` only for mastery sequences.
2. Store raw uploads and approved curated datasets in separate S3 prefixes.
3. Review every intent label. Supported labels are `assessment`, `personalization`, `knowledge_retrieval`, `language_support`, and `external_research`.
4. Grow the intent corpus to 300–500 reviewed queries, including English, Hindi, and Hinglish. Split by normalized query before training to prevent leakage.
5. Start mastery collection only from real consented quiz attempts. Synthetic events are permitted for pipeline testing, never for reporting model quality.

### Phase B — Intent Transformer

1. Use `distilbert-base-multilingual-cased` with multi-label sigmoid outputs.
2. Train with binary cross entropy, choose one threshold per label on validation data, and report micro precision, recall, F1, exact match, and per-label F1 on the untouched test set.
3. Run the local heuristic and Transformer on exactly the same test file.
4. Register/deploy only if the Transformer beats the heuristic and does not materially degrade any safety-critical label.
5. Initially use a SageMaker batch transform or a small serverless endpoint. Do not leave a large real-time endpoint running.

### Phase C — Deep Knowledge Tracing

1. Collect attempt rows with `learner_id`, `topic_id`, `question_id`, `is_correct`, `occurred_at`, and `difficulty`.
2. Sort attempts by learner and time. The GRU receives prior topic/correctness/difficulty features and predicts the next response correctness.
3. Evaluate with held-out learners, AUC, Brier score, and calibration. Compare with a per-topic historical-correctness baseline.
4. Write only aggregate risk signals to teacher views. Never expose individual predicted weakness to another student.

### Phase D — Production safety

1. Save each model version, dataset version, metrics, thresholds, and approval decision.
2. Add drift checks for language distribution, intent frequency, missing labels, and mastery calibration.
3. Keep a deterministic fallback for intent routing and adaptive assessments when SageMaker is unavailable.
4. Log model version and confidence in the audit event without storing raw student query text.

## AWS sequence

1. Upload approved train/validation/test JSONL to an encrypted S3 training prefix.
2. Create a least-privilege SageMaker execution role with access only to that prefix and its output prefix.
3. Launch a small spot training job in `us-east-1` using `ml/intent/train.py`.
4. Compare evaluation metrics against the repository baseline.
5. Register the winning artifact and use batch inference first.
6. Create an endpoint only after approval; configure auto-scaling or serverless inference and a deletion date/budget alarm.

## Current action status

- Intent dataset preparation and heuristic evaluation: available.
- SageMaker-ready Transformer training program: added in `ml/intent/`.
- Deep Knowledge Tracing training program and event contract: added in `ml/mastery/`.
- Paid SageMaker training and endpoint deployment: intentionally not started.
