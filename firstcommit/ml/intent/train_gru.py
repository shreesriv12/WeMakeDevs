"""Train a local word-embedding BiGRU multi-label intent classifier without downloading a base model."""
import argparse
import json
import re
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import f1_score, precision_score, recall_score
from torch.nn.utils.rnn import pack_padded_sequence
from torch.utils.data import DataLoader, Dataset

LABELS = ["assessment", "personalization", "knowledge_retrieval", "language_support", "external_research"]
TOKEN = re.compile(r"[\w']+", re.UNICODE)


def read_jsonl(path):
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def tokens(query):
    return TOKEN.findall(query.lower())


def make_vocab(rows):
    counts = Counter(token for row in rows for token in tokens(row["query"]))
    return {"<pad>": 0, "<unk>": 1, **{token: index + 2 for index, (token, _) in enumerate(sorted(counts.items()))}}


class IntentDataset(Dataset):
    def __init__(self, rows, vocab):
        self.rows = rows
        self.vocab = vocab

    def __len__(self): return len(self.rows)

    def __getitem__(self, index):
        row = self.rows[index]
        sequence = [self.vocab.get(token, 1) for token in tokens(row["query"])] or [1]
        labels = [float(label in row["labels"]) for label in LABELS]
        return torch.tensor(sequence), torch.tensor(labels)


def collate(batch):
    sequences, labels = zip(*batch)
    lengths = torch.tensor([len(sequence) for sequence in sequences])
    padded = torch.nn.utils.rnn.pad_sequence(sequences, batch_first=True)
    return padded, lengths, torch.stack(labels)


class BiGRUIntent(torch.nn.Module):
    def __init__(self, vocab_size):
        super().__init__()
        self.embedding = torch.nn.Embedding(vocab_size, 96, padding_idx=0)
        self.gru = torch.nn.GRU(96, 96, batch_first=True, bidirectional=True)
        self.classifier = torch.nn.Sequential(torch.nn.Dropout(0.2), torch.nn.Linear(192, len(LABELS)))

    def forward(self, sequences, lengths):
        packed = pack_padded_sequence(self.embedding(sequences), lengths.cpu(), batch_first=True, enforce_sorted=False)
        _, hidden = self.gru(packed)
        return self.classifier(torch.cat((hidden[-2], hidden[-1]), dim=1))


def evaluate(model, dataset):
    model.eval(); scores, targets = [], []
    with torch.no_grad():
        for sequences, lengths, labels in DataLoader(dataset, batch_size=64, collate_fn=collate):
            scores.append(torch.sigmoid(model(sequences, lengths)).numpy()); targets.append(labels.numpy())
    predicted = (np.vstack(scores) >= 0.5).astype(int); actual = np.vstack(targets).astype(int)
    return {"micro_f1": float(f1_score(actual, predicted, average="micro", zero_division=0)), "micro_precision": float(precision_score(actual, predicted, average="micro", zero_division=0)), "micro_recall": float(recall_score(actual, predicted, average="micro", zero_division=0)), "exact_match": float(np.mean(np.all(actual == predicted, axis=1)))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", required=True); parser.add_argument("--validation", required=True); parser.add_argument("--test", required=True); parser.add_argument("--output", required=True); parser.add_argument("--epochs", type=int, default=20)
    args = parser.parse_args()
    torch.manual_seed(42)
    train_rows = read_jsonl(args.train); vocab = make_vocab(train_rows)
    train, validation, test = IntentDataset(train_rows, vocab), IntentDataset(read_jsonl(args.validation), vocab), IntentDataset(read_jsonl(args.test), vocab)
    model = BiGRUIntent(len(vocab)); optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3); loss_fn = torch.nn.BCEWithLogitsLoss()
    for epoch in range(args.epochs):
        model.train(); total_loss = 0.0
        for sequences, lengths, labels in DataLoader(train, batch_size=32, shuffle=True, collate_fn=collate):
            optimizer.zero_grad(); loss = loss_fn(model(sequences, lengths), labels); loss.backward(); optimizer.step(); total_loss += loss.item()
        print(json.dumps({"epoch": epoch + 1, "loss": total_loss / max(1, len(train)), "validation": evaluate(model, validation)}))
    output = Path(args.output); output.mkdir(parents=True, exist_ok=True)
    metrics = evaluate(model, test)
    torch.save({"state_dict": model.state_dict(), "vocab": vocab, "labels": LABELS}, output / "model.pt")
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps({"test": metrics, "vocab_size": len(vocab)}, indent=2))


if __name__ == "__main__":
    main()
