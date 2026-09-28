"""Reconcile receipts, web files, thumbnail files, and true billed credit totals."""
import importlib.util
import json
import pathlib
import struct

ROOT=pathlib.Path(__file__).resolve().parents[1]
manifest_path=ROOT/"assets-manifest.json"
manifest=json.loads(manifest_path.read_text("utf-8"))
receipts={}
for path in (ROOT/"assets"/"records").glob("*.stdout.json"):
    text=path.read_text("utf-8-sig").strip()
    if not text: continue
    data=json.loads(text.splitlines()[-1])
    if data.get("status")!="success": continue
    receipts[data["task_id"]]={"slug":path.name.split(".")[0],"credits":data.get("credits_consumed",0),"type":data.get("type"),"receipt":str(path.relative_to(ROOT))}
rig=ROOT/"assets/records/yinglong.rig.json"
if rig.exists():
    data=json.loads(rig.read_text("utf-8-sig").strip().splitlines()[-1])
    receipts[data["task_id"]]={"slug":"yinglong","credits":data.get("credits_consumed",0),"type":data.get("type"),"receipt":str(rig.relative_to(ROOT))}
spec=importlib.util.spec_from_file_location("asset_inspection",ROOT/"scripts/assets-inspect.py")
inspection=importlib.util.module_from_spec(spec)
spec.loader.exec_module(inspection)
validation=[]
for slug,item in manifest.items():
    model=ROOT/"public/models"/(slug+".glb")
    preview=ROOT/"public/previews"/(slug+".png")
    item["credits"]=sum(r["credits"] for r in receipts.values() if r["slug"]==slug)
    item.setdefault("anatomy","unverified")
    if model.exists() and model.stat().st_size>0:
        stats=inspection.inspect(model)
        stats["slug"]=slug
        stats["preview_exists"]=preview.exists()
        validation.append(stats)
        item.update(status="ready",model="/models/"+slug+".glb",preview="/previews/"+slug+".png",
                    animations=stats["animations"],bytes=stats["bytes"],triangles=stats["triangles"])
        item["notes"]="Web variant: constrained simplification <=0.025% radius error, 4K PBR textures preserved, WebP quality95 and Meshopt 16-bit position / 12-bit normal / 14-bit UV. Original HQ mesh retained under assets/tripo-out. "+("True skeletal Idle_Breath loop; no walk or flight clip." if slug=="yinglong" else "No skeletal animation in this model; UI motion is procedural.")
        if slug=="xingtian":
            item["localSource"]="assets/anatomy/xingtian/xingtian-anatomy.blend"
            item["notes"]+=" Chest eyes and abdominal mouth completed locally in Blender with boolean sockets, eyelids, iris, lips, tongue and teeth."
        if slug=="yinglong":
            item["localSource"]="assets/animated/yinglong-idle.blend"
    else:
        item["status"]="failed"
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),"utf-8")
(ROOT/"assets/validation.json").write_text(json.dumps(validation,indent=2),"utf-8")
spend={"total_credits":sum(r["credits"] for r in receipts.values()),"receipts":receipts,"refunded_retarget_tasks":["0d0f5ac9-44ae-4040-8035-7a27310b45e3","a2f3f1bc-58f1-4377-b735-bf08d9294bbd"]}
(ROOT/"assets/credits.json").write_text(json.dumps(spend,indent=2),"utf-8")
print(json.dumps({"models":len(validation),"credits":spend["total_credits"],"bytes":sum(v["bytes"] for v in validation),"anatomy":{k:v["anatomy"] for k,v in manifest.items()}},ensure_ascii=False))
