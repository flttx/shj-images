import { readFile, writeFile, mkdir } from 'node:fs/promises';

try {
  const manifest = JSON.parse(await readFile('assets-manifest.json', 'utf8'));
  const status = Object.fromEntries(Object.entries(manifest).map(([id, item]) => [id, {
    anatomy: typeof item.anatomy === 'string' ? item.anatomy : 'unverified',
    review: typeof item.review === 'string' ? item.review : '',
    animations: Array.isArray(item.animations) ? item.animations.filter((clip) => typeof clip === 'string') : [],
  }]));
  await mkdir('src/generated', { recursive: true });
  await writeFile('src/generated/asset-status.json', `${JSON.stringify(status, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`无法同步模型校对状态：${error instanceof Error ? error.message : '未知文件错误'}\n`);
  process.exitCode = 1;
}
