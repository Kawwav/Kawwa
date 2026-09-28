import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  PointerLockControls,
  Environment,
  Lightformer,
} from "@react-three/drei";
import * as THREE from "three";
import "./museum.css";

const MODEL_FILE = "sala_classica.glb";

// ─── Medidas reais da sala (tiradas do .glb) ───
// Interior: x de -4 a 4, z de -3 a 3. O tapete (x ±1.8, z ±1.1) é só decoração: NÃO tem colisão.
const RAIO = 0.28; // "largura" do corpo: evita encostar a câmera na parede/banco
const MARGEM_PAREDE = 0.35;
const LIMITE_X = 4.0 - MARGEM_PAREDE;
const LIMITE_Z = 3.0 - MARGEM_PAREDE;
const ALTURA_OLHOS = 1.6;

// Único móvel no chão: o banco encostado na parede do fundo
const OBSTACULOS = [
  { xMin: -0.9, xMax: 0.9, zMin: -2.65, zMax: -2.15 },
];

// ─── Caminhada ───
const VELOCIDADE = 2.6; // andando
const MULT_CORRIDA = 1.8; // segurando Shift
const ACEL = 9; // quanto maior, mais rápido acelera/para
const BOB_ALTURA = 0.02; // balanço vertical sutil ao andar
const BOB_FREQ = 8;

const batendoEmObstaculo = (x, z) =>
  OBSTACULOS.some(
    (o) =>
      x > o.xMin - RAIO &&
      x < o.xMax + RAIO &&
      z > o.zMin - RAIO &&
      z < o.zMax + RAIO
  );

// ─── Modelo ───
// Cena estática: congelamos as matrizes (menos CPU por frame) e as sombras
// são calculadas UMA vez só (em vez de re-renderizar 131 meshes a cada frame).
function Sala() {
  const url = `${import.meta.env.BASE_URL}3d/${MODEL_FILE}`;
  const { scene } = useGLTF(url);
  const { gl } = useThree();

  useEffect(() => {
    scene.updateMatrixWorld(true);

    scene.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.updateMatrix();

      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!mat || !mat.isMeshStandardMaterial) return;
        mat.envMapIntensity = 1.0;
        mat.roughness = Math.min(1, Math.max(mat.roughness, 0.25));
        if (mat.map) mat.map.anisotropy = 4;
        mat.needsUpdate = true;
      });
    });

    // sombras estáticas: gera uma vez e para
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [scene, gl]);

  return <primitive object={scene} />;
}
useGLTF.preload(`${import.meta.env.BASE_URL}3d/${MODEL_FILE}`);

// ─── Ambiente sem download: "softboxes" desenhados na hora (1 render só) ───
function Ambiente() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={2.2} color="#fff2df" position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[12, 8, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#dfe8ff" position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#dfe8ff" position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 2, -5]} scale={[10, 3, 1]} />
    </Environment>
  );
}

// ─── Luz de galeria: spots nativos (baratos). Só 2 projetam sombra, e estática ───
function LuzDeGaleria() {
  const spots = [
    { pos: [-3, 3.4, -1.5], sombra: true },
    { pos: [3, 3.4, -1.5], sombra: true },
    { pos: [-3, 3.4, 1.5], sombra: false },
    { pos: [3, 3.4, 1.5], sombra: false },
  ];
  return (
    <>
      {spots.map((s, i) => (
        <spotLight
          key={i}
          position={s.pos}
          angle={0.7}
          penumbra={0.7}
          intensity={35}
          distance={10}
          color="#fff2df"
          castShadow={s.sombra}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
        />
      ))}
      <hemisphereLight args={["#dfe8ff", "#3a3a3a", 0.5]} />
      <ambientLight intensity={0.3} />
    </>
  );
}

// ─── Caminhada: WASD/setas + Shift + joystick, com aceleração suave e deslize nas paredes ───
function Caminhada({ input }) {
  const { camera } = useThree();
  const teclas = useRef({});
  const vel = useRef({ x: 0, z: 0 });
  const bob = useRef(0);
  const frente = useRef(new THREE.Vector3());
  const direita = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e) => { teclas.current[e.code] = true; };
    const up = (e) => { teclas.current[e.code] = false; };
    const reset = () => { teclas.current = {}; }; // evita "tecla presa" ao trocar de aba
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = teclas.current;
    const joy = input.current.joy;

    // entrada combinada (teclado + joystick)
    let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - joy.y;
    let r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + joy.x;

    // diagonal não pode ser mais rápida
    const len = Math.hypot(f, r);
    if (len > 1) { f /= len; r /= len; }

    const corre = k.ShiftLeft || k.ShiftRight ? MULT_CORRIDA : 1;
    const alvo = VELOCIDADE * corre;

    camera.getWorldDirection(frente.current);
    frente.current.y = 0;
    frente.current.normalize();
    direita.current.crossVectors(frente.current, camera.up).normalize();

    const alvoX = (frente.current.x * f + direita.current.x * r) * alvo;
    const alvoZ = (frente.current.z * f + direita.current.z * r) * alvo;

    // aceleração/frenagem suave (independente do FPS)
    const a = 1 - Math.exp(-ACEL * dt);
    vel.current.x += (alvoX - vel.current.x) * a;
    vel.current.z += (alvoZ - vel.current.z) * a;

    const velocidadeAtual = Math.hypot(vel.current.x, vel.current.z);
    if (velocidadeAtual < 0.01) {
      vel.current.x = 0;
      vel.current.z = 0;
    }

    // movimento por eixo = desliza na parede/banco em vez de "grudar"
    const px = camera.position.x;
    const pz = camera.position.z;

    const nx = THREE.MathUtils.clamp(px + vel.current.x * dt, -LIMITE_X, LIMITE_X);
    if (batendoEmObstaculo(nx, pz)) vel.current.x = 0;
    else camera.position.x = nx;

    const nz = THREE.MathUtils.clamp(pz + vel.current.z * dt, -LIMITE_Z, LIMITE_Z);
    if (batendoEmObstaculo(camera.position.x, nz)) vel.current.z = 0;
    else camera.position.z = nz;

    // balanço da cabeça, proporcional à velocidade
    const ritmo = velocidadeAtual / VELOCIDADE;
    bob.current += dt * BOB_FREQ * Math.min(ritmo, MULT_CORRIDA);
    camera.position.y = ALTURA_OLHOS + Math.sin(bob.current) * BOB_ALTURA * Math.min(ritmo, 1);
  });

  return null;
}

// ─── Olhar com o dedo (celular): arrastar na tela gira a câmera ───
function OlharToque() {
  const { camera, gl } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    let id = null;
    let lx = 0;
    let ly = 0;

    const down = (e) => {
      if (id !== null) return;
      id = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture(id);
    };
    const move = (e) => {
      if (e.pointerId !== id) return;
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= (e.clientX - lx) * 0.005;
      euler.x -= (e.clientY - ly) * 0.005;
      euler.x = THREE.MathUtils.clamp(euler.x, -1.3, 1.3);
      camera.quaternion.setFromEuler(euler);
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = (e) => { if (e.pointerId === id) id = null; };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [camera, gl]);

  return null;
}

export default function Museum() {
  const [visible, setVisible] = useState(false);
  const [travado, setTravado] = useState(false);
  const navigate = useNavigate();
  const exitRef = useRef(null);
  const joyRef = useRef(null);
  const knobRef = useRef(null);
  const input = useRef({ joy: { x: 0, y: 0 } });
  const isTouch =
    typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // ─── Joystick virtual ───
  const RAIO_JOY = 46;
  const moverJoy = useCallback((e) => {
    const box = joyRef.current.getBoundingClientRect();
    let dx = e.clientX - (box.left + box.width / 2);
    let dy = e.clientY - (box.top + box.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RAIO_JOY) { dx = (dx / d) * RAIO_JOY; dy = (dy / d) * RAIO_JOY; }
    input.current.joy = { x: dx / RAIO_JOY, y: dy / RAIO_JOY };
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  }, []);

  const soltarJoy = useCallback(() => {
    input.current.joy = { x: 0, y: 0 };
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
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
          shadows="basic"
          dpr={[1, 1.5]}
          camera={{ position: [0, ALTURA_OLHOS, 2.2], fov: 70, near: 0.05, far: 40 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.15,
          }}
          performance={{ min: 0.6 }}
        >
          <color attach="background" args={["#0a0a0a"]} />
          <fog attach="fog" args={["#0a0a0a", 9, 22]} />

          <Ambiente />
          <LuzDeGaleria />

          <Suspense fallback={null}>
            <Sala />
          </Suspense>

          {isTouch ? (
            <>
              <OlharToque />
              <Caminhada input={input} />
            </>
          ) : (
            <>
              <PointerLockControls
                selector="#museum-entrar"
                pointerSpeed={0.8}
                onLock={() => setTravado(true)}
                onUnlock={() => setTravado(false)}
              />
              <Caminhada input={input} />
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
              WASD ou setas para andar · Shift para correr · mouse para olhar · ESC para soltar o cursor
            </span>
          </button>
        )}

        {isTouch && (
          <>
            <div
              ref={joyRef}
              className={`museum-joystick${visible ? " is-visible" : ""}`}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); moverJoy(e); }}
              onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") moverJoy(e); }}
              onPointerUp={soltarJoy}
              onPointerCancel={soltarJoy}
            >
              <div ref={knobRef} className="museum-joystick-knob" />
            </div>
            <p className={`museum-dica-touch${visible ? " is-visible" : ""}`}>
              Joystick para andar · arraste para olhar
            </p>
          </>
        )}
      </div>

      <div className="museum-exit-overlay" ref={exitRef} />
    </>
  );
}