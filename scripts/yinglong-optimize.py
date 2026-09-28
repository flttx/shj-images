"""Build the animated web GLB without changing the 4K texture dimensions."""
import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/animated"
steps = [
    ["simplify", str(OUT / "yinglong.glb"), str(OUT / "yinglong-geometry.glb"),
     "--ratio", "0.15", "--error", "0.00025", "--lock-border", "true"],
    ["webp", str(OUT / "yinglong-geometry.glb"), str(OUT / "yinglong-webp.glb"),
     "--quality", "95", "--effort", "80"],
    ["meshopt", str(OUT / "yinglong-webp.glb"), str(OUT / "yinglong-web.glb"),
     "--level", "high", "--quantize-position", "16", "--quantize-normal", "12",
     "--quantize-texcoord", "14"],
]
logs = []
for step in steps:
    result = subprocess.run(["npx.cmd", "--yes", "@gltf-transform/cli", *step], cwd=ROOT,
                            capture_output=True, text=True, encoding="utf-8", check=True)
    logs.append({"args": step, "stdout": result.stdout, "stderr": result.stderr})
    print(result.stdout, flush=True)
(OUT / "optimization.json").write_text(json.dumps(logs, indent=2), encoding="utf-8")
target = ROOT / "public/models/yinglong.glb"
temporary = target.with_suffix(".glb.tmp")
temporary.write_bytes((OUT / "yinglong-web.glb").read_bytes())
os.replace(temporary, target)
print("PUBLISHED", target, target.stat().st_size, flush=True)
