"""Local and SageMaker-compatible inference handler for the trained BiGRU intent model."""
import argparse
import json
from pathlib import Path

import torch

from train_gru import BiGRUIntent, tokens


def model_fn(model_dir):
    artifact = torch.load(Path(model_dir) / "model.pt", map_location="cpu", weights_only=False)
    model = BiGRUIntent(len(artifact["vocab"]))
    model.load_state_dict(artifact["state_dict"])
    model.eval()
    return {"model": model, "vocab": artifact["vocab"], "labels": artifact["labels"]}


def predict(model_state, query):
    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")
    sequence = [model_state["vocab"].get(token, 1) for token in tokens(query)] or [1]
    with torch.no_grad():
        logits = model_state["model"](torch.tensor([sequence]), torch.tensor([len(sequence)]))[0]
        scores = torch.sigmoid(logits).tolist()
    labels = [label for label, score in zip(model_state["labels"], scores) if score >= 0.5]
    return {"labels": labels, "scores": {label: round(score, 6) for label, score in zip(model_state["labels"], scores)}, "provider": "local-gru"}


# SageMaker PyTorch serving hooks. The endpoint input is {"query": "..."}.
def input_fn(request_body, content_type="application/json"):
    if content_type != "application/json":
        raise ValueError("Only application/json is supported")
    return json.loads(request_body)


def predict_fn(data, model_state):
    return predict(model_state, data.get("query"))


def output_fn(prediction, accept="application/json"):
    if accept != "application/json":
        raise ValueError("Only application/json is supported")
    return json.dumps(prediction), accept


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--query", required=True)
    args = parser.parse_args()
    print(json.dumps(predict(model_fn(args.model_dir), args.query), indent=2))


if __name__ == "__main__":
    main()
