"""Publish approved local anatomy corrections, preserving 4K PBR textures."""
import json
import os
import struct
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
for slug in sys.argv[1:]:
    if slug not in ['fuzhu','bifang']:raise ValueError('Unsupported asset')
    out=ROOT/'assets/anatomy'/slug
    def run(args):
        cached=Path(os.environ['LOCALAPPDATA'])/'npm-cache/_npx/a6797f7ff67bb1f2/node_modules/@gltf-transform/cli/bin/cli.js'
        result=subprocess.run(['node',str(cached),*args],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
        if result.returncode:raise RuntimeError(result.stderr)
        return result.stdout
    logs=[]
    if not (out/'geometry.glb').exists() or (out/'geometry.glb').stat().st_mtime<(out/'corrected.glb').stat().st_mtime:
        logs.append(run(['simplify',str(out/'corrected.glb'),str(out/'geometry.glb'),'--ratio','.15','--error','.00025','--lock-border','true']))
    logs.append(run(['webp',str(out/'geometry.glb'),str(out/'webp.glb'),'--quality','95','--effort','80']))
    logs.append(run(['meshopt',str(out/'webp.glb'),str(out/'web.glb'),'--level','high','--quantize-position','16','--quantize-normal','12','--quantize-texcoord','14']))
    binary=(out/'web.glb').read_bytes()
    magic,version,length=struct.unpack_from('<III',binary,0)
    if magic!=0x46546c67 or version!=2 or length!=len(binary):raise RuntimeError('Invalid GLB header')
    json_length=struct.unpack_from('<I',binary,12)[0]
    doc=json.loads(binary[20:20+json_length])
    triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
    report={'slug':slug,'bytes':len(binary),'triangles':triangles,'extensions':doc.get('extensionsUsed',[]),'materials':len(doc.get('materials',[])),'source':'corrected.glb','preview':'corrected-front.png'}
    if len(binary)>15*1024*1024:raise RuntimeError('Asset exceeds 15 MB')
    if triangles>350000:raise RuntimeError('Asset exceeds triangle budget: '+str(triangles))
    target=ROOT/'public/models'/f'{slug}.glb'
    if not (out/'before-web.glb').exists():(out/'before-web.glb').write_bytes(target.read_bytes())
    preview=ROOT/'public/previews'/f'{slug}.png'
    if not (out/'before-preview.png').exists():(out/'before-preview.png').write_bytes(preview.read_bytes())
    temporary=target.with_suffix('.glb.tmp');temporary.write_bytes(binary);os.replace(temporary,target)
    preview.write_bytes((out/'corrected-front.png').read_bytes())
    (out/'web-validation.json').write_text(json.dumps(report,indent=2))
    (out/'optimization.log').write_text('\n'.join(logs),encoding='utf-8')
    print(json.dumps(report),flush=True)
