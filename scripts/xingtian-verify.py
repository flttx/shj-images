"""Validate and render the published GLB through the real Three.js loader."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
javascript = r'''
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({channel:'chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:900,height:900}});
  const binary = await readFile('public/models/xingtian.glb');
  await page.route('**/models/xingtian.glb',r=>r.fulfill({contentType:'model/gltf-binary',body:binary}));
  await page.route('**/xingtian-review',r=>r.fulfill({contentType:'text/html',body:'<html><body style="margin:0"></body></html>'}));
  await page.goto('http://127.0.0.1:5174/xingtian-review');
  const result = await page.evaluate(async()=>{
    const THREE = await import('/node_modules/three/build/three.module.js');
    const {GLTFLoader} = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const {MeshoptDecoder} = await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/models/xingtian.glb');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#182027');
    scene.add(gltf.scene);
    scene.add(new THREE.HemisphereLight(0xffeddd,0x75685e,2));
    for(const [position,color,intensity] of [[[3,4,2],0xffe6cb,3],[[3,1,-3],0xc9dcff,1.5],[[-2,3,1],0xc9dcff,2]]) {
      const light=new THREE.DirectionalLight(color,intensity);
      light.position.set(...position);scene.add(light);
    }
    const camera=new THREE.OrthographicCamera(-.55,.55,.55,-.55,.001,100);
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(900,900);renderer.toneMapping=THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);
    window.renderReview=(view)=>{
      const target=view==='close'?new THREE.Vector3(0,.255,-.05):new THREE.Vector3();
      const span=view==='close'?.42:1.10;
      camera.left=-span/2;camera.right=span/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
      const offset=view==='quarter'?new THREE.Vector3(3,.5,1.7):new THREE.Vector3(3,.25,0);
      if(view==='close')offset.set(3,.1,0);
      camera.position.copy(target).add(offset);camera.lookAt(target);
      renderer.render(scene,camera);
    };
    let triangles=0,vertices=0,meshes=0,colorVertices=0,nonFinite=0;
    const textures=new Map();
    gltf.scene.traverse(object=>{
      if(!object.isMesh)return;
      meshes++;
      const position=object.geometry.attributes.position;
      vertices+=position.count;
      triangles+=(object.geometry.index?.count??position.count)/3;
      colorVertices+=object.geometry.attributes.color?.count??0;
      for(const value of position.array)if(!Number.isFinite(value))nonFinite++;
      for(const mat of Array.isArray(object.material)?object.material:[object.material]) {
        for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(mat[key]) {
          const texture=mat[key];textures.set(texture.uuid,{width:texture.image.width,height:texture.image.height});
        }
      }
    });
    return {triangles,vertices,meshes,colorVertices,nonFinite,textures:[...textures.values()]};
  });
  if(result.nonFinite||result.colorVertices===0||result.triangles<290000)throw new Error('Invalid geometry');
  if(result.textures.some(t=>t.width!==4096||t.height!==4096))throw new Error('Texture quality regression');
  for(const view of ['front','quarter','close']) {
    await page.evaluate(v=>window.renderReview(v),view);
    await page.screenshot({path:`assets/anatomy/xingtian/web-${view}.png`});
  }
  await writeFile('assets/anatomy/xingtian/validation.json',JSON.stringify(result,null,2));
  process.stdout.write(JSON.stringify(result,null,2));
} finally {await browser.close();}
'''
result = subprocess.run(["node", "--input-type=module", "-e", javascript], cwd=ROOT,
                        capture_output=True,text=True,encoding="utf-8")
if result.returncode:
    raise RuntimeError(result.stderr)
print(result.stdout)
