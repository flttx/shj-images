"""Verify the published GLB header, triangle budget, and actual embedded 4K images."""
import hashlib
import io
import json
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
asset = ROOT / 'public/models/fuzhu.glb'
binary = asset.read_bytes()
magic, version, total = struct.unpack_from('<III', binary)
assert (magic, version, total) == (0x46546C67, 2, len(binary))
json_length, json_type = struct.unpack_from('<II', binary, 12)
assert json_type == 0x4E4F534A
document = json.loads(binary[20:20 + json_length])
bin_offset = 20 + json_length + 8
textures = []
for image in document['images']:
    view = document['bufferViews'][image['bufferView']]
    offset = bin_offset + view.get('byteOffset', 0)
    raw = binary[offset:offset + view['byteLength']]
    with Image.open(io.BytesIO(raw)) as decoded:
        assert decoded.size == (4096, 4096), 'A texture lost its original 4K resolution'
        textures.append({'mime': image['mimeType'], 'size': list(decoded.size), 'bytes': len(raw)})
assert len(textures) == 3
triangles = sum(document['accessors'][primitive['indices']]['count'] // 3 for mesh in document['meshes'] for primitive in mesh['primitives'])
for mesh in document['meshes']:
    for primitive in mesh['primitives']:
        assert {'POSITION', 'NORMAL', 'TEXCOORD_0'} <= primitive['attributes'].keys()
assert 200000 <= triangles <= 350000
assert len(binary) < 15 * 1024 * 1024
assert {'EXT_meshopt_compression', 'EXT_texture_webp'} <= set(document['extensionsUsed'])
with Image.open(ROOT / 'public/previews/fuzhu.png') as preview:
    assert preview.size == (768, 768) and preview.mode == 'RGBA'
report = {
    'model': '/models/fuzhu.glb', 'preview': '/previews/fuzhu.png',
    'bytes': len(binary), 'triangles': triangles,
    'sha256': hashlib.sha256(binary).hexdigest(), 'textures': textures,
    'extensions': document['extensionsUsed'],
    'editable_blend': 'assets/anatomy/fuzhu/verified-final.blend',
    'anatomy_evidence': 'assets/anatomy/fuzhu/final-anatomy-validation.json',
}
(ROOT / 'assets/anatomy/fuzhu/published-validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
