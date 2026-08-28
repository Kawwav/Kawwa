import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./tv.css";

// Seção que entra DEPOIS do jogos.jsx (logo após a fase do GTA).
// Mesma mecânica sticky de sempre: wrapper alto dá o espaço de scroll e a
// seção gruda no topo do scroller (.pagina) via position:sticky.
//
// Timeline (tudo no MESMO trilho de scroll):
// 1) espera     — painel 100% fora da tela
// 2) entrada    — painel desliza da direita pra esquerda até cobrir a tela
// 3) vídeo      — scroll "toca" o vídeo frame a frame (frames 0 -> 183)
// 4) horizontal — a partir do frame 183 aparece o TÍTULO GIGANTE "BREAKING
//    BAD" desenhado no próprio canvas: uma folha preta cobre a tela e o
//    vídeo só aparece DENTRO das letras. Como a palavra é muito maior que a
//    tela, o scroll vira horizontal: a palavra corre da esquerda pra direita
//    enquanto os frames continuam avançando (183 -> fim).
//
// Frames em /public/frames:
//   ffmpeg -i video.mp4 -vf "scale=1600:-2" -q:v 3 public/frames/frame_%04d.jpg

const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Suavização do scroll: em vez de desenhar direto na posição crua do
// scroll (que só atualiza quando o navegador dispara o evento "scroll",
// de forma irregular), a gente mede o alvo a cada frame e faz o valor
// "perseguir" esse alvo com um pouco de atraso. Isso roda dentro de um
// loop de requestAnimationFrame contínuo (sincronizado com o refresh do
// monitor), então a animação fica extremamente fluida e "gruda" a 60fps
// (ou mais, em telas de maior taxa), com uma sensação leve de inércia.
// Quanto MAIOR o número, mais rápido gruda no scroll real (menos atraso).
// Quanto MENOR, mais gostoso/lento fica o "arrasto".
const SUAVIZACAO_SCROLL = 7;

const FRAME_COUNT = 253;
const FRAME_PATH = (i) =>
    `${import.meta.env.BASE_URL}frames/frame_${String(i).padStart(4, "0")}.jpg`;

// A partir deste frame o título gigante entra e o scroll vira horizontal.
const FRAME_MASCARA = 183;
// Quantos frames dura o fade da "folha preta" recortada pelo texto.
const MASCARA_FADE_FRAMES = 18;

const TITULO = "BREAKING BAD";
const TITULO_FONTE = "'Breaking Bad', 'Archivo Black', Impact, sans-serif";
// Altura da fonte em fração da altura do canvas.
const TITULO_ALTURA = 0.78;
// Margem lateral (fração da largura) nas pontas do percurso horizontal.
const TITULO_MARGEM = 0.06;
// O título nasce com um zoom enorme e diminui até o tamanho normal.
// Fração do trecho horizontal dedicada a esse "zoom out".
const TITULO_ZOOM_FRACAO = 0.32;
// Escala inicial do título (vezes o tamanho normal).
const TITULO_ZOOM_INICIAL = 7;
// FINAL: quando a palavra chega no fim do percurso, a câmera dá um zoom no
// "D" de BAD até a folha preta sumir e o vídeo aparecer inteiro de novo.
// Fração final do trecho horizontal dedicada a esse zoom-in.
const TITULO_ZOOM_FINAL_FRACAO = 0.3;
// Escala máxima do título nesse zoom final.
const TITULO_ZOOM_FINAL = 9;
// A partir de qual ponto do zoom final a folha preta começa a sumir.
const FOLHA_SUMIR_INICIO = 0.55;

// Scroll (px) de cada etapa.
const ALTURA_ESPERA = 400;
const ALTURA_ENTRADA = 700;
// Trecho vertical "normal" do vídeo: frames 0 -> FRAME_MASCARA.
const ALTURA_VIDEO = 2400;
// Trecho horizontal: frames FRAME_MASCARA -> fim, com a palavra correndo.
const ALTURA_HORIZONTAL = 3200;
const ALTURA_TOTAL =
    ALTURA_ESPERA + ALTURA_ENTRADA + ALTURA_VIDEO + ALTURA_HORIZONTAL;

const FRACAO_ESPERA = ALTURA_ESPERA / ALTURA_TOTAL;
const FRACAO_ENTRADA = (ALTURA_ESPERA + ALTURA_ENTRADA) / ALTURA_TOTAL;
// Onde, dentro do trecho de vídeo (pVideo), acaba a parte vertical e começa
// a horizontal.
const FRACAO_VIDEO_VERTICAL = ALTURA_VIDEO / (ALTURA_VIDEO + ALTURA_HORIZONTAL);

// Referência de proporção (largura/altura) acima da qual o título usa o
// tamanho "cheio". Abaixo disso (telas estreitas/retrato, tipo celular) o
// título e o zoom inicial são reduzidos proporcionalmente — ver
// `fatorTelaEstreita` em desenharMascaraTitulo.
const PROPORCAO_TELA_LARGA = 1.3;
const PROPORCAO_TELA_ESTREITA = 0.5;
const TITULO_ALTURA_MOBILE = 0.42;
const TITULO_ZOOM_INICIAL_MOBILE = 3;

// ===== THE OFFICE — mesmo esquema do BREAKING BAD =====
// Trilho sticky: os vídeos ficam de fundo (mosaico cobrindo a tela) e uma
// folha preta por cima é FURADA pelo texto "THE OFFICE" — então o vídeo só
// aparece dentro das letras. O scroll vira horizontal: primeiro um zoom-out
// (a palavra nasce gigante) e depois ela corre da esquerda pra direita.
const OFFICE_TITULO = "THE OFFICE";
const OFFICE_ALTURA_SCROLL = 3000;
const OFFICE_ALTURA_TEXTO = 0.78;
const OFFICE_ALTURA_TEXTO_MOBILE = 0.42;
const OFFICE_MARGEM = 0.06;
const OFFICE_ZOOM_FRACAO = 0.32;
const OFFICE_ZOOM_INICIAL = 15;
const OFFICE_ZOOM_INICIAL_MOBILE = 6;
// Fração inicial do percurso em que a folha preta nasce transparente e vai
// fechando (evita o "espaço preto" nas laterais logo no início, quando a
// letra ainda está gigante e o traço dela não cobre a tela toda).
const OFFICE_ENTRADA_FRACAO = 0.06;
// FINAL (igual ao BREAKING BAD): no fim do percurso a câmera dá um zoom na
// ÚLTIMA letra ("E" de OFFICE) até a folha preta sumir e o vídeo aparecer
// inteiro de novo.
const OFFICE_ZOOM_FINAL_FRACAO = 0.3;
const OFFICE_ZOOM_FINAL = 9;
const OFFICE_FOLHA_SUMIR_INICIO = 0.55;

// Vídeos do The Office: toca UM de cada vez; quando o vídeo acaba, troca
// para o próximo.
const OFFICE_VIDEOS = [
    "theoffice1.mp4",
    "theoffice2.mp4",
    "theoffice3.mp4",
    "theoffice4.mp4",
];

// ===== FILMES =====
// Depois do THE OFFICE o scroll volta ao normal e entra esta tela: os nomes
// dos filmes ficam na direita, um embaixo do outro. Quando o nome passa pelo
// meio da tela, abre o quadrado à esquerda (por enquanto só com o nome
// dentro — é ali que depois entra o modelo 3D).
const FILMES = [
    "De volta para o futuro",
    "o profissional",
    "Toy Story",
    "Homem aranha",

];

// Um modelo 3D (.glb) pra cada filme, NA MESMA ORDEM do array acima.
// Os arquivos ficam junto dos outros assets em /public (mesmo esquema dos
// vídeos do THE OFFICE, que são referenciados direto pelo nome).
const MODELOS_FILMES = [
    "Devoltaparaofuturo.glb", 
    "oprofissional.glb",     
    "ToyStory.glb",         
    "Homemaranha.glb",      
];

// Tamanho (maior lado) que cada modelo ocupa depois de centralizado, em
// unidades da cena — controla o "zoom" do modelo dentro do quadrado.
const MODELO_TAMANHO_ALVO = 1.7;

// FILMES — o modelo 3D ativo gira sutilmente acompanhando o mouse (desktop)
// ou a inclinação do celular (mobile, via giroscópio). Nada de arrastar:
// é só o cursor/tilt "olhando" o modelo de ângulos levemente diferentes.
// Amplitude máxima de rotação (radianos) por eixo.
const FILMES_ROT_MOUSE_MAX_Y = 0.5; // olhar esquerda/direita (mouse X)
const FILMES_ROT_MOUSE_MAX_X = 0.25; // olhar cima/baixo (mouse Y)
const FILMES_ROT_GIRO_MAX_Y = 0.6; // esquerda/direita (celular deitando pros lados)
const FILMES_ROT_GIRO_MAX_X = 0.3; // cima/baixo (celular inclinando pra frente/trás)
// Quantos graus de inclinação do celular equivalem à amplitude máxima acima.
const FILMES_GIRO_GRAUS_MAXIMOS = 30;
// Suavização do "perseguir o alvo" a cada frame (0-1): quanto maior, mais
// rápido o modelo alcança o ângulo alvo; quanto menor, mais gostoso/lento.
const FILMES_ROT_SUAVIZACAO = 0.08;




export default function Tv() {
    const trilhoScrollRef = useRef(null);
    const secaoRef = useRef(null);
    const painelRef = useRef(null);
    const canvasRef = useRef(null);
    const avisoRef = useRef(null);
    const imagensRef = useRef([]);
    const frameAtualRef = useRef(0);
    const officeTrilhoRef = useRef(null);
    const officeSecaoRef = useRef(null);
    const officeCanvasRef = useRef(null);
    const officeVideosRef = useRef([]);
    const officeMascaraRef = useRef(null);
    // Estado contínuo da fase horizontal (0 = título nascendo, 1 = fim do
    // percurso). Guardado em ref porque quem desenha é o rAF.
    const estadoRef = useRef({ indiceContinuo: 0, pHorizontal: 0 });
    const [carregado, setCarregado] = useState(false);
    // Qual vídeo do The Office está tocando agora. Só UM aparece por vez:
    // quando ele acaba (evento `ended`), passa para o próximo.
    const [officeVideoAtual, setOfficeVideoAtual] = useState(0);
    // FILMES: lista simples de nomes. O que estiver no meio da tela vira o
    // "ativo" e abre o quadrado (onde depois entra o modelo 3D).
    const filmesItensRef = useRef([]);
    const [filmeAtivo, setFilmeAtivo] = useState(null);
    // Canvas onde os modelos 3D são desenhados, dentro do quadrado.
    const filmesCanvasRef = useRef(null);
    // Guarda scene/camera/renderer/grupos (um grupo por filme, cada um com
    // seu modelo já centralizado). Só o grupo do filme ativo fica visível.
    const filmesCenaRef = useRef(null);
    // Rotação "alvo" (pra onde o modelo deve olhar agora, conforme
    // mouse/giroscópio) e rotação "atual" (o que de fato é aplicado no
    // modelo, perseguindo o alvo aos poucos pra ficar suave).
    const filmesRotAlvoRef = useRef({ x: 0, y: 0 });
    const filmesRotAtualRef = useRef({ x: 0, y: 0 });
    // Primeira leitura do giroscópio vira o "zero" — o resto é calculado
    // como diferença a partir dela, senão o modelo nasceria torto
    // dependendo de como a pessoa está segurando o celular.
    const filmesGiroBaseRef = useRef(null);

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
                        `Confirma se existem /public/frames/frame_0001.jpg até frame_${String(FRAME_COUNT).padStart(4, "0")}.jpg`
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
                checar();
            };
            imagens.push(img);
        }

        imagensRef.current = imagens;
    }, []);

    // Canvas auxiliar (offscreen) onde a "folha preta" é recortada pelo
    // texto. Depois ela é desenhada por cima do frame: onde tem letra, o
    // buraco deixa o vídeo aparecer.
    const mascaraRef = useRef(null);

    const desenharFrame = (indice) => {
        const canvas = canvasRef.current;
        const img = imagensRef.current[indice];
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const larguraCanvas = canvas.width;
        const alturaCanvas = canvas.height;

        ctx.clearRect(0, 0, larguraCanvas, alturaCanvas);

        if (img && img.complete && img.naturalWidth !== 0) {
            const proporcaoImg = img.width / img.height;
            const proporcaoCanvas = larguraCanvas / alturaCanvas;

            let larguraDesenho, alturaDesenho, offsetX, offsetY;

            if (proporcaoImg > proporcaoCanvas) {
                alturaDesenho = alturaCanvas;
                larguraDesenho = alturaDesenho * proporcaoImg;
                // Centralizado sempre (sem deslocamento extra) — a imagem
                // fica parada em todas as telas, só o "cover fit" corta as
                // sobras das laterais.
                offsetX = (larguraCanvas - larguraDesenho) / 2;
                offsetY = 0;
            } else {
                larguraDesenho = larguraCanvas;
                alturaDesenho = larguraDesenho / proporcaoImg;
                offsetX = 0;
                offsetY = (alturaCanvas - alturaDesenho) / 2;
            }

            ctx.drawImage(img, offsetX, offsetY, larguraDesenho, alturaDesenho);
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(0, 0, larguraCanvas, alturaCanvas);

        desenharMascaraTitulo(ctx, larguraCanvas, alturaCanvas);
    };

    // Desenha a folha preta com o "BREAKING BAD" recortado nela.
    const desenharMascaraTitulo = (ctx, largura, altura) => {
        const { indiceContinuo, pHorizontal } = estadoRef.current;
        const opacidade = clamp01(
            (indiceContinuo - FRAME_MASCARA) / MASCARA_FADE_FRAMES
        );
        if (opacidade <= 0) return;

        if (!mascaraRef.current) mascaraRef.current = document.createElement("canvas");
        const mascara = mascaraRef.current;
        if (mascara.width !== largura || mascara.height !== altura) {
            mascara.width = largura;
            mascara.height = altura;
        }
        const mctx = mascara.getContext("2d");
        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.clearRect(0, 0, largura, altura);

        // 1) folha preta cobrindo tudo
        mctx.globalCompositeOperation = "source-over";
        mctx.fillStyle = "#000";
        mctx.fillRect(0, 0, largura, altura);

        // 2) fura a folha com o texto gigante -> o vídeo aparece dentro das letras
        // Fase 1 do título: ZOOM. Ele nasce gigantesco (centrado na tela) e
        // diminui até o tamanho normal. Como nessa escala a palavra é muito
        // maior que a tela, o centro preenche tudo e o vídeo aparece só
        // dentro das letras.
        const p = clamp01(pHorizontal);
        const pZoom = clamp01(p / TITULO_ZOOM_FRACAO);

        // Em telas estreitas (celular, retrato) a altura do canvas é
        // parecida com a do desktop, mas a largura é bem menor — então
        // usar TITULO_ALTURA/TITULO_ZOOM_INICIAL fixos deixava o "B"
        // ocupando muito mais que a largura da tela (título "gigante").
        // Aqui a gente reduz a altura-base do título e o zoom inicial
        // conforme a tela fica mais estreita, de forma contínua (sem
        // "pulo" num breakpoint fixo).
        const proporcaoTela = largura / altura;
        const fatorTelaEstreita = clamp01(
            (PROPORCAO_TELA_LARGA - proporcaoTela) /
            (PROPORCAO_TELA_LARGA - PROPORCAO_TELA_ESTREITA)
        );
        const tituloAltura = lerp(TITULO_ALTURA, TITULO_ALTURA_MOBILE, fatorTelaEstreita);
        const zoomInicial = lerp(TITULO_ZOOM_INICIAL, TITULO_ZOOM_INICIAL_MOBILE, fatorTelaEstreita);

        // Fase 3 (FINAL): depois que a palavra termina o percurso, dá um
        // zoom-in no "D" de BAD até a folha preta sumir e o vídeo voltar a
        // aparecer inteiro.
        const inicioFinal = 1 - TITULO_ZOOM_FINAL_FRACAO;
        const pFinal = clamp01(
            (p - inicioFinal) / Math.max(TITULO_ZOOM_FINAL_FRACAO, 0.0001)
        );
        const escalaFinal = lerp(1, TITULO_ZOOM_FINAL, easeInOut(pFinal));
        const escala = lerp(zoomInicial, 1, easeInOut(pZoom)) * escalaFinal;

        const tamanhoFonte = altura * tituloAltura * escala;
        mctx.font = `900 ${tamanhoFonte}px ${TITULO_FONTE}`;
        mctx.textBaseline = "middle";
        mctx.textAlign = "left";
        const larguraTexto = mctx.measureText(TITULO).width;

        // Percurso horizontal: começa com o início da palavra encostado na
        // margem esquerda e termina com o fim da palavra na margem direita.
        // O texto fica PARADO no centro durante todo o zoom (vem "reto") e
        // só começa a correr para o lado DEPOIS que o zoom termina.
        const margem = largura * TITULO_MARGEM;
        const inicioX = margem;
        const fimX = largura - margem - larguraTexto;
        const pViagem = clamp01(
            (p - TITULO_ZOOM_FRACAO) /
            Math.max(inicioFinal - TITULO_ZOOM_FRACAO, 0.0001)
        );
        const xViagem = lerp(inicioX, fimX, easeInOut(pViagem));
        // Âncora do zoom: o "B" de BREAKING, não o centro da palavra inteira
        // (senão em escala gigante quem aparece na tela é o meio da palavra,
        // tipo o "I"). Mede só a primeira letra na escala atual e usa a
        // metade dela pra manter o "B" centralizado na tela enquanto o resto
        // da palavra vai sendo revelado pra direita conforme o zoom diminui.
        const larguraB = mctx.measureText(TITULO[0]).width;
        const xAncoraB = (largura / 2) - (larguraB / 2);
        // Enquanto o zoom não terminou (pZoom < 1), x fica travado nessa
        // âncora do "B". Depois do zoom, o x salta suavemente da âncora
        // para o início do percurso e acompanha a viagem horizontal.
        const zoomTerminado = pZoom >= 1;
        let x = zoomTerminado
            ? lerp(xAncoraB, xViagem, clamp01(pViagem * 4)) // transição curta âncora -> trilho
            : xAncoraB;

        // No zoom final, a âncora vira o "D" (última letra): ele fica
        // centralizado na tela enquanto cresce. Levemente deslocado para a
        // direita para evitar o buraco do "D".
        if (pFinal > 0) {
            const antesDoD = mctx.measureText(TITULO.slice(0, -1)).width;
            const larguraD = mctx.measureText(TITULO[TITULO.length - 1]).width;
            const xAncoraD = (largura / 2) - antesDoD - (larguraD / 2) + larguraD * 0.28;
            x = lerp(x, xAncoraD, clamp01(pFinal * 4));
        }

        mctx.globalCompositeOperation = "destination-out";
        mctx.fillStyle = "#000";
        mctx.fillText(TITULO, x, altura / 2);

        // 3) aplica a folha por cima do frame — no fim do zoom no "D" ela
        // some de vez e o vídeo volta a aparecer inteiro.
        const sumico = clamp01(
            (pFinal - FOLHA_SUMIR_INICIO) / Math.max(1 - FOLHA_SUMIR_INICIO, 0.0001)
        );
        const opacidadeFolha = opacidade * (1 - sumico);
        if (opacidadeFolha <= 0) return;
        ctx.save();
        ctx.globalAlpha = opacidadeFolha;
        ctx.drawImage(mascara, 0, 0);
        ctx.restore();
    };

    useEffect(() => {
        const trilho = trilhoScrollRef.current;
        const secao = secaoRef.current;
        const painel = painelRef.current;
        const canvas = canvasRef.current;
        const aviso = avisoRef.current;
        if (!trilho || !secao || !painel || !canvas || !aviso) return;

        trilho.style.height = `calc(100vh + ${ALTURA_TOTAL}px)`;
        trilho.style.marginTop = `calc(-100vh - ${ALTURA_ESPERA}px)`;

        const redimensionarCanvas = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            desenharFrame(frameAtualRef.current);
        };
        redimensionarCanvas();

        // pAlvo = posição crua do scroll (medida a cada frame).
        // pSuave = valor que de fato é usado pra desenhar — persegue o
        // pAlvo com atraso, dando a sensação de scroll fluido/inercial.
        let pAlvo = 0;
        let pSuave = 0;
        let ultimoTempo = performance.now();
        let rafId = 0;

        const aplicar = (p) => {
            const pEntrada = clamp01(
                (p - FRACAO_ESPERA) / Math.max(FRACAO_ENTRADA - FRACAO_ESPERA, 0.0001)
            );
            painel.style.transform = `translate3d(${(1 - pEntrada) * 100}%, 0, 0)`;
            painel.style.opacity = 1;

            const pVideo = clamp01(
                (p - FRACAO_ENTRADA) / Math.max(1 - FRACAO_ENTRADA, 0.0001)
            );

            // Mapeamento do scroll -> frame em duas partes: a vertical vai
            // até o FRAME_MASCARA e a horizontal cobre o resto dos frames
            // (com bem mais scroll, porque a palavra precisa atravessar).
            let indiceContinuo;
            let pHorizontal;
            if (pVideo <= FRACAO_VIDEO_VERTICAL) {
                const pA = pVideo / FRACAO_VIDEO_VERTICAL;
                indiceContinuo = pA * FRAME_MASCARA;
                pHorizontal = 0;
            } else {
                pHorizontal = clamp01(
                    (pVideo - FRACAO_VIDEO_VERTICAL) /
                    Math.max(1 - FRACAO_VIDEO_VERTICAL, 0.0001)
                );
                indiceContinuo =
                    FRAME_MASCARA + pHorizontal * (FRAME_COUNT - 1 - FRAME_MASCARA);
            }

            estadoRef.current = { indiceContinuo, pHorizontal };

            const indiceFrame = Math.min(FRAME_COUNT - 1, Math.round(indiceContinuo));
            frameAtualRef.current = indiceFrame;
            // Com o progresso já suavizado, o índice contínuo muda um
            // pouquinho a cada frame do loop (mesmo parado o dedo/mouse
            // rolando), então redesenha sempre — é isso que dá a sensação
            // de vídeo "escorregando" em vez de pular de frame em frame.
            desenharFrame(indiceFrame);

            const chegouNaParede = clamp01((pEntrada - 0.97) / 0.03);
            const aindaNoComecoDoVideo = 1 - clamp01(pVideo / 0.04);
            aviso.style.opacity = chegouNaParede * aindaNoComecoDoVideo;
        };

        const medirAlvo = () => {
            const rect = trilho.getBoundingClientRect();
            const alturaTela = secao.offsetHeight || window.innerHeight;
            const total = Math.max(rect.height - alturaTela, 1);
            pAlvo = clamp01(-rect.top / total);
        };

        // Loop contínuo (não depende do evento "scroll", que dispara de
        // forma irregular): a cada frame de tela mede o alvo real e
        // aproxima pSuave dele de forma suave e independente de fps
        // (usando o delta de tempo real entre frames).
        const loop = (tempo) => {
            const dt = Math.min((tempo - ultimoTempo) / 1000, 0.1);
            ultimoTempo = tempo;

            medirAlvo();

            const fator = 1 - Math.exp(-SUAVIZACAO_SCROLL * dt);
            pSuave += (pAlvo - pSuave) * fator;
            if (Math.abs(pAlvo - pSuave) < 0.0002) pSuave = pAlvo;

            aplicar(pSuave);

            rafId = requestAnimationFrame(loop);
        };

        medirAlvo();
        pSuave = pAlvo;
        aplicar(pSuave);
        rafId = requestAnimationFrame(loop);

        window.addEventListener("resize", redimensionarCanvas);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener("resize", redimensionarCanvas);
        };
    }, []);

    useEffect(() => {
        if (!carregado) return;
        desenharFrame(frameAtualRef.current);
    }, [carregado]);

    // THE OFFICE: trilho sticky com scroll horizontal. A folha preta é
    // furada pelo texto (destination-out), então o mosaico de vídeos que
    // está atrás do canvas aparece só dentro das letras — igual ao
    // BREAKING BAD.
    useEffect(() => {
        const trilhoOffice = officeTrilhoRef.current;
        const secaoOffice = officeSecaoRef.current;
        const canvasOffice = officeCanvasRef.current;
        if (!trilhoOffice || !secaoOffice || !canvasOffice) return;

        trilhoOffice.style.height = `calc(100vh + ${OFFICE_ALTURA_SCROLL}px)`;

        const ctx = canvasOffice.getContext("2d");
        // progresso = valor SUAVIZADO (o que de fato é desenhado).
        // progressoAlvo = posição crua do scroll, medida a cada frame.
        let progresso = 0;
        let progressoAlvo = 0;

        const desenhar = () => {
            const largura = canvasOffice.width;
            const altura = canvasOffice.height;
            if (!largura || !altura) return;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, largura, altura);

            // Folha preta desenhada num canvas auxiliar: assim dá pra
            // aplicá-la com opacidade (no zoom final ela some).
            if (!officeMascaraRef.current) {
                officeMascaraRef.current = document.createElement("canvas");
            }
            const mascara = officeMascaraRef.current;
            if (mascara.width !== largura || mascara.height !== altura) {
                mascara.width = largura;
                mascara.height = altura;
            }
            const mctx = mascara.getContext("2d");
            mctx.setTransform(1, 0, 0, 1, 0, 0);
            mctx.clearRect(0, 0, largura, altura);
            mctx.globalCompositeOperation = "source-over";
            mctx.fillStyle = "#000";
            mctx.fillRect(0, 0, largura, altura);

            const p = clamp01(progresso);
            const pZoom = clamp01(p / OFFICE_ZOOM_FRACAO);

            const proporcaoTela = largura / altura;
            const fatorTelaEstreita = clamp01(
                (PROPORCAO_TELA_LARGA - proporcaoTela) /
                (PROPORCAO_TELA_LARGA - PROPORCAO_TELA_ESTREITA)
            );
            const alturaTexto = lerp(
                OFFICE_ALTURA_TEXTO, OFFICE_ALTURA_TEXTO_MOBILE, fatorTelaEstreita
            );
            const zoomInicial = lerp(
                OFFICE_ZOOM_INICIAL, OFFICE_ZOOM_INICIAL_MOBILE, fatorTelaEstreita
            );

            // Zoom final na ÚLTIMA letra (igual ao BREAKING BAD).
            const inicioFinal = 1 - OFFICE_ZOOM_FINAL_FRACAO;
            const pFinal = clamp01(
                (p - inicioFinal) / Math.max(OFFICE_ZOOM_FINAL_FRACAO, 0.0001)
            );
            const escalaFinal = lerp(1, OFFICE_ZOOM_FINAL, easeInOut(pFinal));
            const escala = lerp(zoomInicial, 1, easeInOut(pZoom)) * escalaFinal;

            const tamanhoFonte = altura * alturaTexto * escala;
            mctx.font = `900 ${tamanhoFonte}px ${TITULO_FONTE}`;
            mctx.textBaseline = "middle";
            mctx.textAlign = "left";
            const larguraTexto = mctx.measureText(OFFICE_TITULO).width;

            const margem = largura * OFFICE_MARGEM;
            const inicioX = margem;
            const fimX = largura - margem - larguraTexto;
            const pViagem = clamp01(
                (p - OFFICE_ZOOM_FRACAO) /
                Math.max(inicioFinal - OFFICE_ZOOM_FRACAO, 0.0001)
            );
            const xViagem = lerp(inicioX, fimX, easeInOut(pViagem));

            // durante o zoom a primeira letra fica centralizada na tela
            const larguraPrimeira = mctx.measureText(OFFICE_TITULO[0]).width;
            const xAncora = (largura / 2) - (larguraPrimeira / 2);
            let x = pZoom >= 1
                ? lerp(xAncora, xViagem, clamp01(pViagem * 4))
                : xAncora;

            // No zoom final a âncora vira a última letra ("E"), que fica
            // centralizada na tela enquanto cresce.
            if (pFinal > 0) {
                const antesDaUltima = mctx.measureText(OFFICE_TITULO.slice(0, -1)).width;
                const larguraUltima = mctx.measureText(
                    OFFICE_TITULO[OFFICE_TITULO.length - 1]
                ).width;
                const xAncoraFinal =
                    (largura / 2) - antesDaUltima - (larguraUltima / 2) + larguraUltima * 0.28;
                x = lerp(x, xAncoraFinal, clamp01(pFinal * 4));
            }

            // fura a folha com o texto -> o vídeo aparece dentro das letras
            mctx.globalCompositeOperation = "destination-out";
            mctx.fillStyle = "#000";
            mctx.fillText(OFFICE_TITULO, x, altura / 2);
            mctx.globalCompositeOperation = "source-over";

            // no fim do zoom a folha some e o vídeo aparece inteiro; no
            // COMEÇO ela nasce transparente e fecha rápido (evita o
            // "espaço preto" nas laterais enquanto a letra ainda é gigante).
            const sumico = clamp01(
                (pFinal - OFFICE_FOLHA_SUMIR_INICIO) /
                Math.max(1 - OFFICE_FOLHA_SUMIR_INICIO, 0.0001)
            );
            const entrada = clamp01(p / OFFICE_ENTRADA_FRACAO);
            const opacidadeFolha = entrada * (1 - sumico);
            if (opacidadeFolha <= 0) return;
            ctx.save();
            ctx.globalAlpha = opacidadeFolha;
            ctx.drawImage(mascara, 0, 0);
            ctx.restore();
        };


        const redimensionar = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvasOffice.width = canvasOffice.offsetWidth * dpr;
            canvasOffice.height = canvasOffice.offsetHeight * dpr;
            desenhar();
        };

        const medirAlvo = () => {
            const rect = trilhoOffice.getBoundingClientRect();
            const alturaTela = secaoOffice.offsetHeight || window.innerHeight;
            const total = Math.max(rect.height - alturaTela, 1);
            progressoAlvo = clamp01(-rect.top / total);
        };

        let ultimoTempo = performance.now();
        let rafId = 0;

        // Mesmo esquema de suavização do BREAKING BAD: loop contínuo,
        // independente do evento "scroll", perseguindo o alvo real com
        // um pouco de atraso pra ficar liso feito manteiga.
        const loop = (tempo) => {
            const dt = Math.min((tempo - ultimoTempo) / 1000, 0.1);
            ultimoTempo = tempo;

            medirAlvo();

            const fator = 1 - Math.exp(-SUAVIZACAO_SCROLL * dt);
            progresso += (progressoAlvo - progresso) * fator;
            if (Math.abs(progressoAlvo - progresso) < 0.0002) progresso = progressoAlvo;

            desenhar();

            rafId = requestAnimationFrame(loop);
        };

        redimensionar();
        medirAlvo();
        progresso = progressoAlvo;
        desenhar();
        rafId = requestAnimationFrame(loop);

        window.addEventListener("resize", redimensionar);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            window.removeEventListener("resize", redimensionar);
        };
    }, []);

    // Só o vídeo atual toca e fica visível; os outros ficam pausados/zerados.
    useEffect(() => {
        officeVideosRef.current.forEach((video, i) => {
            if (!video) return;
            if (i === officeVideoAtual) {
                video.style.opacity = "1";
                const play = video.play();
                if (play && typeof play.catch === "function") play.catch(() => {});
            } else {
                video.style.opacity = "0";
                video.pause();
                video.currentTime = 0;
            }
        });
    }, [officeVideoAtual]);

    // Quando o vídeo acaba, entra o próximo (e no fim volta pro primeiro).
    const aoTerminarVideo = (i) => {
        if (i !== officeVideoAtual) return;
        setOfficeVideoAtual((atual) => (atual + 1) % OFFICE_VIDEOS.length);
    };

    // FILMES: detecta qual nome está no meio da tela enquanto o scroll
    // desce a lista.
    //
    // IMPORTANTE: quem rola a página aqui é o container customizado
    // ".pagina" (não a window) — por isso um listener de "scroll" na
    // window nunca disparava e o quadrado nunca abria. Usamos o mesmo
    // esquema de rAF contínuo das outras seções (BREAKING BAD / THE
    // OFFICE): a cada frame remedimos a posição real de cada item com
    // getBoundingClientRect (que é sempre relativa ao viewport, não
    // importa qual elemento é o scroller) e atualizamos o ativo.
    useEffect(() => {
        let rafId = 0;
        let ativoAtual = null;

        const loop = () => {
            const meio = window.innerHeight / 2;
            let melhor = null;
            let menorDist = Infinity;
            filmesItensRef.current.forEach((el, i) => {
                if (!el) return;
                const r = el.getBoundingClientRect();
                const centro = r.top + r.height / 2;
                const dist = Math.abs(centro - meio);
                if (dist < menorDist && dist < window.innerHeight * 0.28) {
                    menorDist = dist;
                    melhor = i;
                }
            });
            if (melhor !== ativoAtual) {
                ativoAtual = melhor;
                setFilmeAtivo(melhor);
            }
            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, []);

    // FILMES — modelos 3D: monta UMA cena Three.js só, com um grupo por
    // filme (cada grupo já com o modelo centralizado e escalado dentro
    // dele). Não tem OrbitControls nem loop de animação girando nada — a
    // câmera fica fixa olhando pro centro e só re-renderiza quando o
    // filme ativo muda ou a tela redimensiona. Ou seja: o modelo aparece
    // parado, bem no meio do quadrado.
    useEffect(() => {
        const canvas = filmesCanvasRef.current;
        if (!canvas) return;

        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(0, 0, 4.4);
        camera.lookAt(0, 0, 0);

        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const luzPrincipal = new THREE.DirectionalLight(0xffffff, 1.5);
        luzPrincipal.position.set(3, 5, 4);
        scene.add(luzPrincipal);
        const luzPreenchimento = new THREE.DirectionalLight(0xffffff, 0.55);
        luzPreenchimento.position.set(-4, -1.5, -3);
        scene.add(luzPreenchimento);

        // Um grupo por filme — todos ficam na cena o tempo todo, só a
        // visibilidade alterna (evita recarregar o modelo toda hora).
        const grupos = FILMES.map(() => {
            const grupo = new THREE.Group();
            grupo.visible = false;
            scene.add(grupo);
            return grupo;
        });

        const renderizar = () => renderer.render(scene, camera);

        const ajustarTamanho = () => {
            const largura = canvas.clientWidth || 1;
            const altura = canvas.clientHeight || 1;
            renderer.setSize(largura, altura, false);
            camera.aspect = largura / altura;
            camera.updateProjectionMatrix();
            renderizar();
        };

        // Centraliza o modelo (subtrai o centro da própria geometria) e
        // escala pra caber num tamanho fixo — assim ele nasce sempre
        // bem no meio do quadrado, do mesmo jeito pra qualquer filme,
        // sem depender do tamanho original de cada .glb.
        const centralizarEEscalar = (objeto, grupo) => {
            const caixa = new THREE.Box3().setFromObject(objeto);
            const centro = caixa.getCenter(new THREE.Vector3());
            const tamanho = caixa.getSize(new THREE.Vector3());
            const maiorLado = Math.max(tamanho.x, tamanho.y, tamanho.z) || 1;
            const escala = MODELO_TAMANHO_ALVO / maiorLado;

            objeto.position.sub(centro);
            grupo.scale.setScalar(escala);
            grupo.add(objeto);
        };

        const loader = new GLTFLoader();
        MODELOS_FILMES.forEach((arquivo, i) => {
            loader.load(
                arquivo,
                (gltf) => {
                    centralizarEEscalar(gltf.scene, grupos[i]);
                    renderizar();
                },
                undefined,
                (erro) => {
                    console.error(`[Tv] falhou ao carregar o modelo "${arquivo}"`, erro);
                }
            );
        });

        filmesCenaRef.current = { renderer, scene, camera, grupos, renderizar };

        ajustarTamanho();
        window.addEventListener("resize", ajustarTamanho);

        return () => {
            window.removeEventListener("resize", ajustarTamanho);
            renderer.dispose();
            filmesCenaRef.current = null;
        };
    }, []);

    // Troca qual grupo (filme) fica visível conforme o item ativo muda —
    // e re-renderiza um frame único (sem loop, sem girar).
    useEffect(() => {
        const cena = filmesCenaRef.current;
        if (!cena) return;
        cena.grupos.forEach((grupo, i) => {
            grupo.visible = i === filmeAtivo;
        });
        cena.renderizar();
    }, [filmeAtivo]);


    // FILMES — captura o mouse (desktop) e a inclinação do celular
    // (mobile, via DeviceOrientationEvent) e guarda só o ALVO da rotação.
    // Quem de fato aplica no modelo é o loop de suavização logo abaixo.
    useEffect(() => {
        const aoMoverMouse = (e) => {
            const nx = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
            const ny = (e.clientY / window.innerHeight) * 2 - 1; // -1..1
            filmesRotAlvoRef.current = {
                y: nx * FILMES_ROT_MOUSE_MAX_Y,
                x: ny * FILMES_ROT_MOUSE_MAX_X,
            };
        };

        const aoInclinar = (e) => {
            if (e.beta === null || e.gamma === null) return;
            if (!filmesGiroBaseRef.current) {
                filmesGiroBaseRef.current = { beta: e.beta, gamma: e.gamma };
            }
            const base = filmesGiroBaseRef.current;
            const deltaGamma = e.gamma - base.gamma; // inclinar pros lados
            const deltaBeta = e.beta - base.beta; // inclinar pra frente/trás
            const nx = clamp(deltaGamma / FILMES_GIRO_GRAUS_MAXIMOS, -1, 1);
            const ny = clamp(deltaBeta / FILMES_GIRO_GRAUS_MAXIMOS, -1, 1);
            filmesRotAlvoRef.current = {
                y: nx * FILMES_ROT_GIRO_MAX_Y,
                x: ny * FILMES_ROT_GIRO_MAX_X,
            };
        };

        // iOS 13+ exige permissão explícita pro giroscópio, e ela só pode
        // ser pedida dentro de um gesto do usuário (por isso o listener de
        // toque/clique abaixo, em vez de pedir direto no mount).
        const pedirGiroscopio = () => {
            const DOE = window.DeviceOrientationEvent;
            if (DOE && typeof DOE.requestPermission === "function") {
                DOE.requestPermission()
                    .then((resposta) => {
                        if (resposta === "granted") {
                            window.addEventListener("deviceorientation", aoInclinar);
                        }
                    })
                    .catch(() => {});
            } else if (window.DeviceOrientationEvent) {
                // Android e navegadores que não pedem permissão explícita.
                window.addEventListener("deviceorientation", aoInclinar);
            }
        };
        const aoPrimeiraInteracao = () => {
            pedirGiroscopio();
            window.removeEventListener("touchstart", aoPrimeiraInteracao);
            window.removeEventListener("click", aoPrimeiraInteracao);
        };

        window.addEventListener("mousemove", aoMoverMouse);
        window.addEventListener("touchstart", aoPrimeiraInteracao, { once: true });
        window.addEventListener("click", aoPrimeiraInteracao, { once: true });

        return () => {
            window.removeEventListener("mousemove", aoMoverMouse);
            window.removeEventListener("deviceorientation", aoInclinar);
            window.removeEventListener("touchstart", aoPrimeiraInteracao);
            window.removeEventListener("click", aoPrimeiraInteracao);
        };
    }, []);

    // FILMES — loop contínuo que faz a rotação ATUAL perseguir o alvo
    // (mouse/giroscópio) suavemente e aplica no grupo do filme ativo.
    useEffect(() => {
        let rafId;
        const loop = () => {
            const cena = filmesCenaRef.current;
            const grupoAtivo =
                cena && filmeAtivo !== null ? cena.grupos[filmeAtivo] : null;

            if (grupoAtivo) {
                const alvo = filmesRotAlvoRef.current;
                const atual = filmesRotAtualRef.current;
                atual.x = lerp(atual.x, alvo.x, FILMES_ROT_SUAVIZACAO);
                atual.y = lerp(atual.y, alvo.y, FILMES_ROT_SUAVIZACAO);
                grupoAtivo.rotation.x = atual.x;
                grupoAtivo.rotation.y = atual.y;
                cena.renderizar();
            }

            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [filmeAtivo]);

    return (
        <>
        <div className="tv-trilho-scroll" ref={trilhoScrollRef}>
            <div className="tv-secao" ref={secaoRef}>
                <div className="tv-painel" ref={painelRef}>
                    <canvas className="tv-canvas" ref={canvasRef} />
                    <div className="tv-aviso-scroll" ref={avisoRef}>
                        <span className="tv-aviso-scroll-icone" />
                        <span className="tv-aviso-scroll-texto">role para continuar</span>
                    </div>
                </div>
            </div>
        </div>


        <div className="the-office-trilho" ref={officeTrilhoRef}>
            <section className="the-office" ref={officeSecaoRef}>
                {/* um vídeo por vez: quando acaba, troca para o próximo */}
                <div className="the-office-fundo">
                    {OFFICE_VIDEOS.map((src, i) => (
                        <video
                            key={src}
                            ref={(el) => { officeVideosRef.current[i] = el; }}
                            className="the-office-video"
                            src={src}
                            muted
                            playsInline
                            preload="auto"
                            autoPlay={i === 0}
                            onEnded={() => aoTerminarVideo(i)}
                        />
                    ))}
                </div>

                <canvas className="the-office-mascara" ref={officeCanvasRef} />
            </section>
        </div>


        {/* ===== FILMES — scroll normal, lista à direita ===== */}
        <section className="filmes-secao">
            {/* quadrado que fica parado enquanto a lista passa:
                aqui depois entra o modelo 3D de cada filme */}
            <div className="filmes-quadro-sticky">
                <div
                    className={`filmes-quadro${filmeAtivo !== null ? " ativo" : ""}`}
                >
                    <canvas className="filmes-quadro-canvas" ref={filmesCanvasRef} />
                </div>
            </div>

            <ul className="filmes-lista">
                {FILMES.map((filme, i) => (
                    <li
                        key={filme}
                        ref={(el) => { filmesItensRef.current[i] = el; }}
                        className={`filmes-item${filmeAtivo === i ? " ativo" : ""}`}
                    >
                        {filme}
                    </li>
                ))}
            </ul>
        </section>
        </>

    );
}