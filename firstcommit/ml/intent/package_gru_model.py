"""Package the locally trained BiGRU and SageMaker serving code as model.tar.gz."""
import argparse
import shutil
import tarfile
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True, help="Directory containing model.pt")
    parser.add_argument("--output", required=True, help="Output .tar.gz path")
    args = parser.parse_args()
    source = Path(args.model_dir); output = Path(args.output)
    if not (source / "model.pt").is_file():
        raise FileNotFoundError(f"Missing model.pt in {source}")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        shutil.copy2(source / "model.pt", root / "model.pt")
        code = root / "code"; code.mkdir()
        project = Path(__file__).parent
        shutil.copy2(project / "inference_gru.py", code / "inference.py")
        shutil.copy2(project / "train_gru.py", code / "train_gru.py")
        with tarfile.open(output, "w:gz") as archive:
            archive.add(root / "model.pt", arcname="model.pt")
            archive.add(code / "inference.py", arcname="code/inference.py")
            archive.add(code / "train_gru.py", arcname="code/train_gru.py")
    print(f"Created {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
