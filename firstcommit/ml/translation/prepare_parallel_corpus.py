"""Prepare an English-Hindi parallel corpus for supervised translation training.

Uses only the Python standard library so it can run inside .venv-ml without
downloading additional packages. Input is expected to be UTF-8 CSV with
English,Hindi headers, such as Kaggle's preetviradiya/english-hindi-dataset.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path


def normalized(value: str) -> str:
    value = value.replace("\ufeff", "")
    # Some CSV exports decode UTF-8 Hindi bytes as Latin-1, producing strings
    # beginning with "à¤" / "à¥". Repair only that recognizable corruption.
    if "à¤" in value or "à¥" in value:
        try:
            value = value.encode("latin-1").decode("utf-8")
        except UnicodeError:
            pass
    return " ".join(value.split())


def split_for(english: str, hindi: str) -> str:
    digest = int(hashlib.sha256(f"{english}\0{hindi}".encode("utf-8")).hexdigest()[:8], 16) % 100
    return "test" if digest < 5 else "validation" if digest < 10 else "train"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("data/translation/en-hi"))
    parser.add_argument("--max-rows", type=int, default=0, help="0 keeps all valid pairs")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    files = {name: (args.output / f"{name}.jsonl").open("w", encoding="utf-8") for name in ("train", "validation", "test")}
    counts = {"read": 0, "kept": 0, "duplicate": 0, "invalid": 0, "train": 0, "validation": 0, "test": 0}
    seen: set[tuple[str, str]] = set()
    try:
        with args.input.open("r", encoding="utf-8-sig", newline="") as source:
            reader = csv.DictReader(source)
            if not reader.fieldnames or not {"English", "Hindi"}.issubset(reader.fieldnames):
                raise ValueError("Expected CSV headers named English and Hindi")
            for row in reader:
                counts["read"] += 1
                english, hindi = normalized(row.get("English", "")), normalized(row.get("Hindi", ""))
                # Keep sentence-like instructional data while avoiding blank, huge, or non-parallel rows.
                if not english or not hindi or len(english) > 800 or len(hindi) > 1200:
                    counts["invalid"] += 1
                    continue
                pair = (english.casefold(), hindi)
                if pair in seen:
                    counts["duplicate"] += 1
                    continue
                seen.add(pair)
                partition = split_for(english, hindi)
                files[partition].write(json.dumps({"source": english, "target": hindi, "sourceLanguage": "en", "targetLanguage": "hi"}, ensure_ascii=False) + "\n")
                counts["kept"] += 1
                counts[partition] += 1
                if args.max_rows and counts["kept"] >= args.max_rows:
                    break
    finally:
        for file in files.values():
            file.close()
    (args.output / "manifest.json").write_text(json.dumps({"source": str(args.input), "format": "english-hindi-parallel-jsonl", "splitting": "deterministic-sha256-90-5-5", "counts": counts}, indent=2), encoding="utf-8")
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
