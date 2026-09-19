# Multilingual intent Transformer

The program fine-tunes `distilbert-base-multilingual-cased` as a multi-label classifier. Each input row is JSONL:

```json
{"id":"intent-0001","query":"Mujhe quiz chahiye","labels":["assessment"]}
```

For local training, install `ml/requirements.txt`, then run:

```bash
python ml/intent/train.py --train data/intent/train.jsonl --validation data/intent/validation.jsonl --test data/intent/test.jsonl --output ml/artifacts/intent
```

For SageMaker, mount the same files under `/opt/ml/input/data/train`, `/opt/ml/input/data/validation`, and `/opt/ml/input/data/test`. The model artifact and `metrics.json` are written to `/opt/ml/model` by default.

Do not deploy this model until its untouched-test micro-F1 exceeds the checked-in heuristic evaluation and reviewed data has reached the target size.

## Offline BiGRU baseline

`train_gru.py` trains a word-embedding bidirectional GRU locally with no Hugging Face base-model download. It is a real deep-learning baseline and is useful when the Transformer download is unavailable:

```bash
python ml/intent/train_gru.py --train data/intent/reviewed/train.jsonl --validation data/intent/reviewed/validation.jsonl --test data/intent/reviewed/test.jsonl --output ml/artifacts/intent-gru
```

It is not a replacement for the multilingual Transformer in production; compare both against the heuristic on a human-reviewed held-out test set.

## Inference contract

The BiGRU artifact can be called locally or packaged as a SageMaker PyTorch inference entry point:

```bash
python ml/intent/inference_gru.py --model-dir ml/artifacts/intent-gru --query "Mujhe fractions par quiz chahiye"
```

The request/response contract is JSON:

```json
{"query":"Mujhe fractions par quiz chahiye"}
```

```json
{"labels":["assessment"],"scores":{"assessment":0.99},"provider":"local-gru"}
```

Keep the endpoint undeployed until the model passes a human-reviewed evaluation gate.

## Package for SageMaker (no endpoint)

Package the artifact locally before any AWS deployment:

```bash
python ml/intent/package_gru_model.py --model-dir ml/artifacts/intent-gru --output ml/artifacts/intent-gru-model.tar.gz
```

The archive contains `model.pt` plus the SageMaker inference entry point under `code/`. The least-privilege artifact policy template is `infra/cli/sagemaker-intent-model-policy.json`. Do not upload or deploy it as a production endpoint until the human-reviewed test gate is met.
