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

const RAIO = 0.28; 
const MARGEM_PAREDE = 0.35;
const LIMITE_X = 4.0 - MARGEM_PAREDE;
const LIMITE_Z = 3.0 - MARGEM_PAREDE;
const ALTURA_OLHOS = 1.6;

const VIDEOS = [
  { id: "viviart", titulo: "Viviart", arquivo: "viviart.mp4" },
  { id: "bar", titulo: "Bar", arquivo: "bar.mp4" },
  { id: "redbull", titulo: "Red Bull", arquivo: "redbull.mp4" },
];

const TELA_L = 0.9;
const TELA_A = 1.6;
const TELA_ESPACO = 1.2; // distância entre os centros
const TELA_Y = 2.4; // altura do centro
const TELA_Z = -3.0; // face da parede do fundo
const ORIGINAIS_MIN = 101;
const ORIGINAIS_MAX = 118;

const alternar = (el) => {
  if (el.paused || el.ended) el.play().catch(() => {});
  else el.pause();
};
const fmt = (t) => {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const seg = Math.floor(t % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
};

const OBSTACULOS = [
  { xMin: -0.9, xMax: 0.9, zMin: -2.65, zMax: -2.15 },
];

// caminhada
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

function Sala({ videos, telas }) {
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


    const escondidos = [];
    scene.traverse((obj) => {
      const m = /^(?:part|geom)_(\d+)$/.exec(obj.name);
      if (!m) return;
      const n = Number(m[1]);
      if (n >= ORIGINAIS_MIN && n <= ORIGINAIS_MAX && obj.visible) {
        obj.visible = false;
        escondidos.push(obj);
      }
    });


    const grupo = new THREE.Group();
    const geoMoldura = new THREE.BoxGeometry(TELA_L + 0.08, TELA_A + 0.08, 0.04);
    const geoTela = new THREE.PlaneGeometry(TELA_L, TELA_A);
    const matMoldura = new THREE.MeshStandardMaterial({ color: "#0b0b0b", roughness: 0.4, metalness: 0.2 });
    const limpar = [];
    const lista = [];

    VIDEOS.forEach((v, i) => {
      const el = videos[v.id];
      const x = (i - (VIDEOS.length - 1) / 2) * TELA_ESPACO;

      const moldura = new THREE.Mesh(geoMoldura, matMoldura);
      moldura.position.set(x, TELA_Y, TELA_Z + 0.02);
      grupo.add(moldura);

      const tex = new THREE.VideoTexture(el);
      tex.colorSpace = THREE.SRGBColorSpace;
      const atualizar = () => { tex.needsUpdate = true; };
      el.addEventListener("loadeddata", atualizar);
      el.addEventListener("seeked", atualizar);
      if (el.readyState >= 2) atualizar();
      const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
      const tela = new THREE.Mesh(geoTela, mat);
      tela.position.set(x, TELA_Y, TELA_Z + 0.045);
      tela.userData.videoId = v.id;
      grupo.add(tela);

      lista.push(tela);
      limpar.push(() => {
        el.removeEventListener("loadeddata", atualizar);
        el.removeEventListener("seeked", atualizar);
        tex.dispose();
        mat.dispose();
      });
    });

    scene.add(grupo);
    telas.current = lista;

    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;

    return () => {
      scene.remove(grupo);
      escondidos.forEach((o) => { o.visible = true; });
      limpar.forEach((f) => f());
      geoMoldura.dispose();
      geoTela.dispose();
      matMoldura.dispose();
      telas.current = [];
    };
  }, [scene, gl, videos, telas]);

  return <primitive object={scene} />;
}

function Mira({ telas, onMirar }) {
  const { camera } = useThree();
  const raio = useRef(new THREE.Raycaster(undefined, undefined, 0, 8));
  const centro = useRef(new THREE.Vector2(0, 0));
  const atual = useRef(null);

  useFrame(() => {
    raio.current.setFromCamera(centro.current, camera);
    const hit = raio.current.intersectObjects(telas.current, false)[0];
    const id = hit ? hit.object.userData.videoId : null;
    if (id !== atual.current) {
      atual.current = id;
      onMirar(id);
    }
  });

  return null;
}
useGLTF.preload(`${import.meta.env.BASE_URL}3d/${MODEL_FILE}`);

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

// awsd
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

    let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - joy.y;
    let r = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + joy.x;

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

    const a = 1 - Math.exp(-ACEL * dt);
    vel.current.x += (alvoX - vel.current.x) * a;
    vel.current.z += (alvoZ - vel.current.z) * a;

    const velocidadeAtual = Math.hypot(vel.current.x, vel.current.z);
    if (velocidadeAtual < 0.01) {
      vel.current.x = 0;
      vel.current.z = 0;
    }

    const px = camera.position.x;
    const pz = camera.position.z;

    const nx = THREE.MathUtils.clamp(px + vel.current.x * dt, -LIMITE_X, LIMITE_X);
    if (batendoEmObstaculo(nx, pz)) vel.current.x = 0;
    else camera.position.x = nx;

    const nz = THREE.MathUtils.clamp(pz + vel.current.z * dt, -LIMITE_Z, LIMITE_Z);
    if (batendoEmObstaculo(camera.position.x, nz)) vel.current.z = 0;
    else camera.position.z = nz;

    const ritmo = velocidadeAtual / VELOCIDADE;
    bob.current += dt * BOB_FREQ * Math.min(ritmo, MULT_CORRIDA);
    camera.position.y = ALTURA_OLHOS + Math.sin(bob.current) * BOB_ALTURA * Math.min(ritmo, 1);
  });

  return null;
}

function OlharToque({ telas, onTocarTela }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    const raio = new THREE.Raycaster(undefined, undefined, 0, 8);
    const ndc = new THREE.Vector2();
    let id = null;
    let lx = 0;
    let ly = 0;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    let moveu = false;

    const down = (e) => {
      if (id !== null) return;
      id = e.pointerId;
      lx = x0 = e.clientX;
      ly = y0 = e.clientY;
      t0 = performance.now();
      moveu = false;
      el.setPointerCapture(id);
    };
    const move = (e) => {
      if (e.pointerId !== id) return;
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) moveu = true;
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= (e.clientX - lx) * 0.005;
      euler.x -= (e.clientY - ly) * 0.005;
      euler.x = THREE.MathUtils.clamp(euler.x, -1.3, 1.3);
      camera.quaternion.setFromEuler(euler);
      lx = e.clientX;
      ly = e.clientY;
    };
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null;
  
      if (!moveu && performance.now() - t0 < 350 && e.type === "pointerup") {
        const r = el.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        raio.setFromCamera(ndc, camera);
        const hit = raio.intersectObjects(telas.current, false)[0];
        if (hit) onTocarTela(hit.object.userData.videoId);
      }
    };
    const cancel = (e) => { if (e.pointerId === id) id = null; };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    };
  }, [camera, gl, telas, onTocarTela]);

  return null;
}

function useVideoInfo(el) {
  const [info, setInfo] = useState({ tocando: false, tempo: 0, dur: 0, vol: 1, mudo: false });
  useEffect(() => {
    if (!el) return;
    const ler = () =>
      setInfo({
        tocando: !el.paused && !el.ended,
        tempo: el.currentTime,
        dur: isFinite(el.duration) ? el.duration : 0,
        vol: el.volume,
        mudo: el.muted,
      });
    const eventos = ["play", "pause", "ended", "timeupdate", "loadedmetadata", "durationchange", "volumechange", "seeked"];
    eventos.forEach((e) => el.addEventListener(e, ler));
    ler();
    return () => eventos.forEach((e) => el.removeEventListener(e, ler));
  }, [el]);
  return info;
}

function Hud({ videos, ativo, mirando, mostrarMira, isTouch, onSelecionar }) {
  const el = videos ? videos[ativo] : null;
  const info = useVideoInfo(el);
  const meta = VIDEOS.find((v) => v.id === ativo);
  const pct = info.dur ? (info.tempo / info.dur) * 100 : 0;
  const volumeAtual = info.mudo ? 0 : info.vol;
  const solta = (e) => e.currentTarget.blur(); // evita a barra de espaço "clicar" no botão focado

  return (
    <>
      <div className={`museum-mira${mostrarMira ? " is-visible" : ""}${mirando ? " museum-mira--alvo" : ""}`}>
        <span className="museum-mira-ponto" />
        {mirando && (
          <span className="museum-mira-rotulo">
            {isTouch ? meta.titulo : `${meta.titulo} · clique para ${info.tocando ? "pausar" : "reproduzir"}`}
          </span>
        )}
      </div>

      {isTouch && mirando && (
        <button
          type="button"
          className="museum-acao"
          onClick={() => { if (el) alternar(el); }}
        >
          {info.tocando ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
          )}
        </button>
      )}

      <div className="museum-player">
        <div className="museum-player-abas">
          {VIDEOS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`museum-player-aba${v.id === ativo ? " is-ativa" : ""}`}
              onClick={(e) => { onSelecionar(v.id); solta(e); }}
            >
              {v.titulo}
            </button>
          ))}
        </div>

        <div className="museum-player-linha">
          <button
            type="button"
            className="museum-player-btn"
            aria-label={info.tocando ? "Pausar" : "Reproduzir"}
            onClick={(e) => { if (el) alternar(el); solta(e); }}
          >
            {info.tocando ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
            )}
          </button>

          <span className="museum-player-tempo">{fmt(info.tempo)}</span>
          <input
            className="museum-player-barra"
            type="range"
            min="0"
            max={info.dur || 1}
            step="0.1"
            value={info.tempo}
            style={{ "--p": `${pct}%` }}
            aria-label="Progresso"
            onChange={(e) => { if (el) el.currentTime = Number(e.target.value); }}
          />
          <span className="museum-player-tempo">{fmt(info.dur)}</span>

          <button
            type="button"
            className="museum-player-btn"
            aria-label={info.mudo ? "Ativar som" : "Silenciar"}
            onClick={(e) => { if (el) el.muted = !el.muted; solta(e); }}
          >
            {volumeAtual === 0 ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></svg>
            )}
          </button>
          <input
            className="museum-player-barra museum-player-volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volumeAtual}
            style={{ "--p": `${volumeAtual * 100}%` }}
            aria-label="Volume"
            onChange={(e) => {
              if (!el) return;
              const v = Number(e.target.value);
              el.volume = v;
              el.muted = v === 0;
            }}
          />
        </div>

        {!isTouch && (
          <p className="museum-player-dica">
            Clique ou Espaço: play/pause · M: mudo · , e . : ±5s
          </p>
        )}
      </div>
    </>
  );
}

export default function Museum() {
  const [visible, setVisible] = useState(false);
  const [travado, setTravado] = useState(false);
  const navigate = useNavigate();
  const [videos, setVideos] = useState(null); // { id: <video> }
  const [ativo, setAtivo] = useState(VIDEOS[0].id); // vídeo controlado pelo player
  const [mirando, setMirando] = useState(null); // vídeo sob a mira (ou null)
  const telas = useRef([]);
  const ativoRef = useRef(VIDEOS[0].id);
  const mirandoRef = useRef(null);
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

  useEffect(() => {
    const base = `${import.meta.env.BASE_URL}3d/`;
    const els = {};
    VIDEOS.forEach((v) => {
      const el = document.createElement("video");
      el.src = base + v.arquivo;
      el.crossOrigin = "anonymous";
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.preload = "auto";
      els[v.id] = el;
    });
    setVideos(els);
    return () => {
      Object.values(els).forEach((el) => {
        el.pause();
        el.removeAttribute("src");
        el.load();
      });
    };
  }, []);

  const onMirar = useCallback((id) => {
    mirandoRef.current = id;
    setMirando(id);
    if (id) { ativoRef.current = id; setAtivo(id); }
  }, []);

  const selecionar = useCallback((id) => {
    ativoRef.current = id;
    setAtivo(id);
  }, []);


  const tocarTela = useCallback((id) => {
    if (!videos || !videos[id]) return;
    ativoRef.current = id;
    setAtivo(id);
    alternar(videos[id]);
  }, [videos]);

  useEffect(() => {
    if (!videos) return;
    const alvo = () => videos[mirandoRef.current || ativoRef.current];
    const tecla = (e) => {
      if (e.repeat) return;
      const el = alvo();
      if (!el) return;
      if (e.code === "Space") { e.preventDefault(); alternar(el); }
      else if (e.code === "KeyM") el.muted = !el.muted;
      else if (e.code === "Comma") el.currentTime = Math.max(0, el.currentTime - 5);
      else if (e.code === "Period") el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
    };
    const clique = (e) => {
      if (e.button === 0 && document.pointerLockElement && mirandoRef.current) {
        alternar(videos[mirandoRef.current]);
      }
    };
    window.addEventListener("keydown", tecla);
    window.addEventListener("mousedown", clique);
    return () => {
      window.removeEventListener("keydown", tecla);
      window.removeEventListener("mousedown", clique);
    };
  }, [videos]);


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
            {videos && <Sala videos={videos} telas={telas} />}
          </Suspense>
          <Mira telas={telas} onMirar={onMirar} />

          {isTouch ? (
            <>
              <OlharToque telas={telas} onTocarTela={tocarTela} />
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

        <Hud
          videos={videos}
          ativo={ativo}
          mirando={mirando}
          mostrarMira={isTouch || travado}
          isTouch={isTouch}
          onSelecionar={selecionar}
        />

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
              Joystick para andar · arraste para olhar · toque no vídeo para play/pause
            </p>
          </>
        )}
      </div>

      <div className="museum-exit-overlay" ref={exitRef} />
    </>
  );
}