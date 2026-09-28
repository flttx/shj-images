import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  await page.route('**/yinglong-review', (route) => route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0"></body></html>' }));
  await page.goto(`${process.env.ASSET_REVIEW_URL || 'http://127.0.0.1:5174'}/yinglong-review`);
  const report = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { MeshoptDecoder } = await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('/models/yinglong.glb');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#121b23');
    scene.add(gltf.scene);
    scene.add(new THREE.HemisphereLight(0xc9e0ff, 0x6d5740, 2.6));
    const key = new THREE.DirectionalLight(0xffe5c3, 4);
    key.position.set(2, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa8cfff, 3);
    rim.position.set(-3, 2, -3);
    scene.add(rim);
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z);
    const camera = new THREE.OrthographicCamera(-span * .7, span * .7, span * .7, -span * .7, .001, span * 100);
    camera.position.copy(center).add(new THREE.Vector3(1.7, 1.0, 3).multiplyScalar(span));
    camera.lookAt(center);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(900, 900);
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    document.body.appendChild(renderer.domElement);
    const mixer = new THREE.AnimationMixer(gltf.scene);
    for (const clip of gltf.animations) mixer.clipAction(clip).play();
    const skins = [];
    gltf.scene.traverse((object) => { if (object.isSkinnedMesh) skins.push(object); });
    const tracks = gltf.animations.flatMap((clip) => clip.tracks.map((track) => {
      const width = track.getValueSize();
      let change = 0;
      let closure = 0;
      for (let i = 0; i < track.values.length; i++) change = Math.max(change, Math.abs(track.values[i] - track.values[i % width]));
      for (let i = 0; i < width; i++) closure = Math.max(closure, Math.abs(track.values[i] - track.values[track.values.length - width + i]));
      return { name: track.name, keys: track.times.length, start: track.times[0], change, closure };
    }));
    let badWeights = 0;
    let vertices = 0;
    for (const mesh of skins) {
      const weights = mesh.geometry.getAttribute('skinWeight');
      const joints = mesh.geometry.getAttribute('skinIndex');
      if (!weights || !joints) throw new Error('Missing skin attributes');
      vertices += weights.count;
      for (let i = 0; i < weights.count; i++) {
        const sum = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i);
        if (!Number.isFinite(sum) || Math.abs(sum - 1) > .002) badWeights++;
      }
    }
    const samples = () => skins.flatMap((mesh) => {
      mesh.skeleton.update();
      const positions = mesh.geometry.getAttribute('position');
      const points = [];
      for (let i = 0; i < positions.count; i += 83) {
        const point = new THREE.Vector3().fromBufferAttribute(positions, i);
        mesh.applyBoneTransform(i, point).applyMatrix4(mesh.matrixWorld);
        points.push(point.toArray());
      }
      return points;
    });
    const render = (time) => {
      mixer.setTime(time);
      scene.updateMatrixWorld(true);
      renderer.render(scene, camera);
      return samples();
    };
    const start = render(0);
    let maxMovement = 0;
    for (const time of [2, 4, 6]) {
      const points = render(time);
      points.forEach((point, i) => {
        const delta = Math.hypot(...point.map((value, axis) => value - start[i][axis]));
        if (!Number.isFinite(delta)) throw new Error('Non-finite skinned vertex');
        maxMovement = Math.max(maxMovement, delta);
      });
    }
    window.renderYinglong = render;
    window.sideYinglong = () => {
      camera.position.copy(center).add(new THREE.Vector3(3, 1, -1.7).multiplyScalar(span));
      camera.lookAt(center);
    };
    return { animations: gltf.animations.map((clip) => ({ name: clip.name, duration: clip.duration })),
      skinCount: skins.length, boneCount: skins[0]?.skeleton.bones.length, vertices, badWeights,
      sampledVertexMovement: maxMovement, modelSpan: span, tracks };
  });
  if (!report.tracks.some((track) => track.change > .001)) throw new Error('Animation is static');
  if (report.tracks.some((track) => track.closure > .0001)) throw new Error('Animation loop does not close');
  if (report.tracks.some((track) => track.start !== 0)) throw new Error('Animation does not start at zero');
  if (report.badWeights || report.skinCount !== 1 || report.sampledVertexMovement <= .001) throw new Error('Invalid skin');
  for (const time of [0, 2, 4, 6, 8]) {
    await page.evaluate((t) => window.renderYinglong(t), time);
    await page.screenshot({ path: `assets/animated/yinglong-frame-${time}.png` });
  }
  await page.evaluate(() => window.sideYinglong());
  for (const time of [0, 2, 6]) {
    await page.evaluate((t) => window.renderYinglong(t), time);
    await page.screenshot({ path: `assets/animated/yinglong-side-${time}.png` });
  }
  await writeFile('assets/animated/validation.json', `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ...report, tracks: report.tracks.filter((track) => track.change > 0) }, null, 2)}\n`);
} finally {
  await browser.close();
}
