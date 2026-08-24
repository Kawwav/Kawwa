import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Bounds } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./jogos.css";

gsap.registerPlugin(ScrollTrigger);

const AMPLITUDE_X = 0.3; // quanto o modelo inclina no eixo X ao mover o mouse verticalmente
const AMPLITUDE_Y = 0.5; // quanto o modelo gira no eixo Y ao mover o mouse horizontalmente
const SUAVIZACAO = 0.05; // velocidade de interpolação (0 a 1) — menor = mais suave/lento

function Modelo({ mouseRef }) {
    const BASE = import.meta.env.BASE_URL;
    const { scene } = useGLTF(`${BASE}fallout.glb`);
    const grupoRef = useRef();

    const rotacaoBase = useRef([
        0,    // eixo X 
        -1.5, // eixo Y 
        0,    // eixo Z
    ]);

    useFrame(() => {
        const grupo = grupoRef.current;
        if (!grupo) return;
        const { x, y } = mouseRef.current;
        const [baseX, baseY] = rotacaoBase.current;

        const alvoY = baseY + x * AMPLITUDE_Y;
        const alvoX = baseX - y * AMPLITUDE_X;

        grupo.rotation.y += (alvoY - grupo.rotation.y) * SUAVIZACAO;
        grupo.rotation.x += (alvoX - grupo.rotation.x) * SUAVIZACAO;
    });

    return (
        <primitive
            ref={grupoRef}
            object={scene}
            rotation={rotacaoBase.current}
        />
    );
}

export default function Jogos() {
    const BASE = import.meta.env.BASE_URL;
    const secaoRef = useRef(null);
    const mascaraRef = useRef(null); // envelope recortado (clip-path) que cresce com o scroll
    const modeloWrapperRef = useRef(null); // sobe do "chão" conforme o cilindro abre
    const tituloRef = useRef(null); // desce do "teto" conforme o cilindro abre
    const tituloFavoritosRef = useRef(null); // só aparece quando o efeito termina de abrir
    // Coordenadas normalizadas do mouse (-1 a 1) relativas ao centro da seção.
    // Usar um ref (em vez de state) evita re-render a cada movimento do mouse.
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const secao = secaoRef.current;
        if (!secao) return;

        const aoMoverMouse = (e) => {
            const rect = secao.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
            mouseRef.current = { x, y };
        };

        window.addEventListener("mousemove", aoMoverMouse);
        return () => window.removeEventListener("mousemove", aoMoverMouse);
    }, []);

    useEffect(() => {
        const secao = secaoRef.current;
        const mascara = mascaraRef.current;
        const titulo = tituloRef.current;
        const tituloFavoritos = tituloFavoritosRef.current;
        const modelo = modeloWrapperRef.current;
        if (!secao || !mascara) return;

        // A rolagem real acontece dentro do container ".pagina" (Sobremim.jsx
        // usa overflow no próprio div, não na window), então o ScrollTrigger
        // precisa ser apontado pra esse scroller — senão o trigger nunca dispara.
        const scroller = secao.closest(".pagina") || window;

        // Dimensões do "cilindro" inicial, em % de inset (topo/laterais) e
        // raio em px pro arredondado do topo. Em telas pequenas a cápsula
        // fica proporcionalmente mais estreita/baixa.
        const obterEstadoInicial = () =>
            window.innerWidth <= 768
                ? { topo: 88, lado: 38, raio: 90, subidaModelo: 140, descidaTitulo: 90 }
                : { topo: 82, lado: 44, raio: 220, subidaModelo: 260, descidaTitulo: 160 };

        let estadoInicial = obterEstadoInicial();
        const progresso = { p: 0 };

        const aplicarProgresso = () => {
            const { p } = progresso;
            const restante = 1 - p;

            // 1) recorte crescendo
            const topo = estadoInicial.topo * restante;
            const lado = estadoInicial.lado * restante;
            const raio = estadoInicial.raio * restante;
            mascara.style.clipPath =
                `inset(${topo}% ${lado}% 0% ${lado}% round ${raio}px ${raio}px 0 0)`;

            // 2) modelo sobe do chão junto com a abertura
            if (modelo) {
                modelo.style.transform = `translateY(${estadoInicial.subidaModelo * restante}px)`;
                modelo.style.opacity = Math.min(p / 0.5, 1);
            }

            // 3) título desce do teto junto com a abertura
            if (titulo) {
                titulo.style.transform = `translateY(${-estadoInicial.descidaTitulo * restante}px)`;
                titulo.style.opacity = Math.min(p / 0.5, 1);
            }

            // 4) "JOGOS FAVORITOS" só aparece quando o cilindro terminou de abrir
            if (tituloFavoritos) {
                const inicioAparicao = 0.85; // a partir de 85% do progresso começa o fade in
                const opacidade = Math.max(
                    0,
                    (p - inicioAparicao) / (1 - inicioAparicao)
                );
                tituloFavoritos.style.opacity = opacidade;
                tituloFavoritos.style.transform = `translate(-50%, ${(1 - opacidade) * -12}px)`;
            }
        };

        aplicarProgresso();

        const ctx = gsap.context(() => {
            gsap.to(progresso, {
                p: 1,
                ease: "none",
                onUpdate: aplicarProgresso,
                scrollTrigger: {
                    trigger: secao,
                    scroller,
                    start: "top bottom",
                    end: "top top",
                    scrub: 0.6,
                },
            });

            const aoRedimensionar = () => {
                estadoInicial = obterEstadoInicial();
                aplicarProgresso();
                ScrollTrigger.refresh();
            };
            window.addEventListener("resize", aoRedimensionar);

            return () => window.removeEventListener("resize", aoRedimensionar);
        }, secao);

        return () => ctx.revert();
    }, []);

    return (
        <div className="jogos-secao" ref={secaoRef}>

            <style>{`
                @font-face {
                    font-family: 'Overseer';
                    src: url('${BASE}Overseer_Italic.otf') format('opentype');
                    font-style: italic;
                    font-weight: 400;
                    font-display: swap;
                }
                @font-face {
                    font-family: 'Block Berthold';
                    src: url('${BASE}BlockBerthold.otf') format('opentype');
                    font-style: normal;
                    font-weight: 400;
                    font-display: swap;
                }
            `}</style>

            <div className="jogos-mascara" ref={mascaraRef}>
                <div
                    className="jogos-fundo"
                    style={{ backgroundImage: `url(${BASE}fallout.webp)` }}
                    aria-hidden="true"
                />

                <h2 className="jogos-favoritos-titulo" ref={tituloFavoritosRef}>
                    JOGOS FAVORITOS
                </h2>


                <div className="jogos-modelos">
                    <div className="jogos-modelo" ref={modeloWrapperRef}>
                        <h3 className="jogos-fallout-titulo">FALLOUT</h3>
                        <Canvas camera={{ fov: 45 }}>
                            <ambientLight intensity={3.8} />
                            <directionalLight position={[70, 45, 55]} intensity={1.5} />
                            <Suspense fallback={null}>
                                <Bounds fit observe margin={1.2}>
                                    <Modelo mouseRef={mouseRef} />
                                </Bounds>
                            </Suspense>
                        </Canvas>
                    </div>
                </div>
            </div>
        </div>
    );
}