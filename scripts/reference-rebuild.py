"""Generate reviewed image references into candidates; never publish before QA."""
import concurrent.futures
import json
import os
from pathlib import Path
import struct
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/rebuild"
RECORDS = OUT / "records"
RECORDS.mkdir(parents=True, exist_ok=True)
CLI = next((Path(os.environ["LOCALAPPDATA"]) / "npm-cache/_npx").glob("*/node_modules/tripo-cli/dist/cli.js"))
ALLOWED = {"shuhu", "bingfeng", "luwu", "yayu", "ranyiyu", "zhulong"}


def generate(slug):
    if slug not in ALLOWED:
        raise ValueError("Unknown asset: " + slug)
    reference = ROOT / "design/references" / (slug + "-colossal.png")
    if not reference.is_file():
        raise FileNotFoundError(reference)
    receipt = RECORDS / (slug + ".stdout.json")
    # Even an empty file means a call may have been submitted before interruption.
    if receipt.exists():
        raise RuntimeError("Existing attempt: recover its task instead of regenerating " + slug)
    args = ["node", str(CLI), "make", str(reference), "--model", "tripo-v3.1",
            "-p", "geometry_quality=detailed", "-p", "texture_quality=extreme",
            "-p", "texture=true", "-p", "pbr=true", "--seed", "42138",
            "--name", "shj-rebuild-" + slug, "-o", str(OUT), "--json", "--yes"]
    plan = subprocess.run(args + ["--dry-run"], cwd=ROOT, capture_output=True,
                          text=True, encoding="utf-8", check=True)
    (RECORDS / (slug + ".plan.json")).write_text(plan.stdout, encoding="utf-8")
    with receipt.open("x", encoding="utf-8") as stdout:
        with (RECORDS / (slug + ".stderr.log")).open("w", encoding="utf-8") as stderr:
            run = subprocess.run(args, cwd=ROOT, stdout=stdout, stderr=stderr)
    if run.returncode:
        raise RuntimeError(f"{slug}: CLI exit {run.returncode}; inspect saved record before recovery")
    data = json.loads(receipt.read_text(encoding="utf-8").strip().splitlines()[-1])
    model = Path(data["model_file"])
    if not model.is_absolute():
        model = ROOT / model
    with model.open("rb") as stream:
        magic, version, declared = struct.unpack("<III", stream.read(12))
    if magic != 0x46546C67 or version != 2 or declared != model.stat().st_size:
        raise RuntimeError("Incomplete GLB: " + str(model))
    print(json.dumps({"slug": slug, "task_id": data["task_id"],
                      "credits": data["credits_consumed"], "candidate": str(model),
                      "bytes": model.stat().st_size}), flush=True)


if __name__ == "__main__":
    if not sys.argv[1:]:
        raise SystemExit("Explicit reviewed slugs required; each job spends Tripo credits")
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in concurrent.futures.as_completed([pool.submit(generate, slug) for slug in sys.argv[1:]]):
            result.result()
