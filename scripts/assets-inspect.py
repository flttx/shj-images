"""Validate GLB 2 files and summarize geometry, embedded images and animation."""
import io
import json
import pathlib
import struct
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]

def inspect(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", raw)
    assert magic == b"glTF" and version == 2 and length == len(raw), "Invalid GLB header"
    chunks, offset = {}, 12
    while offset < len(raw):
        size, kind = struct.unpack_from("<II", raw, offset)
        chunks[kind] = raw[offset+8:offset+8+size]
        offset += 8 + size
    doc = json.loads(chunks[0x4E4F534A])
    binary = chunks.get(0x004E4942,b"")
    triangles, vertices = 0, 0
    for mesh in doc.get("meshes",[]):
        for prim in mesh["primitives"]:
            pos = doc["accessors"][prim["attributes"]["POSITION"]]
            vertices += pos["count"]
            if prim.get("mode",4)==4:
                triangles += (doc["accessors"][prim["indices"]]["count"] if "indices" in prim else pos["count"])//3
    images=[]
    for item in doc.get("images",[]):
        if "bufferView" not in item: continue
        view=doc["bufferViews"][item["bufferView"]]
        data=binary[view.get("byteOffset",0):view.get("byteOffset",0)+view["byteLength"]]
        with Image.open(io.BytesIO(data)) as image:
            images.append({"size":image.size,"format":image.format,"bytes":len(data)})
    return {"file":str(path.relative_to(ROOT)),"bytes":len(raw),"triangles":triangles,"vertices":vertices,
            "materials":len(doc.get("materials",[])),"textures":images,"skins":len(doc.get("skins",[])),
            "animations":[a.get("name","unnamed") for a in doc.get("animations",[])]}

if __name__=="__main__":
    results=[inspect(p) for p in (ROOT/"public"/"models").glob("*.glb")]
    (ROOT/"assets"/"validation.json").write_text(json.dumps(results,indent=2),"utf-8")
    print(json.dumps(results,indent=2))
