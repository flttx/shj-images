"""Build web variants, preserving all source GLBs and 4K PBR texture dimensions."""
import json
import os
import pathlib
import subprocess
import sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
BENCHMARK="--benchmark" in sys.argv
WEB=ROOT/"assets"/("reference-benchmark/web-build" if BENCHMARK else "web-build")
WEB.mkdir(parents=True,exist_ok=True)

def run(args):
    result=subprocess.run(["npx.cmd","--yes","@gltf-transform/cli",*args],cwd=ROOT,capture_output=True,text=True,encoding="utf-8")
    if result.returncode: raise RuntimeError(result.stderr)
    return result.stdout

for slug in [value for value in sys.argv[1:] if value!="--benchmark"]:
    records=ROOT/"assets"/("reference-benchmark/records" if BENCHMARK else "records")
    data=json.loads((records/(slug+".stdout.json")).read_text("utf-8").strip().splitlines()[-1])
    source=pathlib.Path(data["model_file"])
    if not source.is_absolute(): source=ROOT/source
    animated=ROOT/"assets"/"animated"/(slug+".glb")
    if animated.exists(): source=animated
    simplified=WEB/(slug+"-geometry.glb")
    textured=WEB/(slug+"-webp.glb")
    final=WEB/(slug+".glb")
    logs=[]
    # Relative error limited to 0.025% of model radius; never force the target.
    logs.append(run(["simplify",str(source),str(simplified),"--ratio","0.15","--error","0.00025","--lock-border","true"]))
    logs.append(run(["webp",str(simplified),str(textured),"--quality","95","--effort","80"]))
    logs.append(run(["meshopt",str(textured),str(final),"--level","high","--quantize-position","16","--quantize-normal","12","--quantize-texcoord","14"]))
    target=(ROOT/"assets/reference-benchmark/candidates" if BENCHMARK else ROOT/"public/models")/(slug+".glb")
    target.parent.mkdir(parents=True,exist_ok=True)
    temporary=target.with_suffix(".glb.tmp")
    temporary.write_bytes(final.read_bytes())
    os.replace(temporary,target)
    (WEB/(slug+".log")).write_text("\n".join(logs),"utf-8")
    print(json.dumps({"slug":slug,"source_bytes":source.stat().st_size,"web_bytes":target.stat().st_size}),flush=True)
