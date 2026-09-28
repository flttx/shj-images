"""Paid two-source Yinglong comparison; candidates never replace public assets."""
import concurrent.futures
import json
import pathlib
import subprocess

ROOT=pathlib.Path(__file__).resolve().parents[1]
BENCH=ROOT/"assets/reference-benchmark"
RECORDS=BENCH/"records"
RECORDS.mkdir(parents=True,exist_ok=True)
JOBS={"yinglong-a-gpt":ROOT/"design/references/yinglong-gpt-complete.png",
      "yinglong-b-tripo":BENCH/"tripo-out/yinglong-banana-complete-5fa3a20f/generated_image.png"}

def generate(name,reference):
    receipt=RECORDS/(name+".stdout.json")
    if receipt.exists():
        raise RuntimeError("Existing run record found (possibly still in progress); refusing duplicate paid generation: "+name)
    args=["npx.cmd","tripo-cli@latest","make",str(reference),"--model","tripo-v3.1",
          "-p","geometry_quality=detailed","-p","texture_quality=extreme","-p","texture=true","-p","pbr=true",
          "--seed","42137","--name",name,"-o","./assets/reference-benchmark","--json","--yes"]
    dry=subprocess.run(args+["--dry-run"],cwd=ROOT,capture_output=True,text=True,encoding="utf-8")
    (RECORDS/(name+".plan.json")).write_text(dry.stdout,"utf-8")
    if dry.returncode: raise RuntimeError(dry.stderr)
    print(json.dumps({"name":name,"status":"submitting","seed":42137}),flush=True)
    with receipt.open("w",encoding="utf-8") as stdout, (RECORDS/(name+".stderr.log")).open("w",encoding="utf-8") as stderr:
        result=subprocess.run(args,cwd=ROOT,stdout=stdout,stderr=stderr)
    if result.returncode: return {"name":name,"status":"failed","exit":result.returncode}
    data=json.loads(receipt.read_text("utf-8").strip().splitlines()[-1])
    model=pathlib.Path(data["model_file"])
    if not model.is_absolute():model=ROOT/model
    return {"name":name,"status":data["status"],"task_id":data["task_id"],"credits":data["credits_consumed"],"bytes":model.stat().st_size}

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for future in concurrent.futures.as_completed([pool.submit(generate,n,p) for n,p in JOBS.items()]):
        print(json.dumps(future.result()),flush=True)
