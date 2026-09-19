"""Small GRU Deep Knowledge Tracing baseline trained on pseudonymous attempt events."""
import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import roc_auc_score


def load_events(path):
    required = {"learner_id", "topic_id", "question_id", "is_correct", "occurred_at", "difficulty"}
    with open(path, encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows or set(rows[0]) != required:
        raise ValueError(f"CSV must contain exactly {sorted(required)}")
    grouped = defaultdict(list)
    for row in rows:
        if row["is_correct"] not in {"0", "1"}:
            raise ValueError("is_correct must be 0 or 1")
        grouped[row["learner_id"]].append(row)
    return [sorted(events, key=lambda row: row["occurred_at"]) for events in grouped.values() if len(events) >= 2]


class DKT(torch.nn.Module):
    def __init__(self, vocab_size):
        super().__init__()
        self.embedding = torch.nn.Embedding(vocab_size * 2, 32)
        self.gru = torch.nn.GRU(32, 64, batch_first=True)
        self.head = torch.nn.Linear(64, vocab_size)

    def forward(self, sequence):
        output, _ = self.gru(self.embedding(sequence))
        return self.head(output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--events", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--epochs", type=int, default=20)
    args = parser.parse_args()
    sequences = load_events(args.events)
    topics = sorted({row["topic_id"] for sequence in sequences for row in sequence})
    topic_index = {topic: index for index, topic in enumerate(topics)}
    model = DKT(len(topics))
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = torch.nn.BCEWithLogitsLoss()
    train, test = sequences[: max(1, int(len(sequences) * 0.8))], sequences[max(1, int(len(sequences) * 0.8)) :]
    if not test:
        raise ValueError("Need at least two learners for held-out evaluation")
    for _ in range(args.epochs):
        for sequence in train:
            tokens = torch.tensor([[topic_index[row["topic_id"]] * 2 + int(row["is_correct"]) for row in sequence[:-1]]])
            target_topics = torch.tensor([topic_index[row["topic_id"]] for row in sequence[1:]])
            target = torch.tensor([float(row["is_correct"]) for row in sequence[1:]])
            logits = model(tokens)[0, torch.arange(len(target_topics)), target_topics]
            optimizer.zero_grad(); loss_fn(logits, target).backward(); optimizer.step()
    scores, targets = [], []
    with torch.no_grad():
        for sequence in test:
            tokens = torch.tensor([[topic_index[row["topic_id"]] * 2 + int(row["is_correct"]) for row in sequence[:-1]]])
            target_topics = torch.tensor([topic_index[row["topic_id"]] for row in sequence[1:]])
            scores.extend(torch.sigmoid(model(tokens)[0, torch.arange(len(target_topics)), target_topics]).tolist())
            targets.extend(float(row["is_correct"]) for row in sequence[1:])
    output = Path(args.output); output.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "topics": topics}, output / "model.pt")
    metrics = {"held_out_learners": len(test), "auc": float(roc_auc_score(targets, scores)) if len(set(targets)) == 2 else None}
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
