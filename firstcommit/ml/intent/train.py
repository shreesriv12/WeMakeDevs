"""Fine-tune a multilingual, multi-label intent classifier for SageMaker or local use."""
import argparse
import json
import os
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import f1_score, precision_score, recall_score
from torch.nn import BCEWithLogitsLoss
from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments

LABELS = ["assessment", "personalization", "knowledge_retrieval", "language_support", "external_research"]


def read_jsonl(path: Path):
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not rows:
        raise ValueError(f"No examples in {path}")
    for row in rows:
        if not isinstance(row.get("query"), str) or not row["query"].strip() or not set(row.get("labels", [])).issubset(LABELS):
            raise ValueError(f"Invalid intent row in {path}: {row.get('id', '<unknown>')}")
    return rows


class IntentDataset(torch.utils.data.Dataset):
    def __init__(self, rows, tokenizer):
        self.encodings = tokenizer([row["query"] for row in rows], truncation=True, padding=True, max_length=128)
        self.labels = [[float(label in row["labels"]) for label in LABELS] for row in rows]

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, index):
        item = {key: torch.tensor(value[index]) for key, value in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[index], dtype=torch.float32)
        return item


class MultiLabelTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **_):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        loss = BCEWithLogitsLoss()(outputs.logits, labels)
        return (loss, outputs) if return_outputs else loss


def metrics(prediction):
    logits, labels = prediction
    binary = (1 / (1 + np.exp(-logits)) >= 0.5).astype(int)
    return {
        "micro_f1": float(f1_score(labels, binary, average="micro", zero_division=0)),
        "micro_precision": float(precision_score(labels, binary, average="micro", zero_division=0)),
        "micro_recall": float(recall_score(labels, binary, average="micro", zero_division=0)),
        "exact_match": float(np.mean(np.all(labels == binary, axis=1))),
    }


def existing_path(value, fallback):
    return Path(value) if value else Path(fallback)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train")
    parser.add_argument("--validation")
    parser.add_argument("--test")
    parser.add_argument("--output", default=os.environ.get("SM_MODEL_DIR", "/opt/ml/model"))
    parser.add_argument("--model", default="distilbert-base-multilingual-cased")
    parser.add_argument("--epochs", type=float, default=4)
    args = parser.parse_args()
    train_path = existing_path(args.train, "/opt/ml/input/data/train/train.jsonl")
    validation_path = existing_path(args.validation, "/opt/ml/input/data/validation/validation.jsonl")
    test_path = existing_path(args.test, "/opt/ml/input/data/test/test.jsonl")
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForSequenceClassification.from_pretrained(args.model, num_labels=len(LABELS), problem_type="multi_label_classification")
    training_args = TrainingArguments(output_dir=str(output / "checkpoints"), learning_rate=2e-5, per_device_train_batch_size=8, per_device_eval_batch_size=16, num_train_epochs=args.epochs, eval_strategy="epoch", save_strategy="no", logging_strategy="epoch", report_to=[])
    trainer = MultiLabelTrainer(model=model, args=training_args, train_dataset=IntentDataset(read_jsonl(train_path), tokenizer), eval_dataset=IntentDataset(read_jsonl(validation_path), tokenizer), compute_metrics=metrics)
    trainer.train()
    test_metrics = trainer.evaluate(IntentDataset(read_jsonl(test_path), tokenizer), metric_key_prefix="test")
    model.save_pretrained(output)
    tokenizer.save_pretrained(output)
    (output / "label_map.json").write_text(json.dumps({"labels": LABELS, "thresholds": {label: 0.5 for label in LABELS}}, indent=2), encoding="utf-8")
    (output / "metrics.json").write_text(json.dumps(test_metrics, indent=2), encoding="utf-8")
    print(json.dumps(test_metrics, indent=2))


if __name__ == "__main__":
    main()
