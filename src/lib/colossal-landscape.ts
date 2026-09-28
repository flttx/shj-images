import * as THREE from "three";

interface ColossalLandscape {
  group: THREE.Group;
  update: (seconds: number) => void;
}

interface Bird {
  group: THREE.Group;
  left: THREE.Mesh;
  right: THREE.Mesh;
  origin: THREE.Vector3;
  phase: number;
}

const TERRAIN_COLUMNS = 96;
const TERRAIN_ROWS = 72;

const smooth = (a: number, b: number, value: number) =>
  THREE.MathUtils.smoothstep(value, a, b);

function hash(x: number, z: number): number {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function noise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(0, 1, x - ix);
  const fz = smooth(0, 1, z - iz);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), fx),
    THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), fx),
    fz,
  );
}

function terrainHeight(x: number, z: number): number {
  const broad = noise(x * 0.42 + 13, z * 0.42 - 8);
  const detail = noise(x * 1.9, z * 1.9) * 0.075;
  const centralClearing = smooth(2.3, 4.9, Math.hypot(x, z));
  const brokenRidge = Math.exp(-((z + 6.3 + Math.sin(x * 0.64)) ** 2) / 2.2);
  const crags = smooth(0.29, 0.61, noise(x * 0.82 + 9, z * 0.25));
  const distant = smooth(3, 12, -z) * (0.25 + broad * 0.55) +
    brokenRidge * (0.38 + crags * 0.69 + noise(x * 3, z * 3) * 0.11);
  const shoulders =
    Math.exp(-((Math.abs(x) - 5.4) ** 2) / 3.8) *
    (0.17 + broad * 0.48) *
    smooth(-4, 3, -z);
  const foreground = smooth(1.4, 7.5, z) * (0.12 + broad * 0.36);
  // A continuous irregular ground surface; the feet stay on the y=0 clearing.
  return (
    (broad * 0.12 + detail + distant + shoulders - foreground) *
      centralClearing -
    0.008
  );
}

// Landmarks must sit on the actual triangulated ground, not between its samples.
function groundHeight(x: number, z: number): number {
  const column = ((x + 15) / 30) * TERRAIN_COLUMNS;
  const row = ((z + 16) / 28) * TERRAIN_ROWS;
  const ix = Math.floor(column);
  const iz = Math.floor(row);
  const fx = column - ix;
  const fz = row - iz;
  const sample = (dx: number, dz: number) =>
    terrainHeight(-15 + ((ix + dx) / TERRAIN_COLUMNS) * 30, -16 + ((iz + dz) / TERRAIN_ROWS) * 28);
  const a = sample(0, 0);
  const b = sample(1, 0);
  const c = sample(0, 1);
  const d = sample(1, 1);
  return fx + fz <= 1
    ? a + (b - a) * fx + (c - a) * fz
    : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}

function terrainGeometry(): THREE.BufferGeometry {
  const columns = TERRAIN_COLUMNS;
  const rows = TERRAIN_ROWS;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const color = new THREE.Color();
  const dark = new THREE.Color("#081718");
  const light = new THREE.Color("#243532");
  for (let row = 0; row <= rows; row++) {
    const z = -16 + (row / rows) * 28;
    for (let column = 0; column <= columns; column++) {
      const x = -15 + (column / columns) * 30;
      const y = terrainHeight(x, z);
      positions.push(x, y, z);
      const slope = Math.abs(terrainHeight(x + 0.12, z) - y) * 4;
      color.copy(dark).lerp(light, 0.22 + noise(x * 1.4, z * 1.4) * 0.4 + slope);
      colors.push(color.r, color.g, color.b);
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column;
        const b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function rockMaterial(vertexColors = false): THREE.MeshStandardMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: vertexColors ? 0xffffff : 0x152824,
    roughness: 0.98,
    specularIntensity: 0.035,
    envMapIntensity: 0.06,
    metalness: 0,
    vertexColors,
    transparent: vertexColors,
    depthWrite: !vertexColors,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vStrataPosition; varying vec4 vLandscapeClip;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvLandscapeClip = gl_Position;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvStrataPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vStrataPosition;
varying vec4 vLandscapeClip;
float rockHash(vec3 p) { return fract(sin(dot(p, vec3(17.13, 71.71, 43.11))) * 43758.5453); }
float rockNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(rockHash(i), rockHash(i+vec3(1,0,0)),f.x),
                 mix(rockHash(i+vec3(0,1,0)),rockHash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(rockHash(i+vec3(0,0,1)),rockHash(i+vec3(1,0,1)),f.x),
                 mix(rockHash(i+vec3(0,1,1)),rockHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float strata = sin(vStrataPosition.y * 76.0 + rockNoise(vStrataPosition * 2.7) * 6.0);
float grain = rockNoise(vStrataPosition * 67.0);
diffuseColor.rgb *= 0.68 + grain * 0.21 + strata * 0.045;
${vertexColors ? `
vec2 screen = vLandscapeClip.xy / vLandscapeClip.w;
float sideFade = 1.0-smoothstep(0.68,0.99,abs(screen.x));
float bottomFade = smoothstep(-1.0,-0.60,screen.y);
float distanceFade = 1.0-smoothstep(8.0,15.0,length(vStrataPosition.xz));
diffuseColor.a *= sideFade * bottomFade * distanceFade;
` : ""}`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
float relief = rockNoise(vStrataPosition * 25.0) * 0.009 + strata * 0.0015;
vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
vec3 rx = cross(dy, normal), ry = cross(normal, dx);
float determinant = dot(dx, rx);
vec3 gradient = sign(determinant) * (dFdx(relief) * rx + dFdy(relief) * ry);
normal = normalize(abs(determinant) * normal - gradient);`,
      );
  };
  material.customProgramCacheKey = () => `colossal-stratified-rock-v2-${vertexColors}`;
  return material;
}

function pineCrownGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  };
  // Crossed, irregular needle fans form branch silhouettes, rather than cones.
  for (let tier = 0; tier < 7; tier++) {
    const height = 0.29 + tier * 0.098;
    const reach = 0.37 * (1 - height) + 0.025;
    for (let branch = 0; branch < 3; branch++) {
      const angle = (branch / 3) * Math.PI * 2 + tier * 1.79;
      const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const across = new THREE.Vector3(-outward.z, 0, outward.x);
      const root = new THREE.Vector3(0, height, 0);
      const tip = root.clone().addScaledVector(outward, reach);
      tip.y += reach * 0.22;
      const shoulder = root.clone().addScaledVector(outward, reach * 0.46);
      const left = shoulder.clone().addScaledVector(across, reach * 0.37);
      const right = shoulder.clone().addScaledVector(across, -reach * 0.37);
      left.y -= reach * 0.07;
      right.y -= reach * 0.07;
      triangle(root, left, tip);
      triangle(root, tip, right);
      const upper = shoulder.clone().add(new THREE.Vector3(0, reach * 0.21, 0));
      const lower = shoulder.clone().add(new THREE.Vector3(0, -reach * 0.20, 0));
      triangle(root, upper, tip);
      triangle(root, tip, lower);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function addScaleLandmarks(group: THREE.Group): void {
  const treeCount = 64;
  const trunkGeometry = new THREE.CylinderGeometry(0.011, 0.023, 1, 5, 1);
  trunkGeometry.translate(0, 0.5, 0);
  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    new THREE.MeshPhysicalMaterial({ color: 0x30312c, roughness: 1, specularIntensity: 0.08 }),
    treeCount,
  );
  const crowns = new THREE.InstancedMesh(
    pineCrownGeometry(),
    new THREE.MeshPhysicalMaterial({ color: 0x273b32, roughness: 1, specularIntensity: 0.08, side: THREE.DoubleSide }),
    treeCount,
  );
  const transform = new THREE.Object3D();
  for (let index = 0; index < treeCount; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const foreground = index < 8;
    const x = foreground ? 3.6 + hash(index, 1) * 1.0 : side * (2.75 + hash(index, 1) * 3.2);
    const z = foreground ? 1.7 + hash(index, 2) * 1.3 : -7.8 + hash(index, 2) * 12;
    const height = foreground ? 0.078 + hash(index, 3) * 0.021 : 0.048 + hash(index, 3) * 0.026;
    transform.position.set(x, groundHeight(x, z), z);
    transform.rotation.set(0, hash(index, 4) * Math.PI * 2, (hash(index, 5) - 0.5) * 0.14);
    transform.scale.setScalar(height);
    transform.updateMatrix();
    trunks.setMatrixAt(index, transform.matrix);
    crowns.setMatrixAt(index, transform.matrix);
  }
  group.add(trunks, crowns);

  const stone = new THREE.MeshPhysicalMaterial({ color: 0x414a43, roughness: 0.98, specularIntensity: 0.06 });
  const timber = new THREE.MeshPhysicalMaterial({ color: 0x393a30, roughness: 0.98, specularIntensity: 0.08 });
  const pavilion = new THREE.Group();
  pavilion.name = "Tiny ancient wayside pavilion — 0.12 world units high";
  const px = 3.2;
  const pz = 1.4;
  pavilion.position.set(px, groundHeight(px, pz) + 0.002, pz);
  pavilion.scale.setScalar(1.6);
  for (let step = 0; step < 3; step++) {
    const size = 0.075 - step * 0.009;
    const platform = new THREE.Mesh(new THREE.BoxGeometry(size, 0.003, size), stone);
    platform.position.y = step * 0.003;
    pavilion.add(platform);
  }
  const pillarGeometry = new THREE.CylinderGeometry(0.0014, 0.0017, 0.041, 6);
  for (const x of [-0.024, 0.024]) {
    for (const z of [-0.024, 0.024]) {
      const pillar = new THREE.Mesh(pillarGeometry, timber);
      pillar.position.set(x, 0.029, z);
      pavilion.add(pillar);
    }
  }
  const roof = new THREE.PlaneGeometry(0.086, 0.086, 10, 10);
  roof.rotateX(-Math.PI / 2);
  const roofPositions = roof.getAttribute("position");
  for (let index = 0; index < roofPositions.count; index++) {
    const x = roofPositions.getX(index) / 0.043;
    const z = roofPositions.getZ(index) / 0.043;
    const distance = Math.max(Math.abs(x), Math.abs(z));
    roofPositions.setY(index, 0.073 - distance * 0.025 + distance ** 5 * 0.008);
  }
  roof.computeVertexNormals();
  pavilion.add(new THREE.Mesh(roof, new THREE.MeshPhysicalMaterial({
    color: 0x354240, roughness: 0.92, specularIntensity: 0.1, side: THREE.DoubleSide,
  })));
  group.add(pavilion);

  const pathPositions: number[] = [];
  const pathIndices: number[] = [];
  for (let index = 0; index <= 96; index++) {
    const t = index / 96;
    const x = px + Math.sin(t * 4) * 0.24 + t * 0.7;
    const z = pz + t * 2.5;
    for (const offset of [-0.013, 0.013]) {
      pathPositions.push(x + offset, groundHeight(x + offset, z) + 0.004, z);
    }
    if (index < 96 && index % 5 !== 4) {
      const a = index * 2;
      pathIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const path = new THREE.BufferGeometry();
  path.setAttribute("position", new THREE.Float32BufferAttribute(pathPositions, 3));
  path.setIndex(pathIndices);
  path.computeVertexNormals();
  group.add(new THREE.Mesh(path, stone));
}

function mistMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, tint: { value: new THREE.Color("#728584") } },
    vertexShader: `varying vec2 vUv;
void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
uniform float time; uniform vec3 tint; varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
void main() {
  vec2 p=vUv*vec2(13.0,3.8)+vec2(time*0.011,0.0);
  float n=noise(p)*0.65+noise(p*2.1+11.0)*0.25+noise(p*4.2)*0.1;
  float edge=smoothstep(0.0,0.15,vUv.x)*smoothstep(0.0,0.15,1.0-vUv.x);
  edge*=smoothstep(0.0,0.32,vUv.y)*smoothstep(0.0,0.32,1.0-vUv.y);
  float alpha=edge*smoothstep(0.24,0.75,n)*0.105;
  gl_FragColor=vec4(tint,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
}

/** A continuous landscape whose tiny landmarks imply a hundreds-of-metres beast. */
export function createColossalLandscape(): ColossalLandscape {
  const group = new THREE.Group();
  group.name = "Colossal landscape — model reference size 5.8";
  const ground = new THREE.Mesh(terrainGeometry(), rockMaterial(true));
  ground.receiveShadow = true;
  group.add(ground);

  const rockGeometry = new THREE.IcosahedronGeometry(1, 2);
  const positions = rockGeometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const irregularity = 0.78 + noise(x * 3 + 7, z * 3 - y) * 0.35;
    positions.setXYZ(index, x * irregularity, y * irregularity, z * irregularity);
  }
  rockGeometry.computeVertexNormals();
  const stone = rockMaterial();
  for (let index = 0; index < 8; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const x = side * (3.8 + hash(index, 7) * 2.8);
    const z = 1 + hash(index, 8) * 5;
    const rock = new THREE.Mesh(rockGeometry, stone);
    rock.position.set(x, groundHeight(x, z) - 0.065, z);
    rock.scale.set(0.25 + hash(index, 9) * 0.45, 0.12, 0.3 + hash(index, 10) * 0.35);
    rock.rotation.y = hash(index, 11) * 6;
    rock.receiveShadow = true;
    group.add(rock);
  }
  addScaleLandmarks(group);

  const mist: THREE.ShaderMaterial[] = [];
  for (let index = 0; index < 3; index++) {
    const material = mistMaterial();
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(20, 0.7 + index * 0.15), material);
    ribbon.position.set(0, 0.17 + index * 0.13, 3 - index * 4.5);
    ribbon.rotation.y = Math.atan2(7, 10);
    ribbon.renderOrder = 2;
    group.add(ribbon);
    mist.push(material);
  }

  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0, 0.009, 0.001, 0.003, 0.018, -0.002, -0.007,
    0, 0, 0, 0.018, -0.002, -0.007, 0.004, 0, -0.005,
  ], 3));
  wingGeometry.computeVertexNormals();
  const birdMaterial = new THREE.MeshBasicMaterial({ color: 0x273433, side: THREE.DoubleSide });
  const birds: Bird[] = [];
  for (let index = 0; index < 11; index++) {
    const flockMember = new THREE.Group();
    const left = new THREE.Mesh(wingGeometry, birdMaterial);
    const right = new THREE.Mesh(wingGeometry, birdMaterial);
    right.scale.x = -1;
    flockMember.add(left, right);
    const origin = new THREE.Vector3(-4.6 + index * 0.21, 2.1 + hash(index, 17) * 0.31, -5.5 - hash(index, 18));
    flockMember.position.copy(origin);
    flockMember.rotation.y = 0.9;
    group.add(flockMember);
    birds.push({ group: flockMember, left, right, origin, phase: index * 1.71 });
  }

  let triangleCount = 0;
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const count = object.geometry.index?.count ?? object.geometry.getAttribute("position").count;
    triangleCount += (count / 3) * (object instanceof THREE.InstancedMesh ? object.count : 1);
  });
  group.userData.triangleCount = triangleCount;
  group.userData.scaleReferences = { beast: 5.8, pine: [0.048, 0.099], pavilion: 0.12 };

  return {
    group,
    update: (seconds: number) => {
      if (!Number.isFinite(seconds)) return;
      mist.forEach((material, index) => {
        material.uniforms.time.value = seconds + index * 37;
      });
      for (const bird of birds) {
        const beat = Math.sin(seconds * 4.6 + bird.phase) * 0.47;
        bird.left.rotation.z = beat;
        bird.right.rotation.z = -beat;
        bird.group.position.set(
          bird.origin.x + Math.sin(seconds * 0.045) * 1.2,
          bird.origin.y + Math.sin(seconds * 0.23 + bird.phase) * 0.024,
          bird.origin.z + Math.cos(seconds * 0.045) * 0.25,
        );
      }
    },
  };
}
