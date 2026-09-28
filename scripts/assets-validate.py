"""Run the official glTF validator via glTF Transform on explicit web assets."""
import concurrent.futures
import json
import pathlib
import subprocess
import sys

ROOT=pathlib.Path(__file__).resolve().parents[1]
def validate(slug):
    result=subprocess.run(["npx.cmd","--yes","@gltf-transform/cli","validate",str(ROOT/"public/models"/(slug+".glb")),"--limit","10","--format","csv"],capture_output=True,text=True,encoding="utf-8",cwd=ROOT)
    (ROOT/"assets/records"/(slug+".validation.csv")).write_text(result.stdout+result.stderr,"utf-8")
    return {"slug":slug,"exit":result.returncode}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(validate,sys.argv[1:]):
        print(json.dumps(result),flush=True)
