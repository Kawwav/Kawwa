import { useEffect, useRef, useState } from "react";
import "./tv.css";

// Seção que entra DEPOIS do jogos.jsx (logo após a fase do GTA).
// Mesma mecânica sticky usada no jogos.jsx e na linha do tempo do
// Sobremim.jsx: um wrapper alto dá espaço de scroll e a seção gruda no topo
// do scroller (.pagina) via position:sticky — sem GSAP, só leitura de
// scroll + rAF.
//
// Timeline em 3 fases, tudo dentro do MESMO trilho de scroll:
// 1) espera  — painel 100% fora da tela (a descrição do GTA termina de subir)
// 2) entrada — painel desliza da direita pra esquerda até cobrir a tela
// 3) vídeo   — com o painel já cobrindo a tela, o scroll passa a "tocar" o
//    vídeo do Breaking Bad frame a frame (igual o comeco.jsx faz com
//    GSAP+ScrollTrigger, mas aqui via canvas + leitura direta do scroll).
//
// Em cima do vídeo existe o título "BREAKING BAD", que:
//  - surge no MEIO da tela;
//  - depois SOBE para a parte superior da tela conforme o scroll.
//
// Os frames são extraídos do vídeo com ffmpeg e ficam em /public/frames:
//   ffmpeg -i Design_sem_nome.mp4 -vf "scale=1600:-2" -q:v 3 public/frames/frame_%04d.jpg

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const lerp = (a, b, t) => a + (b - a) * t;
// Suaviza o começo/fim do movimento do título (sem lib de easing).
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Frames extraídos do Design_sem_nome.mp4 (30fps, ~8.43s -> 253 frames).
const FRAME_COUNT = 253;
const FRAME_PATH = (i) =>
    `/frames/frame_${String(i).padStart(4, "0")}.jpg`;

// Quanto de scroll (px) cada etapa ocupa. Mesma ideia das ALTURA_FASE_N do
// jogos.jsx: a altura do trilho é derivada daqui, sem número mágico
// duplicado.
const ALTURA_ESPERA = 400;
const ALTURA_ENTRADA = 700;
// Quanto mais scroll aqui, mais "devagar" (mais suave) o vídeo avança —
// é esse trecho que fica 1 pra 1 com os 296 frames.
const ALTURA_VIDEO = 3200;
const ALTURA_TOTAL = ALTURA_ESPERA + ALTURA_ENTRADA + ALTURA_VIDEO;

// Fatias do scroll total (derivadas, nada de número mágico).
const FRACAO_ESPERA = ALTURA_ESPERA / ALTURA_TOTAL;
const FRACAO_ENTRADA = (ALTURA_ESPERA + ALTURA_ENTRADA) / ALTURA_TOTAL;

// Frame a partir do qual o título "BREAKING BAD" começa a aparecer, e por
// quantos frames dura o fade-in (mesma ideia 1-pra-1-com-frame do vídeo,
// só que aplicada à opacidade do título em vez de um frame de imagem).
const TITULO_FRAME_INICIO = 40;
const TITULO_FRAME_DURACAO = 20;

// Depois que o título já apareceu no meio, ele começa a subir. Os dois
// valores abaixo são frações do trecho de vídeo (pVideo): quando a subida
// começa e quando ela termina (título já colado no topo).
const SUBIDA_INICIO = 0.42;
const SUBIDA_FIM = 0.78;

// Posição vertical do título em fração da altura da tela: 50% (meio) no
// começo, 14% (parte superior) no fim da subida.
const TITULO_Y_MEIO = 0.5;
const TITULO_Y_TOPO = 0.14;

// A partir deste frame (índice 0-based, mesmo usado pra escolher o
// frame_%04d.jpg), o "cover fit" do canvas passa a enquadrar mais pra
// esquerda da imagem — SÓ no mobile (mesmo breakpoint do @media do CSS).
// No desktop o enquadramento continua centralizado como sempre.
const MOBILE_BREAKPOINT = 768;
const DESLOCAMENTO_MOBILE_FRAME_INICIO = 184;
const DESLOCAMENTO_MOBILE_FRAME_DURACAO = 20; // transição suave em vez de "pulo" seco
const DESLOCAMENTO_MOBILE_FRACAO = 0.3; // 0 = sem deslocamento, 1 = usa todo o espaço de sobra do crop

export default function Tv() {
    const trilhoScrollRef = useRef(null); // wrapper alto que dá o espaço de scroll
    const secaoRef = useRef(null); // bloco sticky (100vh)
    const painelRef = useRef(null); // painel que entra da direita
    const canvasRef = useRef(null); // onde o frame do vídeo é desenhado
    const avisoRef = useRef(null); // aviso "role para continuar"
    const tituloRef = useRef(null); // título "BREAKING BAD" que surge depois do frame 40
    const imagensRef = useRef([]); // cache dos <img> de cada frame
    const frameAtualRef = useRef(0);
    const [carregado, setCarregado] = useState(false);

    // Pré-carrega todos os frames uma vez (igual comeco.jsx).
    useEffect(() => {
        let concluidos = 0;
        let falhas = 0;
        const imagens = [];

        const checar = () => {
            concluidos++;
            if (concluidos === FRAME_COUNT) {
                if (falhas > 0) {
                    console.error(
                        `[Tv] ${falhas} de ${FRAME_COUNT} frames falharam ao carregar. ` +
                        `Confirma se os arquivos existem em /public/frames/frame_0001.jpg até frame_${String(FRAME_COUNT).padStart(4, "0")}.jpg`
                    );
                }
                setCarregado(true);
            }
        };

        for (let i = 1; i <= FRAME_COUNT; i++) {
            const img = new Image();
            img.src = FRAME_PATH(i);
            img.onload = checar;
            img.onerror = () => {
                falhas++;
                console.error(`[Tv] falha ao carregar ${FRAME_PATH(i)}`);
                checar();
            };
            imagens.push(img);
        }

        imagensRef.current = imagens;
    }, []);

    // Desenha um frame no canvas com "cover fit" (preenche sem distorcer).
    const desenharFrame = (indice) => {
        const canvas = canvasRef.current;
        const img = imagensRef.current[indice];
        if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

        const ctx = canvas.getContext("2d");
        const larguraCanvas = canvas.width;
        const alturaCanvas = canvas.height;
        const proporcaoImg = img.width / img.height;
        const proporcaoCanvas = larguraCanvas / alturaCanvas;

        let larguraDesenho, alturaDesenho, offsetX, offsetY;

        if (proporcaoImg > proporcaoCanvas) {
            alturaDesenho = alturaCanvas;
            larguraDesenho = alturaDesenho * proporcaoImg;
            offsetX = (larguraCanvas - larguraDesenho) / 2;
            offsetY = 0;

            // Mobile: a partir do DESLOCAMENTO_MOBILE_FRAME_INICIO, puxa o
            // enquadramento pra esquerda (offsetX mais negativo = imagem
            // "anda" pra esquerda dentro do canvas). Clampado pra nunca
            // sobrar espaço vazio na direita.
            const ehMobile = window.innerWidth <= MOBILE_BREAKPOINT;
            if (ehMobile) {
                const progresso = clamp01(
                    (indice - DESLOCAMENTO_MOBILE_FRAME_INICIO) / DESLOCAMENTO_MOBILE_FRAME_DURACAO
                );
                const overflowX = larguraDesenho - larguraCanvas;
                const deslocamentoMax = overflowX * DESLOCAMENTO_MOBILE_FRACAO;
                offsetX -= deslocamentoMax * progresso;
                offsetX = Math.max(offsetX, larguraCanvas - larguraDesenho);
            }
        } else {
            larguraDesenho = larguraCanvas;
            alturaDesenho = larguraDesenho / proporcaoImg;
            offsetX = 0;
            offsetY = (alturaCanvas - alturaDesenho) / 2;
        }

        ctx.clearRect(0, 0, larguraCanvas, alturaCanvas);
        ctx.drawImage(img, offsetX, offsetY, larguraDesenho, alturaDesenho);

        // Escurece um pouco o frame (overlay preto translúcido por cima),
        // sem precisar reprocessar as imagens no disco.
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(0, 0, larguraCanvas, alturaCanvas);
    };

    useEffect(() => {
        const trilho = trilhoScrollRef.current;
        const secao = secaoRef.current;
        const painel = painelRef.current;
        const canvas = canvasRef.current;
        const aviso = avisoRef.current;
        const titulo = tituloRef.current;
        if (!trilho || !secao || !painel || !canvas || !aviso || !titulo) return;

        trilho.style.height = `calc(100vh + ${ALTURA_TOTAL}px)`;
        // Só a ESPERA é "roubada" do fim do jogos (os últimos 400px = a fase
        // p9b, em que o modelo do GTA volta pro centro). Assim o painel do TV
        // começa a entrar da direita exatamente quando o GTA chega ao centro,
        // e não antes. Entrada + vídeo acontecem depois do jogos terminar.
        trilho.style.marginTop = `calc(-100vh - ${ALTURA_ESPERA}px)`;

        const redimensionarCanvas = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            desenharFrame(frameAtualRef.current);
        };
        redimensionarCanvas();

        // A rolagem real acontece dentro do container ".pagina" (Sobremim.jsx
        // usa overflow no próprio div, não na window).
        const scroller = secao.closest(".pagina") || window;

        let frame = 0;

        const aplicar = () => {
            frame = 0;
            const rect = trilho.getBoundingClientRect();
            const alturaTela = secao.offsetHeight || window.innerHeight;
            const percorrido = -rect.top;
            const total = Math.max(rect.height - alturaTela, 1);
            const p = clamp01(percorrido / total);

            // 1) espera: enquanto p < FRACAO_ESPERA o painel fica 100% fora da
            //    tela (à direita) — é o tempo da descrição do GTA subir.
            // 2) entrada: só então ele desliza de 100% até 0.
            const pEntrada = clamp01(
                (p - FRACAO_ESPERA) / Math.max(FRACAO_ENTRADA - FRACAO_ESPERA, 0.0001)
            );
            painel.style.transform = `translate3d(${(1 - pEntrada) * 100}%, 0, 0)`;
            painel.style.opacity = 1;

            // 3) vídeo: com o painel já 100% dentro da tela, o restante do
            //    scroll avança pelos frames — cada milímetro de scroll puxa o
            //    vídeo pra frente ou pra trás, sem depender de currentTime.
            const pVideo = clamp01(
                (p - FRACAO_ENTRADA) / Math.max(1 - FRACAO_ENTRADA, 0.0001)
            );
            const indiceFrame = Math.min(
                FRAME_COUNT - 1,
                Math.round(pVideo * (FRAME_COUNT - 1))
            );
            if (indiceFrame !== frameAtualRef.current) {
                frameAtualRef.current = indiceFrame;
                desenharFrame(indiceFrame);
            }

            // Aviso "role para continuar": só aparece quando o painel já
            // encostou de vez na parede esquerda (fim da entrada) e some
            // assim que o vídeo começa a andar, pra não ficar sobreposto
            // ao vídeo depois disso.
            const chegouNaParede = clamp01((pEntrada - 0.97) / 0.03);
            const aindaNoComecoDoVideo = 1 - clamp01(pVideo / 0.04);
            aviso.style.opacity = chegouNaParede * aindaNoComecoDoVideo;

            // Título "BREAKING BAD": surge (fade-in) a partir do
            // TITULO_FRAME_INICIO, acompanhando o índice contínuo do vídeo
            // (não o frame arredondado) pra ficar suave mesmo entre um
            // frame de imagem e outro.
            const indiceContinuo = pVideo * (FRAME_COUNT - 1);
            const progressoTitulo = clamp01(
                (indiceContinuo - TITULO_FRAME_INICIO) / TITULO_FRAME_DURACAO
            );

            // Subida: do meio da tela até a parte superior.
            const progressoSubida = easeInOut(
                clamp01((pVideo - SUBIDA_INICIO) / Math.max(SUBIDA_FIM - SUBIDA_INICIO, 0.0001))
            );
            const fracaoY = lerp(TITULO_Y_MEIO, TITULO_Y_TOPO, progressoSubida);
            // Enquanto nasce da fumaça o texto fica desfocado e um pouco
            // maior; ao subir ele "endurece" e encolhe levemente.
            const desfoque = (1 - progressoTitulo) * 18;
            const escala = lerp(1.12, 1, progressoTitulo) * lerp(1, 0.82, progressoSubida);

            titulo.style.opacity = progressoTitulo;
            titulo.style.top = `${fracaoY * 100}%`;
            titulo.style.transform = `translate(-50%, -50%) scale(${escala})`;
            titulo.style.filter = `blur(${desfoque}px)`;
        };

        const agendar = () => {
            if (frame) return;
            frame = requestAnimationFrame(aplicar);
        };

        aplicar();
        scroller.addEventListener("scroll", agendar, { passive: true });
        window.addEventListener("resize", redimensionarCanvas);
        window.addEventListener("resize", agendar);

        return () => {
            if (frame) cancelAnimationFrame(frame);
            scroller.removeEventListener("scroll", agendar);
            window.removeEventListener("resize", redimensionarCanvas);
            window.removeEventListener("resize", agendar);
        };
    }, []);

    // Assim que os frames terminam de carregar, garante que o frame certo
    // (conforme a posição de scroll atual) já aparece desenhado.
    useEffect(() => {
        if (!carregado) return;
        desenharFrame(frameAtualRef.current);
    }, [carregado]);

    return (
        <div className="tv-trilho-scroll" ref={trilhoScrollRef}>
            <div className="tv-secao" ref={secaoRef}>
                <div className="tv-painel" ref={painelRef}>
                    <canvas className="tv-canvas" ref={canvasRef} />
                    <h2 className="tv-breakingbad-titulo" ref={tituloRef}>
                        Breaking Bad
                    </h2>
                    <div className="tv-aviso-scroll" ref={avisoRef}>
                        <span className="tv-aviso-scroll-icone" />
                        <span className="tv-aviso-scroll-texto">role para continuar</span>
                    </div>
                </div>
            </div>
        </div>
    );
}