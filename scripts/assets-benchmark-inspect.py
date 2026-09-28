"""Read-only verification of the two already-paid Yinglong source GLBs."""
import array
import hashlib
import importlib.util
import json
import pathlib
import struct
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[1]
BENCH=ROOT/"assets/reference-benchmark"
SOURCES={"A":BENCH/"tripo-out/yinglong-a-gpt-33849391/model.glb", "B":BENCH/"recovered-b/model.glb"}
spec=importlib.util.spec_from_file_location("asset_inspection",ROOT/"scripts/assets-inspect.py")
helper=importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
results={}
for key,path in SOURCES.items():
    raw=path.read_bytes()
    stats=helper.inspect(path)
    size=struct.unpack_from("<I",raw,12)[0]
    doc=json.loads(raw[20:20+size])
    bin_size,bin_type=struct.unpack_from("<II",raw,20+size)
    binary=raw[28+size:28+size+bin_size]
    assert bin_type==0x004E4942
    for view in doc.get("bufferViews",[]):
        assert view.get("byteOffset",0)+view["byteLength"]<=len(binary),"bufferView exceeds BIN"
    dimensions={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4,"MAT4":16}
    components={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
    for acc in doc.get("accessors",[]):
        view=doc["bufferViews"][acc["bufferView"]]
        element=dimensions[acc["type"]]*components[acc["componentType"]]
        end=acc.get("byteOffset",0)+(acc["count"]-1)*view.get("byteStride",element)+element
        assert end<=view["byteLength"],"accessor exceeds bufferView"
    max_indices=[]
    for mesh in doc["meshes"]:
        for prim in mesh["primitives"]:
            pos=doc["accessors"][prim["attributes"]["POSITION"]]
            acc=doc["accessors"][prim["indices"]]
            view=doc["bufferViews"][acc["bufferView"]]
            start=view.get("byteOffset",0)+acc.get("byteOffset",0)
            indices=array.array({5121:"B",5123:"H",5125:"I"}[acc["componentType"]])
            indices.frombytes(binary[start:start+acc["count"]*components[acc["componentType"]]])
            maximum=max(indices)
            assert maximum<pos["count"],"index references missing vertex"
            max_indices.append(maximum)
    stats.update(sha256=hashlib.sha256(raw).hexdigest(),declaredLength=len(raw),
                 allBufferViewsInRange=True,allAccessorsInRange=True,allIndicesInRange=True,
                 maxIndices=max_indices,externalResources=[i.get("uri") for i in doc.get("images",[]) if "uri" in i],
                 sourcePositionBounds=[{"min":a.get("min"),"max":a.get("max")} for a in doc["accessors"] if a["type"]=="VEC3" and "min" in a])
    results[key]=stats
out=BENCH/"review-2026-09-28"
out.mkdir(parents=True,exist_ok=True)
(out/"integrity.json").write_text(json.dumps(results,indent=2),"utf-8")
print(json.dumps(results,indent=2))
