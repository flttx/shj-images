import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const slugs = ['zhulong', 'yinglong', 'xiangliu', 'qiongqi', 'paoxiao', 'dijiang', 'kaiming', 'bashe', 'heluoyu', 'xingtian', 'xiwangmu', 'shuhu', 'luwu', 'bifang', 'gudiao', 'nine-tailed-fox', 'fuzhu', 'yayu', 'ranyiyu', 'bingfeng'];
const results = [];
let failed = false;
for (const slug of slugs) {
  try {
    const filename = path.join('public', 'models', `${slug}.glb`);
    const buffer = await readFile(filename);
    if (buffer.toString('ascii', 0, 4) !== 'glTF' || buffer.readUInt32LE(4) !== 2) throw new Error('不是有效的 glTF 2.0 文件');
    if (buffer.readUInt32LE(8) !== buffer.length) throw new Error('GLB 长度与文件不符');
    if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error('缺少 JSON 数据块');
    const document = JSON.parse(buffer.toString('utf8', 20, 20 + buffer.readUInt32LE(12)));
    if (!document.meshes?.length) throw new Error('模型没有网格');
    if (document.images?.some((item) => item.uri && /^https?:/.test(item.uri))) throw new Error('纹理仍依赖远程地址');
    let triangles = 0;
    for (const mesh of document.meshes) for (const primitive of mesh.primitives) {
      if (primitive.mode !== undefined && primitive.mode !== 4) continue;
      const accessor = document.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
      triangles += (accessor?.count ?? 0) / 3;
    }
    const preview = await stat(path.join('public', 'previews', `${slug}.png`));
    if (preview.size < 100) throw new Error('预览图缺失或不完整');
    results.push({ beast: slug, mb: Number((buffer.length / 1024 / 1024).toFixed(2)), triangles: Math.round(triangles), materials: document.materials?.length ?? 0, textures: document.images?.length ?? 0, animations: document.animations?.map((clip) => clip.name) ?? [], valid: true });
  } catch (error) {
    failed = true;
    results.push({ beast: slug, valid: false, reason: error instanceof Error ? error.message : '资产无法读取' });
  }
}
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
if (failed) process.exitCode = 1;
