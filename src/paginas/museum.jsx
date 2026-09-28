import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  PointerLockControls,
  OrbitControls,
  Environment,
  ContactShadows,
  SpotLight,
} from "@react-three/drei";
import * as THREE from "three";
import "./museum.css";


const MODEL_FILE = "sala_classica.glb";

// Limites da sala (metros) e do banco central, para colisão simples
const LIMITE_X = 5.6;
const LIMITE_Z = 3.6;
const BANCO = { xMin: -1.9, xMax: 1.9, zMin: -0.65, zMax: 1.25 };
const ALTURA_OLHOS = 1.6;
const VELOCIDADE = 3;

// O .glb só tem cor sólida nos materiais (sem textura de imagem),
// então aqui a gente "acorda" o material: deixa a superfície reagir
// à luz ambiente/reflexo (envMap) e habilita sombra em cada mesh.
function Sala() {
  const url = `${import.meta.env.BASE_URL}3d/${MODEL_FILE}`;
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!mat || !mat.isMeshStandardMaterial) return;
        // reforça a reação ao ambiente (reflexo sutil) sem exagerar
        mat.envMapIntensity = 1.15;
        // evita "estourar" o branco puro sob luz forte
        mat.roughness = Math.min(1, Math.max(mat.roughness, 0.25));
        mat.needsUpdate = true;
      });
    });
  }, [scene]);

  return <primitive object={scene} />;
}

function batendoNoBanco(x, z) {
  return x > BANCO.xMin && x < BANCO.xMax && z > BANCO.zMin && z < BANCO.zMax;
}

// Andar com WASD / setas (modo desktop)
function Caminhada() {
  const { camera } = useThree();
  const teclas = useRef({});

  useEffect(() => {
    const down = (e) => { teclas.current[e.code] = true; };
    const up = (e) => { teclas.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const frente = useRef(new THREE.Vector3());
  const direita = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const k = teclas.current;
    const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);

    camera.position.y = ALTURA_OLHOS;
    if (!f && !r) return;

    camera.getWorldDirection(frente.current);
    frente.current.y = 0;
    frente.current.normalize();
    direita.current.crossVectors(frente.current, camera.up).normalize();

    const passo = Math.min(dt, 0.05) * VELOCIDADE;
    const dx = (frente.current.x * f + direita.current.x * r) * passo;
    const dz = (frente.current.z * f + direita.current.z * r) * passo;

    const nx = THREE.MathUtils.clamp(camera.position.x + dx, -LIMITE_X, LIMITE_X);
    if (!batendoNoBanco(nx, camera.position.z)) camera.position.x = nx;

    const nz = THREE.MathUtils.clamp(camera.position.z + dz, -LIMITE_Z, LIMITE_Z);
    if (!batendoNoBanco(camera.position.x, nz)) camera.position.z = nz;
  });

  return null;
}

// Luz de "trilho de museu": conjunto de spots quentes apontando pro chão/paredes,
// é isso que dá aquele clima de galeria em vez de luz de escritório.
function LuzDeGaleria() {
  return (
    <>
      <SpotLight
        position={[-3, 3.4, -1.5]}
        angle={0.55}
        penumbra={0.6}
        intensity={35}
        distance={9}
        color="#fff2df"
        castShadow
        shadow-bias={-0.0005}
      />
      <SpotLight
        position={[3, 3.4, -1.5]}
        angle={0.55}
        penumbra={0.6}
        intensity={35}
        distance={9}
        color="#fff2df"
        castShadow
        shadow-bias={-0.0005}
      />
      <SpotLight
        position={[-3, 3.4, 1.5]}
        angle={0.55}
        penumbra={0.6}
        intensity={35}
        distance={9}
        color="#fff2df"
      />
      <SpotLight
        position={[3, 3.4, 1.5]}
        angle={0.55}
        penumbra={0.6}
        intensity={35}
        distance={9}
        color="#fff2df"
      />
      {/* preenchimento frio bem sutil pra não deixar sombra preta pura */}
      <hemisphereLight args={["#dfe8ff", "#3a3a3a", 0.35]} />
      <ambientLight intensity={0.25} />
    </>
  );
}

export default function Museum() {
  const [visible, setVisible] = useState(false);
  const [travado, setTravado] = useState(false);
  const navigate = useNavigate();
  const exitRef = useRef(null);
  const isTouch =
    typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleBack = useCallback((e) => {
    const el = exitRef.current;
    if (!el) { navigate(-1); return; }

    const origin = e
      ? { x: e.clientX, y: e.clientY }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const maxRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );

    el.style.setProperty("--exit-x", `${origin.x}px`);
    el.style.setProperty("--exit-y", `${origin.y}px`);
    el.style.setProperty("--exit-r", `0px`);
    el.classList.remove("museum-exit-overlay--go");
    void el.offsetWidth;

    requestAnimationFrame(() => {
      el.style.setProperty("--exit-r", `${maxRadius}px`);
      el.classList.add("museum-exit-overlay--go");
    });

    setTimeout(() => {
      navigate("/", { state: { from: "/museum", origin } });
    }, 1000);
  }, [navigate]);

  return (
    <>
      <div className="museum-page">
        <button
          className={`museum-back${visible ? " is-visible" : ""}`}
          onClick={handleBack}
          aria-label="Voltar para Serviços"
        >
          ← Voltar
        </button>

        <Canvas
          className="museum-canvas"
          shadows
          camera={{ position: [0, ALTURA_OLHOS, 3], fov: 70, near: 0.05, far: 60 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
        >
          <color attach="background" args={["#0a0a0a"]} />
          <fog attach="fog" args={["#0a0a0a", 9, 22]} />

          {/* Ambiente HDRI: dá reflexo/luz indireta realista aos materiais PBR do modelo */}
          <Environment preset="apartment" />

          <LuzDeGaleria />

          <Suspense fallback={null}>
            <Sala />
          </Suspense>

          {/* ancora visualmente os objetos no chão com uma sombra de contato suave */}
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.55}
            scale={14}
            blur={2.4}
            far={4}
          />

          {isTouch ? (
            // Celular: arrastar o dedo para olhar ao redor
            <OrbitControls
              target={[0, ALTURA_OLHOS, 2.99]}
              enablePan={false}
              enableZoom={false}
              rotateSpeed={-0.4}
            />
          ) : (
            <>
              <PointerLockControls
                selector="#museum-entrar"
                onLock={() => setTravado(true)}
                onUnlock={() => setTravado(false)}
              />
              <Caminhada />
            </>
          )}
        </Canvas>

        {!isTouch && (
          <button
            id="museum-entrar"
            type="button"
            className={`museum-entrar${travado ? " museum-entrar--oculto" : ""}`}
          >
            <span className="museum-entrar-titulo">Clique para entrar</span>
            <span className="museum-entrar-dica">
              WASD ou setas para andar · mouse para olhar · ESC para soltar o cursor
            </span>
          </button>
        )}

        {isTouch && (
          <p className={`museum-dica-touch${visible ? " is-visible" : ""}`}>
            Arraste para olhar ao redor
          </p>
        )}
      </div>

      <div className="museum-exit-overlay" ref={exitRef} />
    </>
  );
}