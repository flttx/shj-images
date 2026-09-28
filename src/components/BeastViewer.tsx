import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  RotateCcw,
  Rotate3D,
  Pause,
  Maximize2,
  Plus,
  Minus,
  Move,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import type { Beast } from "../data/beasts";
import { createColossalLandscape } from "../lib/colossal-landscape";

interface ViewerProps {
  beast: Beast;
  reducedMotion: boolean;
  onReady?: () => void;
}

interface ViewerController {
  reset: () => void;
  zoom: (direction: number) => void;
  tour: (active: boolean) => void;
  animate: (name: string) => void;
}

function disposeObject(object: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    if (!(
      child instanceof THREE.Mesh ||
      child instanceof THREE.Points ||
      child instanceof THREE.Line
    ))
      return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
}

export default function BeastViewer({
  beast,
  reducedMotion,
  onReady,
}: ViewerProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ViewerController | null>(null);
  const readyCallback = useRef(onReady);
  const [load, setLoad] = useState({ status: "loading", progress: 0 });
  const [retry, setRetry] = useState(0);
  const [tour, setTour] = useState(false);
  const [clips, setClips] = useState<string[]>([]);
  const [activeClip, setActiveClip] = useState("");

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let alive = true;
    let frame = 0;
    let model: THREE.Group | undefined;
    let mixer: THREE.AnimationMixer | undefined;
    let activeAction: THREE.AnimationAction | undefined;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      queueMicrotask(() => {
        if (alive) setLoad({ status: "unsupported", progress: 0 });
      });
      return () => {
        alive = false;
      };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.setAttribute(
      "aria-label",
      `${beast.name}三维模型，拖动旋转、滚轮缩放；也可使用下方按钮`,
    );
    renderer.domElement.setAttribute("role", "img");
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x142427, 0.032);
    const camera = new THREE.PerspectiveCamera(39, 1, 0.05, 100);
    const focus = new THREE.Vector3(0, 2.35, 0);
    const cameraHome = new THREE.Vector3(6.5, 0.48, 9.2);
    const homeOffset = cameraHome.clone().sub(focus);
    camera.position.copy(cameraHome);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(focus);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI * 0.57;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.autoRotateSpeed = 0.2;
    controls.update();

    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(environment, 0.05);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.38;
    environment.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xb5d1d7, 0x111b18, 1.15));
    const key = new THREE.DirectionalLight(0xffdfad, 3.6);
    key.position.set(-6, 8, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -5;
    key.shadow.normalBias = 0.04;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x92ccd0, 4.6);
    rim.position.set(3, 5, -5);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xc6d5d1, 0.55);
    fill.position.set(5, 1, 5);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8, 96),
      new THREE.ShadowMaterial({ opacity: 0.32 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -0.015;
    scene.add(floor);
    const landscape = createColossalLandscape();
    scene.add(landscape.group);

    const particlePositions = new Float32Array(70 * 3);
    for (let i = 0; i < 70; i++) {
      particlePositions[i * 3] = Math.sin(i * 127.1) * 7;
      particlePositions[i * 3 + 1] = ((i * 0.719) % 1) * 7;
      particlePositions[i * 3 + 2] = Math.cos(i * 311.7) * 5 - 2;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0xd4c29b,
        size: 0.015,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    scene.add(particles);

    function playClip(name: string) {
      if (!mixer || !model) return;
      const clip = model.animations.find((item) => item.name === name);
      if (!clip) return;
      activeAction?.fadeOut(0.35);
      activeAction = mixer.clipAction(clip);
      activeAction.reset().fadeIn(0.35).play();
    }
    controller.current = {
      reset: () => {
        camera.position.copy(cameraHome);
        controls.target.copy(focus);
        controls.update();
      },
      zoom: (direction) => {
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength(
          THREE.MathUtils.clamp(
            offset.length() * (direction > 0 ? 0.84 : 1.19),
            controls.minDistance,
            controls.maxDistance,
          ),
        );
        camera.position.copy(controls.target).add(offset);
        controls.update();
      },
      tour: (active) => {
        controls.autoRotate = active;
      },
      animate: playClip,
    };

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      beast.model,
      (gltf) => {
        if (!alive) {
          disposeObject(gltf.scene);
          return;
        }
        model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = 5.8 / Math.max(size.x, size.y, size.z, 0.01);
        model.scale.setScalar(scale);
        model.position.set(
          -center.x * scale,
          -bounds.min.y * scale,
          -center.z * scale,
        );
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const materials = Array.isArray(child.material)
              ? child.material
              : [child.material];
            materials.forEach((material) => {
              if (material instanceof THREE.MeshStandardMaterial)
                material.envMapIntensity = 0.8;
            });
          }
        });
        model.animations = gltf.animations;
        scene.add(model);
        if (gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          const idle =
            gltf.animations.find((clip) => /idle/i.test(clip.name)) ??
            gltf.animations[0];
          setClips(gltf.animations.map((clip) => clip.name));
          setActiveClip(idle.name);
          if (!reducedMotion) playClip(idle.name);
        }
        setLoad({ status: "ready", progress: 100 });
        readyCallback.current?.();
      },
      (event) => {
        if (alive && event.total > 0)
          setLoad({
            status: "loading",
            progress: Math.round((event.loaded / event.total) * 100),
          });
      },
      () => {
        if (alive) setLoad({ status: "error", progress: 0 });
      },
    );

    const resize = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      cameraHome
        .copy(homeOffset)
        .multiplyScalar(Math.max(1, 1.15 / camera.aspect))
        .add(controls.target);
      camera.position.copy(cameraHome);
      controls.update();
      // CSS owns the canvas box so its old inline size cannot overflow on rotation.
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let previous = performance.now();
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      const delta = Math.min((time - previous) / 1000, 0.05);
      previous = time;
      if (document.hidden) return;
      controls.update(delta);
      if (!reducedMotion) {
        mixer?.update(delta);
        landscape.update(time / 1000);
        particles.rotation.y = time * 0.000007;
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);
    const contextLost = (event: Event) => {
      event.preventDefault();
      if (alive) setLoad({ status: "error", progress: 0 });
    };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      if (mixer && model) {
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
      }
      disposeObject(scene);
      envTarget.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      controller.current = null;
    };
  }, [beast.model, beast.name, reducedMotion, retry]);

  const retryLoad = () => {
    setLoad({ status: "loading", progress: 0 });
    setTour(false);
    setClips([]);
    setRetry((value) => value + 1);
  };
  return (
    <div className="viewer-shell" aria-busy={load.status === "loading"}>
      <div ref={host} className="webgl-stage" />
      {load.status === "loading" && (
        <div className="viewer-state" role="status">
          <LoaderCircle className="loading-icon" size={22} />
          <span>山海将现</span>
          <small>
            {load.progress
              ? `正在载入形体 · ${load.progress}%`
              : "正在唤起远古的形体…"}
          </small>
        </div>
      )}
      {(load.status === "error" || load.status === "unsupported") && (
        <div className="viewer-state viewer-error" role="status">
          <img
            src={beast.preview}
            alt={`${beast.name}静态预览`}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span>
            {load.status === "unsupported"
              ? "当前设备无法呈现三维形体"
              : "形体暂未载入"}
          </span>
          <small>仍可阅读完整档案，或重新尝试。</small>
          <button className="text-button" onClick={retryLoad}>
            <RefreshCw size={15} />
            重新载入
          </button>
        </div>
      )}
      {load.status === "ready" && (
        <div className="stage-caption">
          <span className="live-dot" />
          三维实景
          <span className="caption-divider" />
          自由观照
        </div>
      )}
      <div className="viewer-bottom">
        <div className="gesture-hint">
          <Move size={14} />
          <span>拖动环视 · 滚动缩放</span>
        </div>
        <div className="viewer-tools" aria-label="三维观察工具">
          <button
            aria-label="缩小模型"
            title="缩小"
            disabled={load.status !== "ready"}
            onClick={() => controller.current?.zoom(-1)}
          >
            <Minus size={17} />
          </button>
          <button
            aria-label="放大模型"
            title="放大"
            disabled={load.status !== "ready"}
            onClick={() => controller.current?.zoom(1)}
          >
            <Plus size={17} />
          </button>
          <span className="tool-divider" />
          <button
            className={tour ? "is-active" : ""}
            aria-label={tour ? "暂停环绕巡览" : "开始环绕巡览"}
            aria-pressed={tour}
            disabled={load.status !== "ready"}
            onClick={() => {
              controller.current?.tour(!tour);
              setTour(!tour);
            }}
          >
            {tour ? <Pause size={16} /> : <Rotate3D size={17} />}
            <span>巡览</span>
          </button>
          <button
            aria-label="复位视角"
            title="复位视角"
            disabled={load.status !== "ready"}
            onClick={() => controller.current?.reset()}
          >
            <RotateCcw size={16} />
          </button>
          <button
            aria-label="聚焦异兽"
            title="聚焦异兽"
            disabled={load.status !== "ready"}
            onClick={() => {
              controller.current?.reset();
              controller.current?.zoom(1);
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
        {clips.length > 0 && (
          <div className="animation-picker">
            <label htmlFor="animation">动作</label>
            <select
              id="animation"
              value={activeClip}
              onChange={(event) => {
                setActiveClip(event.target.value);
                controller.current?.animate(event.target.value);
              }}
            >
              {clips.map((clip) => (
                <option key={clip} value={clip}>
                  {/idle/i.test(clip)
                    ? "静立呼吸"
                    : /walk/i.test(clip)
                      ? "缓步巡游"
                      : clip}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
