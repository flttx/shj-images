"""Pack the reviewed anatomy completion as a 4K browser asset."""
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/anatomy/xingtian"
steps = [
    ["webp", str(OUT / "xingtian-completed.glb"), str(OUT / "xingtian-webp.glb"),
     "--quality", "95", "--effort", "80"],
    ["join", str(OUT / "xingtian-webp.glb"), str(OUT / "xingtian-joined.glb")],
    ["meshopt", str(OUT / "xingtian-joined.glb"), str(OUT / "xingtian-web.glb"),
     "--level", "high", "--quantize-position", "16", "--quantize-normal", "12",
     "--quantize-texcoord", "14"],
]
logs = []
for step in steps:
    result = subprocess.run(["npx.cmd", "--yes", "@gltf-transform/cli", *step], cwd=ROOT,
        capture_output=True, text=True, encoding="utf-8", check=True)
    logs.append({"args":step,"stdout":result.stdout,"stderr":result.stderr})
    print(result.stdout,flush=True)
(OUT / "optimization.json").write_text(json.dumps(logs,indent=2),encoding="utf-8")
final = OUT / "xingtian-web.glb"
assert final.stat().st_size < 15_000_000
target = ROOT / "public/models/xingtian.glb"
temporary = target.with_suffix(".glb.tmp")
temporary.write_bytes(final.read_bytes())
os.replace(temporary,target)
(ROOT / "public/previews/xingtian.png").write_bytes((OUT / "completed-three-quarter.png").read_bytes())
print("PUBLISHED",target.stat().st_size,flush=True)
