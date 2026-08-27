import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Bounds, Center } from "@react-three/drei";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./jogos.css";

gsap.registerPlugin(ScrollTrigger);

// O assasins.glb foi otimizado com o gltf-transform (simplificação de malha +
// texturas WebP + compressão de geometria via EXT_meshopt_compression),
// caindo de ~12,9 MB pra ~944 KB. O useGLTF do drei já vem com o decoder do
// Meshopt embutido e ativado por padrão (3º parâmetro "useMeshopt", default
// true) — não precisa instalar nada nem registrar decoder manualmente, só
// trocar o arquivo .glb mesmo.

const AMPLITUDE_X = 0.3; // quanto o modelo inclina no eixo X ao mover o mouse verticalmente
const AMPLITUDE_Y = 0.5; // quanto o modelo gira no eixo Y ao mover o mouse horizontalmente
const SUAVIZACAO = 0.05; // velocidade de interpolação (0 a 1) — menor = mais suave/lento
const STAGGER_LETRAS = 0.055;
const NUM_FATIAS_FUNDO = 10;
const STAGGER_FATIAS_FUNDO = 0.06;
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const clampSigned = (v) => Math.min(Math.max(v, -1), 1); // limita entre -1 e 1 (giro do celular)
function Modelo({ caminho, mouseRef, giroRef, rotacaoBaseInicial, escala = 1 }) {
    const { scene } = useGLTF(caminho);
    const grupoRef = useRef();

    const rotacaoBase = useRef(rotacaoBaseInicial ?? [0, -1.5, 0]);

    // Rotação "suave" vinda do mouse, guardada à parte da rotação final do
    // grupo — assim dá pra somar os giros das fases 2/3 por cima sem os
    // dois se atrapalharem.
    const mouseAtualRef = useRef({
        x: rotacaoBase.current[0],
        y: rotacaoBase.current[1],
    });

    // O modelo carrega de forma assíncrona (Suspense). Quando ele termina,
    // o layout da seção pode mudar — sem isso o ScrollTrigger fica com o
    // pin calculado a partir de posições antigas, causando aquele
    // "piscar"/vãos pretos ao rolar.
    useEffect(() => {
        const id = requestAnimationFrame(() => ScrollTrigger.refresh());
        return () => cancelAnimationFrame(id);
    }, [scene]);

    useFrame(() => {
        const grupo = grupoRef.current;
        if (!grupo) return;
        const { x, y } = mouseRef.current;
        const [baseX, baseY] = rotacaoBase.current;

        const alvoY = baseY + x * AMPLITUDE_Y;
        const alvoX = baseX - y * AMPLITUDE_X;

        mouseAtualRef.current.y += (alvoY - mouseAtualRef.current.y) * SUAVIZACAO;
        mouseAtualRef.current.x += (alvoX - mouseAtualRef.current.x) * SUAVIZACAO;

        // giroRef é opcional — se não vier (ou não tiver p2/p3), cai nos
        // defaults 0 e o modelo fica só com o tilt suave de mouse. O
        // Fallout usa p2 (fase 2) e p3 (fase 3); o Minecraft reaproveita o
        // mesmo p2 pra sua fase 5 (só ida, sem volta).
        const { p2 = 0, p3 = 0 } = giroRef?.current ?? {};

        // fase 2 do Fallout / fase 5 do Minecraft: uma volta completa no eixo Y.
        const giroIda = p2 * Math.PI * 2;

        // fase 3 (voltando pro centro): giro "na diagonal" — uma volta
        // completa somada nos eixos X e Z ao mesmo tempo, dando o efeito de
        // tombo diagonal. Como também é uma volta inteira (2π), termina
        // exatamente na rotação original.
        const giroVolta = p3 * Math.PI * 2;

        grupo.rotation.y = mouseAtualRef.current.y + giroIda;
        grupo.rotation.x = mouseAtualRef.current.x + giroVolta;
        grupo.rotation.z = giroVolta;
    });

    return (
        // O <group> é quem recebe a ref e gira (rotation.y/x/z no useFrame
        // acima); o <primitive> do modelo fica dentro de <Center>, que
        // recentraliza a geometria no próprio bounding box. Sem isso, se o
        // .glb não tiver o pivô exportado no centro do modelo (comum em
        // arquivos vindos do Blender/Sketchfab), a rotação acontece em volta
        // da origem "torta" do arquivo, e o modelo parece girar orbitando um
        // ponto fora dele em vez de girar no próprio lugar.
        <group ref={grupoRef} rotation={rotacaoBase.current}>
            <Center>
                {/* escala compensa modelos que já vêm com escala embutida no
                    próprio .glb (comum em conversões FBX→glTF do Sketchfab).
                    Sem isso o objeto fica minúsculo e o auto-fit da câmera
                    (Bounds) fica tão sensível que qualquer variação de
                    proporção de tela ou tilt do mouse joga o modelo pra
                    fora do campo de visão. O gta.glb já vem em escala normal
                    (~1.8 unidades de altura, igual aos outros modelos), então
                    não precisa de fator de correção — só os que realmente
                    vierem minúsculos do Sketchfab devem receber essa prop. */}
                <primitive object={scene} scale={escala} />
            </Center>
        </group>
    );
}

// Quebra uma palavra em <span> por letra, guardando cada span num array de
// refs (pra poder animar cada letra individualmente via JS, no mesmo estilo
// imperativo do resto do componente — sem depender de state/re-render).
function PalavraEmLetras({ texto, refsArray }) {
    return texto.split("").map((letra, i) => (
        <span
            key={i}
            ref={(el) => {
                refsArray.current[i] = el;
            }}
            className="jogos-letra"
        >
            {letra === " " ? "\u00A0" : letra}
        </span>
    ));
}

export default function Jogos({ linhaTempoTrilhoRef } = {}) {
    const BASE = import.meta.env.BASE_URL;
    const secaoTrilhoRef = useRef(null); // wrapper alto que dá espaço de scroll pras fases 2, 3, 4, 5 e 6
    const secaoRef = useRef(null);
    const mascaraRef = useRef(null); // envelope recortado (clip-path) que cresce com o scroll
    const modeloWrapperRef = useRef(null); // sobe do "chão" conforme o cilindro abre; some na fase 4
    const modeloMinecraftWrapperRef = useRef(null); // entra de baixo na fase 4 e desliza pra direita na fase 5
    const modeloAssassinsWrapperRef = useRef(null); // entra de baixo na fase 6, quando o Minecraft sobe e sai
    const modeloGtaWrapperRef = useRef(null); // entra de baixo na fase 8, quando o Assassin's sobe e sai
    const tituloRef = useRef(null); // desce do "teto" conforme o cilindro abre
    const tituloFavoritosRef = useRef(null); // só aparece quando o efeito termina de abrir
    const descricaoRef = useRef(null); // mini descrição que aparece ao lado do modelo, na fase 2
    const descricaoMinecraftRef = useRef(null); // mini descrição do Minecraft, na fase 5
    const descricaoAssassinsRef = useRef(null); // mini descrição do Assassin's Creed, na fase 6
    const descricaoGtaRef = useRef(null); // mini descrição do GTA, na fase 9
    const letrasFalloutRef = useRef([]); // spans de cada letra de "FALLOUT", pra fase 4 (saída)
    const letrasMinecraftRef = useRef([]); // spans de cada letra de "MINECRAFT", pra fase 4 (entrada) e fase 6 (saída)
    const letrasAssassinsRef = useRef([]); // spans de cada letra de "ASSASSINS CREED", pra fase 6 (entrada) e fase 8 (saída)
    const letrasGtaRef = useRef([]); // spans de cada letra de "GTA V", pra fase 8 (entrada)
    const fatiasFundoFalloutRef = useRef([]); // fatias verticais do fundo do Fallout, pra fase 4 (sobem e saem)
    const fatiasFundoMinecraftRef = useRef([]); // fatias verticais do fundo do Minecraft, pra fase 4 (entrada) e fase 6 (saída)
    const fatiasFundoAssassinsRef = useRef([]); // fatias verticais do fundo do Assassin's Creed, pra fase 6 (entrada) e fase 8 (saída)
    const fatiasFundoGtaRef = useRef([]); // fatias verticais do fundo do GTA, pra fase 8 (entrada)
    const modeloGiroRef = useRef({ p2: 0, p3: 0 }); // progresso das fases 2 e 3, lido pelo Modelo do Fallout
    // Reaproveita o campo "p2" da lógica de giro do Modelo (rotação no eixo
    // Y) pra fase 5 do Minecraft: ao contrário do Fallout (que na volta pro
    // centro troca pro tombo diagonal via "p3"), o Minecraft gira sempre
    // horizontalmente, tanto na ida quanto na volta — então "p3" fica
    // sempre 0 aqui.
    const modeloMinecraftGiroRef = useRef({ p2: 0, p3: 0 });
    // O Assassin's Creed entra de baixo sem girar (fase 6); só na fase 7
    // (ida pra esquerda e volta pro centro) ele gira — sempre no eixo
    // horizontal, no mesmo estilo do Minecraft na fase 5 — então "p3" fica
    // sempre 0 aqui.
    const modeloAssassinsGiroRef = useRef({ p2: 0, p3: 0 });
    // Mesma ideia do Minecraft/Assassin's: o GTA entra de baixo sem girar
    // (fase 8) e só gira no eixo horizontal na fase 9 (ida pra direita e
    // volta pro centro), então "p3" fica sempre 0 aqui.
    const modeloGtaGiroRef = useRef({ p2: 0, p3: 0 });
    // Coordenadas normalizadas do mouse (-1 a 1) relativas ao centro da seção.
    // Usar um ref (em vez de state) evita re-render a cada movimento do mouse.
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const secao = secaoRef.current;
        if (!secao) return;

        // Detecta mobile pela largura da viewport, mesmo critério usado no
        // resto do componente (obterEstadoInicial). Recalculado a cada
        // chamada porque o usuário pode girar o aparelho ou redimensionar.
        const ehMobile = () => window.innerWidth <= 768;

        // Converte uma coordenada de tela (clientX/clientY, venha de mouse ou
        // de dedo) pra coordenadas normalizadas (-1 a 1) relativas ao centro
        // da seção — mesma conta usada tanto pro mouse quanto pro touch.
        const atualizarPosicao = (clientX, clientY) => {
            const rect = secao.getBoundingClientRect();
            const x = ((clientX - rect.left) / rect.width) * 2 - 1;
            const y = ((clientY - rect.top) / rect.height) * 2 - 1;
            mouseRef.current = { x, y };
        };

        const aoMoverMouse = (e) => {
            atualizarPosicao(e.clientX, e.clientY);
        };

        // No touch, quem substitui o "mousemove" é o "touchmove" (só dispara
        // enquanto o dedo está na tela, exatamente durante o arrasto/esfrega).
        // O touchstart atualiza a posição assim que o dedo encosta, pra o
        // modelo não "pular" da última posição do mouse pro ponto do toque.
        const aoTocar = (e) => {
            const toque = e.touches[0];
            if (!toque) return;
            atualizarPosicao(toque.clientX, toque.clientY);
        };

        // --- Giroscópio (só no mobile): além do dedo arrastando na tela,
        // inclinar o próprio celular também mexe no modelo 3D. A orientação
        // "neutra" é a que o aparelho já está quando o primeiro evento
        // chega — o tilt é medido a partir dela, então não importa em que
        // ângulo a pessoa está segurando o celular, o modelo começa parado
        // e só reage ao desvio a partir dali.
        const AMPLITUDE_GIRO_GRAUS = 35; // graus de inclinação que já levam x/y ao máximo (-1/1)
        let orientacaoBase = null;

        const aoMoverDispositivo = (e) => {
            const { beta, gamma } = e; // beta: frente/trás, gamma: esquerda/direita
            if (beta === null || gamma === null) return;

            if (!orientacaoBase) {
                orientacaoBase = { beta, gamma };
            }

            const deltaGamma = gamma - orientacaoBase.gamma;
            const deltaBeta = beta - orientacaoBase.beta;

            mouseRef.current = {
                x: clampSigned(deltaGamma / AMPLITUDE_GIRO_GRAUS),
                y: clampSigned(deltaBeta / AMPLITUDE_GIRO_GRAUS),
            };
        };

        let giroAtivo = false;
        const ativarGiro = () => {
            if (giroAtivo || !ehMobile()) return;
            giroAtivo = true;
            window.addEventListener("deviceorientation", aoMoverDispositivo, true);
        };

        // No iOS 13+, ler o giroscópio só é permitido depois de um gesto do
        // usuário confirmando a permissão — por isso ela é pedida no
        // primeiro toque na seção. Em Android e navegadores mais antigos
        // (sem esse requestPermission), o giro é ativado direto.
        const precisaPedirPermissaoIOS =
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function";

        const aoPrimeiroToque = () => {
            if (!ehMobile() || giroAtivo) return;
            if (precisaPedirPermissaoIOS) {
                DeviceOrientationEvent.requestPermission()
                    .then((resposta) => {
                        if (resposta === "granted") ativarGiro();
                    })
                    .catch(() => {});
            } else {
                ativarGiro();
            }
        };

        window.addEventListener("mousemove", aoMoverMouse);
        // passive: true porque só lemos a posição do dedo, sem bloquear o
        // scroll da página (o scroll continua funcionando normalmente).
        window.addEventListener("touchstart", aoTocar, { passive: true });
        window.addEventListener("touchmove", aoTocar, { passive: true });
        window.addEventListener("touchstart", aoPrimeiroToque, { passive: true, once: true });

        if (!precisaPedirPermissaoIOS) ativarGiro();

        return () => {
            window.removeEventListener("mousemove", aoMoverMouse);
            window.removeEventListener("touchstart", aoTocar);
            window.removeEventListener("touchmove", aoTocar);
            window.removeEventListener("touchstart", aoPrimeiroToque);
            window.removeEventListener("deviceorientation", aoMoverDispositivo, true);
        };
    }, []);

    useEffect(() => {
        const secao = secaoRef.current;
        const trilho = secaoTrilhoRef.current;
        const mascara = mascaraRef.current;
        const titulo = tituloRef.current;
        const tituloFavoritos = tituloFavoritosRef.current;
        const modelo = modeloWrapperRef.current;
        const modeloMinecraft = modeloMinecraftWrapperRef.current;
        const modeloAssassins = modeloAssassinsWrapperRef.current;
        const descricao = descricaoRef.current;
        const descricaoMinecraft = descricaoMinecraftRef.current;
        const descricaoAssassins = descricaoAssassinsRef.current;
        const modeloGta = modeloGtaWrapperRef.current;
        const descricaoGta = descricaoGtaRef.current;
        if (!secao || !trilho || !mascara) return;

        // A rolagem real acontece dentro do container ".pagina" (Sobremim.jsx
        // usa overflow no próprio div, não na window), então o ScrollTrigger
        // precisa ser apontado pra esse scroller — senão o trigger nunca dispara.
        const scroller = secao.closest(".pagina") || window;

        // Quanto de scroll (em px) cada fase extra ocupa. É a MESMA altura
        // total que damos ao wrapper .jogos-secao-trilho logo abaixo — assim
        // o sticky "solta" exatamente quando a última fase termina.
        const ALTURA_FASE_2 = 800; // modelo indo pra esquerda
        const ALTURA_FASE_3 = 800; // modelo voltando pro centro, girando na diagonal
        const ALTURA_FASE_4 = 800; // Fallout sobe e sai; Minecraft entra no lugar
        const ALTURA_FASE_5 = 800; // Minecraft desliza pra direita e volta pro centro, girando
        const ALTURA_FASE_6 = 800; // Minecraft sobe e sai; Assassin's Creed entra no lugar
        const ALTURA_FASE_7 = 800; // Assassin's desliza pra esquerda e volta pro centro, girando
        const ALTURA_FASE_8 = 800; // Assassin's sobe e sai; GTA entra no lugar
        const ALTURA_FASE_9 = 800; // GTA desliza pra direita e volta pro centro, girando
        const ALTURA_TOTAL = ALTURA_FASE_2 + ALTURA_FASE_3 + ALTURA_FASE_4 + ALTURA_FASE_5 + ALTURA_FASE_6 + ALTURA_FASE_7 + ALTURA_FASE_8 + ALTURA_FASE_9;
        const FRACAO_FASE_2 = ALTURA_FASE_2 / ALTURA_TOTAL;
        const FRACAO_FASE_3 = ALTURA_FASE_3 / ALTURA_TOTAL;
        const FRACAO_FASE_4 = ALTURA_FASE_4 / ALTURA_TOTAL;
        const FRACAO_FASE_5 = ALTURA_FASE_5 / ALTURA_TOTAL;
        const FRACAO_FASE_6 = ALTURA_FASE_6 / ALTURA_TOTAL;
        const FRACAO_FASE_7 = ALTURA_FASE_7 / ALTURA_TOTAL;
        const FRACAO_FASE_8 = ALTURA_FASE_8 / ALTURA_TOTAL;
        const FRACAO_FASE_9 = ALTURA_FASE_9 / ALTURA_TOTAL;
        trilho.style.height = `calc(100vh + ${ALTURA_TOTAL}px)`;

        // Dimensões do "cilindro" inicial (fase 1: abertura), em % de inset
        // (topo/laterais) e raio em px pro arredondado do topo. Também guarda
        // o quanto o modelo desliza pra esquerda, o quanto "JOGOS FAVORITOS"
        // sobe na fase 2, e o quanto os modelos do Fallout/Minecraft/Assassin's
        // sobem na fase 4/6 (saída/entrada). Três níveis: mobile (≤768px),
        // notebook (769–1440px, ex.: telas 1366/1440) e desktop (>1440px, ex.: 1920).
        // Em telas menores tudo fica proporcionalmente mais discreto.
        const obterEstadoInicial = () => {
            const largura = window.innerWidth;
            if (largura <= 768) {
                return {
                    topo: 88, lado: 38, raio: 90, subidaModelo: 140, descidaTitulo: 90,
                    deslocamentoModelo: 140, subidaFavoritos: 40,
                    saidaModeloFallout: 220, entradaModeloMinecraft: 220,
                    deslocamentoModeloMinecraft: 140,
                    saidaModeloMinecraft: 220, entradaModeloAssassins: 220,
                    deslocamentoModeloAssassins: 140,
                    saidaModeloAssassins: 220, entradaModeloGta: 220,
                    deslocamentoModeloGta: 140,
                };
            }
            if (largura <= 1440) {
                return {
                    topo: 84, lado: 42, raio: 160, subidaModelo: 200, descidaTitulo: 130,
                    deslocamentoModelo: 380, subidaFavoritos: 50,
                    saidaModeloFallout: 460, entradaModeloMinecraft: 460,
                    deslocamentoModeloMinecraft: 380,
                    saidaModeloMinecraft: 460, entradaModeloAssassins: 460,
                    deslocamentoModeloAssassins: 380,
                    saidaModeloAssassins: 460, entradaModeloGta: 460,
                    deslocamentoModeloGta: 380,
                };
            }
            return {
                topo: 82, lado: 44, raio: 220, subidaModelo: 260, descidaTitulo: 160,
                deslocamentoModelo: 520, subidaFavoritos: 60,
                saidaModeloFallout: 620, entradaModeloMinecraft: 620,
                deslocamentoModeloMinecraft: 520,
                saidaModeloMinecraft: 620, entradaModeloAssassins: 620,
                deslocamentoModeloAssassins: 520,
                saidaModeloAssassins: 620, entradaModeloGta: 620,
                deslocamentoModeloGta: 520,
            };
        };
        let estadoInicial = obterEstadoInicial();
        const progresso = { p: 0 }; // fase 1: abertura do cilindro
        const progressoFases = { p: 0 }; // fases 2+3+4+5+6 juntas (0→1): ida, volta, troca Fallout→Minecraft, saída/retorno do Minecraft e troca Minecraft→Assassin's

        // Anima um conjunto de letras (spans) letra por letra, defasando
        // cada uma em STAGGER_LETRAS. direcao "saida": sobe e desaparece.
        // direcao "entrada": vem de baixo (fora da vista) e aparece no lugar.
        const aplicarLetras = (refsArray, progressoFase, direcao) => {
            const letras = refsArray.current.filter(Boolean);
            const n = letras.length;
            if (n === 0) return;
            const duracaoLocal = Math.max(1 - (n - 1) * STAGGER_LETRAS, 0.001);
            letras.forEach((el, i) => {
                const inicio = i * STAGGER_LETRAS;
                const local = clamp01((progressoFase - inicio) / duracaoLocal);
                if (direcao === "saida") {
                    el.style.transform = `translateY(${-local * 100}%)`;
                    el.style.opacity = 1 - local;
                } else {
                    el.style.transform = `translateY(${(1 - local) * 100}%)`;
                    el.style.opacity = local;
                }
            });
        };

        // Anima as fatias verticais do fundo (mesma ideia de aplicarLetras,
        // mas com a ordem do stagger invertida: a fatia mais à direita
        // (índice mais alto) começa primeiro, e cada fatia à esquerda dela
        // começa um pouco depois — isso dá o efeito de "varredura" da
        // direita pra esquerda). direcao "saida": sobe e sai por cima.
        // direcao "entrada": vem de baixo (fora da vista) e sobe até o lugar.
        const aplicarFatiasFundo = (refsArray, progressoFase, direcao) => {
            const fatias = refsArray.current.filter(Boolean);
            const n = fatias.length;
            if (n === 0) return;
            const duracaoLocal = Math.max(1 - (n - 1) * STAGGER_FATIAS_FUNDO, 0.001);
            fatias.forEach((el, i) => {
                const inicio = (n - 1 - i) * STAGGER_FATIAS_FUNDO;
                const local = clamp01((progressoFase - inicio) / duracaoLocal);
                el.style.transform =
                    direcao === "saida"
                        ? `translateY(${-local * 130}%)`
                        : `translateY(${(1 - local) * 130}%)`;
            });
        };

        const aplicarProgresso = () => {
            const { p } = progresso;
            const restante = 1 - p;

            // pTotal (0→1) cobre a ida (fase 2), a volta (fase 3), a troca
            // Fallout→Minecraft (fase 4), a saída/retorno do Minecraft
            // (fase 5), a troca Minecraft→Assassin's (fase 6) e a ida/volta
            // do Assassin's (fase 7). p2, p3, p4, p5, p6 e p7 vão cada um de
            // 0→1 na sua fatia correspondente, em sequência.
            const pTotal = progressoFases.p;
            const p2 = clamp01(pTotal / FRACAO_FASE_2);
            const p3 = clamp01((pTotal - FRACAO_FASE_2) / FRACAO_FASE_3);
            const p4 = clamp01((pTotal - FRACAO_FASE_2 - FRACAO_FASE_3) / FRACAO_FASE_4);
            const p5 = clamp01((pTotal - FRACAO_FASE_2 - FRACAO_FASE_3 - FRACAO_FASE_4) / FRACAO_FASE_5);
            const p6 = clamp01(
                (pTotal - FRACAO_FASE_2 - FRACAO_FASE_3 - FRACAO_FASE_4 - FRACAO_FASE_5) /
                FRACAO_FASE_6
            );
            const p7 = clamp01(
                (pTotal - FRACAO_FASE_2 - FRACAO_FASE_3 - FRACAO_FASE_4 - FRACAO_FASE_5 - FRACAO_FASE_6) /
                FRACAO_FASE_7
            );
            const p8 = clamp01(
                (pTotal - FRACAO_FASE_2 - FRACAO_FASE_3 - FRACAO_FASE_4 - FRACAO_FASE_5 - FRACAO_FASE_6 - FRACAO_FASE_7) /
                FRACAO_FASE_8
            );
            const p9 = clamp01(
                (pTotal - FRACAO_FASE_2 - FRACAO_FASE_3 - FRACAO_FASE_4 - FRACAO_FASE_5 - FRACAO_FASE_6 - FRACAO_FASE_7 - FRACAO_FASE_8) /
                FRACAO_FASE_9
            );
            const p9a = clamp01(p9 / 0.5);
            const p9b = clamp01((p9 - 0.5) / 0.5);
            // Assim como a fase 5 do Minecraft, a fase 7 é dividida em duas
            // metades: p7a (ida, esquerda) e p7b (volta, centro).
            const p7a = clamp01(p7 / 0.5);
            const p7b = clamp01((p7 - 0.5) / 0.5);

            // Cursor personalizado (rosto do Vault Boy) enquanto o Fallout
            // ainda está em cena — inclusive durante a transição de saída
            // (fase 4). Assim que o Minecraft assume por completo (p4 chega
            // a 1), o cursor volta ao padrão do sistema. Aplicado direto na
            // .jogos-secao (que cobre a tela inteira via sticky), então
            // funciona também sobre o modelo 3D e os textos.
            //
            // "32 32" é o hotspot (ponto que conta como o "clique" do
            // cursor): como o PNG é 64x64, isso centraliza o ponto de
            // clique no meio do rosto. "auto" no final é o fallback caso o
            // navegador não consiga carregar a imagem por algum motivo.
            if (secao) {
                secao.style.cursor = p4 < 1
                    ? `url(${BASE}cursorfallout.png) 32 32, auto`
                    : "auto";
            }

            // 1) recorte crescendo (só depende da fase 1)
            const topo = estadoInicial.topo * restante;
            const lado = estadoInicial.lado * restante;
            const raio = estadoInicial.raio * restante;
            mascara.style.clipPath =
                `inset(${topo}% ${lado}% 0% ${lado}% round ${raio}px ${raio}px 0 0)`;

            // 2) modelo do Fallout: sobe do chão (fase 1); na fase 2 desliza
            // pro canto esquerdo girando; na fase 3 volta pro centro girando
            // na diagonal; na fase 4 sobe e some, dando lugar ao Minecraft
            // (a partir da fase 5 ele já está totalmente fora, então fica
            // parado). A base "calc(-50% + Xpx)" substitui o centering que
            // antes vinha do flex do pai, já que agora os três modelos
            // ficam sobrepostos via position:absolute.
            if (modelo) {
                const subida = estadoInicial.subidaModelo * restante;
                const deslocamentoX = estadoInicial.deslocamentoModelo * p2 * (1 - p3);
                const saida = estadoInicial.saidaModeloFallout * p4;
                modelo.style.transform =
                    `translate(calc(-50% + ${-deslocamentoX}px), ${subida - saida}px)`;
                modelo.style.opacity = Math.min(p / 0.5, 1) * (1 - p4);
            }

            // 3) modelo do Minecraft: fica escondido embaixo até a fase 4
            // começar, aí sobe e entra exatamente no lugar onde o Fallout
            // estava; a posição (ida/volta) é dividida em duas metades
            // (p5a/p5b), no mesmo estilo das fases 2/3 do Fallout: na 1ª
            // metade ele desliza pra direita, na 2ª volta pro centro. A
            // diferença é o giro: ao contrário do Fallout (que na volta
            // troca pro tombo diagonal), o Minecraft gira sempre no eixo
            // horizontal (Y), tanto na ida quanto na volta — por isso o
            // giroRef usa só "p2" (com o dobro do range, 0→2, uma volta
            // completa em cada metade) e mantém "p3" sempre em 0.
            // Na fase 6 ele sobe e sai igual ao Fallout na fase 4, dando
            // lugar ao Assassin's Creed.
            const p5a = clamp01(p5 / 0.5);
            const p5b = clamp01((p5 - 0.5) / 0.5);

            if (modeloMinecraft) {
                const entrada = estadoInicial.entradaModeloMinecraft * (1 - p4);
                const deslocamentoDireita =
                    estadoInicial.deslocamentoModeloMinecraft * p5a * (1 - p5b);
                const saidaMinecraft = estadoInicial.saidaModeloMinecraft * p6;
                modeloMinecraft.style.transform =
                    `translate(calc(-50% + ${deslocamentoDireita}px), ${entrada - saidaMinecraft}px)`;
                modeloMinecraft.style.opacity = p4 * (1 - p6);
            }

            // 3b) modelo do Assassin's Creed: fica escondido embaixo até a
            // fase 6 começar, aí sobe e entra parado (sem girar) exatamente
            // no lugar onde o Minecraft estava. Só na fase 7 ele se move:
            // na 1ª metade (p7a) desliza pra esquerda girando
            // horizontalmente, na 2ª metade (p7b) volta pro centro,
            // continuando a girar — mesmo estilo do Minecraft na fase 5,
            // só que espelhado pro lado esquerdo.
            if (modeloAssassins) {
                const entradaAssassins = estadoInicial.entradaModeloAssassins * (1 - p6);
                const deslocamentoEsquerda =
                    estadoInicial.deslocamentoModeloAssassins * p7a * (1 - p7b);
                const saidaAssassins = estadoInicial.saidaModeloAssassins * p8;
                modeloAssassins.style.transform =
                    `translate(calc(-50% + ${-deslocamentoEsquerda}px), ${entradaAssassins - saidaAssassins}px)`;
                modeloAssassins.style.opacity = p6 * (1 - p8);
            }

            // 3c) modelo do GTA: mesma mecânica do Minecraft — fica escondido
            // embaixo até a fase 8 começar, aí sobe e entra exatamente no
            // lugar onde o Assassin's estava; na fase 9 desliza pra direita
            // girando na horizontal (p9a) e volta pro centro (p9b).
            if (modeloGta) {
                const entradaGta = estadoInicial.entradaModeloGta * (1 - p8);
                const deslocamentoDireitaGta =
                    estadoInicial.deslocamentoModeloGta * p9a * (1 - p9b);
                modeloGta.style.transform =
                    `translate(calc(-50% + ${deslocamentoDireitaGta}px), ${entradaGta}px)`;
                modeloGta.style.opacity = p8;
            }
            modeloGiroRef.current = { p2, p3 };
            modeloMinecraftGiroRef.current = { p2: p5a + p5b, p3: 0 };
            modeloAssassinsGiroRef.current = { p2: p7a + p7b, p3: 0 };
            modeloGtaGiroRef.current = { p2: p9a + p9b, p3: 0 };

            // 4) título "FALLOUT" desce do teto na fase 1, permanece parado
            // na fase 2/3 e, na fase 4, some letra por letra subindo (ver
            // aplicarLetras abaixo — o elemento em si só cuida do
            // posicionamento/opacidade "geral" das fases 1-3).
            if (titulo) {
                const subidaTitulo = -estadoInicial.descidaTitulo * restante;
                titulo.style.transform = `translate(-50%, calc(-100% + ${subidaTitulo}px))`;
                titulo.style.opacity = Math.min(p / 0.5, 1);
            }
            aplicarLetras(letrasFalloutRef, p4, "saida");
            aplicarLetras(letrasMinecraftRef, p4, "entrada");
            aplicarFatiasFundo(fatiasFundoFalloutRef, p4, "saida");
            aplicarFatiasFundo(fatiasFundoMinecraftRef, p4, "entrada");
            // "ASSASSINS CREED" (letras e fundo) só é escrito aqui, então isso
            // roda sempre — é o que garante que ele fique escondido (p6=0 =>
            // "entrada" com progresso 0 => opacity:0) até a fase 6 começar.
            aplicarLetras(letrasAssassinsRef, p6, "entrada");
            aplicarFatiasFundo(fatiasFundoAssassinsRef, p6, "entrada");
            // Já "MINECRAFT" (letras e fundo) também é escrito pela fase 4
            // acima, então só sobrescrevemos com a saída da fase 6 quando ela
            // já começou de fato (p6 > 0) — senão "saida" com progresso 0
            // ("opacity:1/translateY(0)") apagaria o estado "entrada" da fase
            // 4 e deixaria o MINECRAFT visível o tempo todo, inclusive na
            // fase do Fallout.
            if (p6 > 0) {
                aplicarLetras(letrasMinecraftRef, p6, "saida");
                aplicarFatiasFundo(fatiasFundoMinecraftRef, p6, "saida");
            }

            // fase 8: o GTA entra (letras + fundo) exatamente como o
            // Minecraft entrou na fase 4 e o Assassin's na fase 6. Isso roda
            // sempre, pra manter o GTA escondido (p8 = 0) até a fase 8.
            aplicarLetras(letrasGtaRef, p8, "entrada");
            aplicarFatiasFundo(fatiasFundoGtaRef, p8, "entrada");
            // e o Assassin's sobe e sai — só sobrescrevemos o estado de
            // "entrada" da fase 6 depois que a fase 8 realmente começou.
            if (p8 > 0) {
                aplicarLetras(letrasAssassinsRef, p8, "saida");
                aplicarFatiasFundo(fatiasFundoAssassinsRef, p8, "saida");
            }

            // 5) "JOGOS FAVORITOS": aparece no fim da fase 1 e, na fase 2,
            // sobe e some conforme o modelo se desloca
            if (tituloFavoritos) {
                const inicioAparicao = 0.85; // a partir de 85% da fase 1 começa o fade in
                const opacidadeAbertura = Math.max(
                    0,
                    (p - inicioAparicao) / (1 - inicioAparicao)
                );
                tituloFavoritos.style.opacity = opacidadeAbertura * (1 - p2);
                tituloFavoritos.style.transform =
                    `translate(-50%, ${(1 - opacidadeAbertura) * -12 - estadoInicial.subidaFavoritos * p2}px)`;
            }

            // 6) mini descrição do Fallout: some da esquerda pra direita, ao
            // lado do modelo, na 2ª metade da fase 2; na fase 3, sobe e some
            // (mesmo estilo do "JOGOS FAVORITOS" na fase 2)
            if (descricao) {
                const inicioDescricao = 0.5; // só começa a aparecer na metade da fase 2
                const progressoEntrada = Math.max(
                    0,
                    (p2 - inicioDescricao) / (1 - inicioDescricao)
                );
                const SUBIDA_SAIDA = 60; // px que ela sobe ao sumir na fase 3
                descricao.style.opacity = progressoEntrada * (1 - p3);
                descricao.style.transform =
                    `translate(${(1 - progressoEntrada) * -40}px, calc(-50% - ${SUBIDA_SAIDA * p3}px))`;
            }

            // 7) mini descrição do Minecraft: espelho da do Fallout, mas do
            // lado esquerdo — aparece na 2ª metade da fase 5a (modelo indo
            // pra direita) e, assim como a do Fallout na fase 3, sobe e
            // some na fase 5b (modelo voltando pro centro). Na fase 6 ela
            // também some (multiplica por 1 - p6), acompanhando o modelo.
            if (descricaoMinecraft) {
                const inicioDescricaoMinecraft = 0.5; // só começa a aparecer na metade da ida (p5a)
                const progressoEntradaMinecraft = Math.max(
                    0,
                    (p5a - inicioDescricaoMinecraft) / (1 - inicioDescricaoMinecraft)
                );
                const SUBIDA_SAIDA_MINECRAFT = 60; // px que ela sobe ao sumir na fase 5b
                descricaoMinecraft.style.opacity = progressoEntradaMinecraft * (1 - p5b) * (1 - p6);
                descricaoMinecraft.style.transform =
                    `translate(${(1 - progressoEntradaMinecraft) * 40}px, calc(-50% - ${SUBIDA_SAIDA_MINECRAFT * p5b}px))`;
            }

            // 8) mini descrição do Assassin's: espelho da do Fallout (lado
            // direito). Fica escondida durante toda a fase 6 (entrada do
            // modelo) — só aparece na 2ª metade da fase 7a, quando o modelo
            // já deslizou pra esquerda e parou lá, vindo do meio pra
            // direita, igual a do Fallout na fase 2. Na fase 7b (modelo
            // voltando pro centro) ela sobe e some de novo, mesmo estilo da
            // descrição do Minecraft na fase 5b.
            if (descricaoAssassins) {
                const inicioDescricaoAssassins = 0.5; // só começa a aparecer na metade da ida (p7a)
                const progressoEntradaAssassins = Math.max(
                    0,
                    (p7a - inicioDescricaoAssassins) / (1 - inicioDescricaoAssassins)
                );
                const SUBIDA_SAIDA_ASSASSINS = 60; // px que ela sobe ao sumir na fase 7b
                descricaoAssassins.style.opacity = progressoEntradaAssassins * (1 - p7b) * (1 - p8);
                descricaoAssassins.style.transform =
                    `translate(${(1 - progressoEntradaAssassins) * -40}px, calc(-50% - ${SUBIDA_SAIDA_ASSASSINS * p7b}px))`;
            }

            // 9) mini descrição do GTA: espelho da do Minecraft (lado
            // esquerdo). Aparece na 2ª metade da fase 9a, quando o modelo já
            // deslizou pra direita, e sobe/some na fase 9b.
            if (descricaoGta) {
                const inicioDescricaoGta = 0.5;
                const progressoEntradaGta = Math.max(
                    0,
                    (p9a - inicioDescricaoGta) / (1 - inicioDescricaoGta)
                );
                const SUBIDA_SAIDA_GTA = 60;
                descricaoGta.style.opacity = progressoEntradaGta * (1 - p9b);
                descricaoGta.style.transform =
                    `translate(${(1 - progressoEntradaGta) * 40}px, calc(-50% - ${SUBIDA_SAIDA_GTA * p9b}px))`;
            }
        };

        aplicarProgresso();

        const ctx = gsap.context(() => {
            // fase 1: abertura do cilindro. Se vier a ref do trilho da linha
            // do tempo (linhaTempoTrilhoRef), o gatilho é a BASE desse
            // trilho encostando na base da tela — que é exatamente o
            // instante em que o sticky da linha do tempo solta (ou seja,
            // quando o item 5/índice 4 já está ativo). Isso amarra a
            // abertura do Jogos de verdade ao fim da linha do tempo, em vez
            // de depender da margem negativa do jogos-secao-wrapper
            // coincidir por acaso com esse ponto. Sem a ref (uso do Jogos
            // fora do contexto da Sobremim), cai no comportamento antigo:
            // dispara pela posição do próprio trilho do Jogos.
            const trilhoLinhaTempo = linhaTempoTrilhoRef?.current ?? null;
            const gatilhoAbertura = trilhoLinhaTempo ?? trilho;
            gsap.to(progresso, {
                p: 1,
                ease: "none",
                onUpdate: aplicarProgresso,
                scrollTrigger: {
                    trigger: gatilhoAbertura,
                    scroller,
                    start: trilhoLinhaTempo ? "bottom bottom" : "top bottom",
                    end: trilhoLinhaTempo ? "bottom top" : "top top",
                    scrub: 0.6,
                },
            });

            // fases 2+3+4+5+6: enquanto o wrapper "trilho" (mais alto que a
            // tela) rola por baixo da seção, que fica grudada no topo via
            // CSS sticky — sem pin do GSAP, então sem spacer/flicker. Um
            // único progresso (0→1) cobre ida, volta, troca Fallout→Minecraft,
            // saída/retorno do Minecraft e troca Minecraft→Assassin's; ele é
            // dividido proporcionalmente em p2/p3/p4/p5/p6 dentro de
            // aplicarProgresso.
            gsap.to(progressoFases, {
                p: 1,
                ease: "none",
                onUpdate: aplicarProgresso,
                scrollTrigger: {
                    trigger: trilho,
                    scroller,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.6,
                },
            });

            const aoRedimensionar = () => {
                estadoInicial = obterEstadoInicial();
                aplicarProgresso();
                ScrollTrigger.refresh();
            };
            window.addEventListener("resize", aoRedimensionar);

            // O "resize" da window só dispara quando a JANELA muda de
            // tamanho (ex.: abrir o DevTools) — mas a altura real da
            // página (".pagina", o scroller) pode mudar sozinha por outros
            // motivos que não mexem na janela: uma fonte custom (Overseer,
            // Minecrafter, Pricedown...) terminando de carregar, uma
            // imagem de fundo resolvendo, ou um dos 4 modelos 3D demorando
            // mais que os outros pra resolver o Suspense. Se isso acontece
            // DEPOIS do primeiro ScrollTrigger.refresh(), o trigger fica
            // com uma altura de scroll "curta" guardada em cache — e a
            // última fase (8/9, a entrada do GTA) simplesmente nunca é
            // alcançável, porque o scroll acaba antes de chegar lá. É
            // exatamente o que some quando abrir o DevTools "conserta":
            // ele dispara um resize, que força um refresh, que remede a
            // altura certa.
            //
            // Pra não depender de abrir o DevTools, um ResizeObserver no
            // próprio scroller cobre qualquer mudança de altura da página
            // (não só da janela), e refresca o ScrollTrigger sempre que
            // ela muda de fato.
            const alvoObservado = scroller === window ? document.body : scroller;
            let alturaAnterior = alvoObservado.scrollHeight;
            const resizeObserver = new ResizeObserver(() => {
                const alturaAtual = alvoObservado.scrollHeight;
                if (alturaAtual !== alturaAnterior) {
                    alturaAnterior = alturaAtual;
                    ScrollTrigger.refresh();
                }
            });
            resizeObserver.observe(alvoObservado);

            // Reforço extra: garante um refresh depois que TODAS as fontes
            // (@font-face acima) terminarem de carregar, e depois do
            // "load" da página (imagens, etc.) — cobrindo casos em que
            // nada mais dispara um ResizeObserver (a altura do scroller
            // pode não mudar visivelmente, mas o layout interno sim).
            const refrescarUmaVez = () => requestAnimationFrame(() => ScrollTrigger.refresh());
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(refrescarUmaVez).catch(() => {});
            }
            window.addEventListener("load", refrescarUmaVez);

            return () => {
                window.removeEventListener("resize", aoRedimensionar);
                window.removeEventListener("load", refrescarUmaVez);
                resizeObserver.disconnect();
            };
        }, secao);

        return () => {
            ctx.revert();
            if (secao) secao.style.cursor = "auto";
        };
    }, []);

    return (
        <div className="jogos-secao-wrapper">
        <div className="jogos-secao-trilho" ref={secaoTrilhoRef}>
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
                @font-face {
                    font-family: 'Minecrafter';
                    src: url('${BASE}Minecrafter.Reg.ttf') format('truetype');
                    font-style: normal;
                    font-weight: 400;
                    font-display: swap;
                }
                @font-face {
                    font-family: 'Pricedown';
                    src: url('${BASE}gta.otf') format('opentype');
                    font-style: normal;
                    font-weight: 400;
                    font-display: swap;
                }
                @font-face {
                    font-family: 'Assassin Creed';
                    src: url('${BASE}Assassin$.ttf') format('truetype');
                    font-style: normal;
                    font-weight: 400;
                    font-display: swap;
                }
            `}</style>

            <div className="jogos-mascara" ref={mascaraRef}>
                <div className="jogos-fundo-camada jogos-fundo-camada-fallout" aria-hidden="true">
                    {Array.from({ length: NUM_FATIAS_FUNDO }).map((_, i) => (
                        <div
                            className="jogos-fundo-fatia"
                            key={`fundo-fallout-${i}`}
                            ref={(el) => {
                                fatiasFundoFalloutRef.current[i] = el;
                            }}
                        >
                            <div
                                className="jogos-fundo-fatia-img"
                                style={{
                                    backgroundImage: `url(${BASE}fallout.webp)`,
                                    width: `${NUM_FATIAS_FUNDO * 100}%`,
                                    left: `${-i * 100}%`,
                                }}
                            />
                        </div>
                    ))}
                </div>

                <div className="jogos-fundo-camada jogos-fundo-camada-minecraft" aria-hidden="true">
                    {Array.from({ length: NUM_FATIAS_FUNDO }).map((_, i) => (
                        <div
                            className="jogos-fundo-fatia"
                            key={`fundo-minecraft-${i}`}
                            ref={(el) => {
                                fatiasFundoMinecraftRef.current[i] = el;
                            }}
                        >
                            <div
                                className="jogos-fundo-fatia-img"
                                style={{
                                    backgroundImage: `url(${BASE}minecraft.png)`,
                                    width: `${NUM_FATIAS_FUNDO * 100}%`,
                                    left: `${-i * 100}%`,
                                }}
                            />
                        </div>
                    ))}
                </div>

                <div className="jogos-fundo-camada jogos-fundo-camada-assassins" aria-hidden="true">
                    {Array.from({ length: NUM_FATIAS_FUNDO }).map((_, i) => (
                        <div
                            className="jogos-fundo-fatia"
                            key={`fundo-assassins-${i}`}
                            ref={(el) => {
                                fatiasFundoAssassinsRef.current[i] = el;
                            }}
                        >
                            <div
                                className="jogos-fundo-fatia-img"
                                style={{
                                    backgroundImage: `url(${BASE}assasins.webp)`,
                                    width: `${NUM_FATIAS_FUNDO * 100}%`,
                                    left: `${-i * 100}%`,
                                }}
                            />
                        </div>
                    ))}
                </div>

                <div className="jogos-fundo-camada jogos-fundo-camada-gta" aria-hidden="true">
                    {Array.from({ length: NUM_FATIAS_FUNDO }).map((_, i) => (
                        <div
                            className="jogos-fundo-fatia"
                            key={`fundo-gta-${i}`}
                            ref={(el) => {
                                fatiasFundoGtaRef.current[i] = el;
                            }}
                        >
                            <div
                                className="jogos-fundo-fatia-img"
                                style={{
                                    backgroundImage: `url(${BASE}gta.webp)`,
                                    width: `${NUM_FATIAS_FUNDO * 100}%`,
                                    left: `${-i * 100}%`,
                                }}
                            />
                        </div>
                    ))}
                </div>

                <h2 className="jogos-favoritos-titulo" ref={tituloFavoritosRef}>
                    JOGOS FAVORITOS
                </h2>

                <h3 className="jogos-fallout-titulo" ref={tituloRef}>
                    <PalavraEmLetras texto="FALLOUT" refsArray={letrasFalloutRef} />
                </h3>

                <h3 className="jogos-minecraft-titulo">
                    <PalavraEmLetras texto="MINECRAFT" refsArray={letrasMinecraftRef} />
                </h3>

                <h3 className="jogos-assassins-titulo">
                    <PalavraEmLetras texto="Assassin's Creed" refsArray={letrasAssassinsRef} />
                </h3>

                <h3 className="jogos-gta-titulo">
                    <PalavraEmLetras texto="grand theft auto" refsArray={letrasGtaRef} />
                </h3>

                <div className="jogos-modelos">
                    <div className="jogos-modelo" ref={modeloWrapperRef}>
                        <Canvas camera={{ fov: 45 }}>
                            <ambientLight intensity={3.8} />
                            <directionalLight position={[70, 45, 55]} intensity={1.5} />
                            <Suspense fallback={null}>
                                <Bounds fit observe margin={1.2}>
                                    <Modelo
                                        caminho={`${BASE}fallout.glb`}
                                        mouseRef={mouseRef}
                                        giroRef={modeloGiroRef}
                                    />
                                </Bounds>
                            </Suspense>
                        </Canvas>
                    </div>

                    <div className="jogos-modelo" ref={modeloMinecraftWrapperRef}>
                        <Canvas camera={{ fov: 45 }}>
                            <ambientLight intensity={3.8} />
                            <directionalLight position={[270, 245, 55]} intensity={1.5} />
                            <Suspense fallback={null}>
                                <Bounds fit observe margin={1.2}>
                                    <Modelo
                                        caminho={`${BASE}minecraft.glb`}
                                        mouseRef={mouseRef}
                                        giroRef={modeloMinecraftGiroRef}
                                        rotacaoBaseInicial={[0, 0.6, 0]}
                                    />
                                </Bounds>
                            </Suspense>
                        </Canvas>
                    </div>

                    <div className="jogos-modelo" ref={modeloAssassinsWrapperRef}>
                        <Canvas camera={{ fov: 45 }}>
                            <ambientLight intensity={3.8} />
                            <directionalLight position={[70, 45, 55]} intensity={1.5} />
                            <Suspense fallback={null}>
                                <Bounds fit observe margin={1.2}>
                                    <Modelo
                                        caminho={`${BASE}assasins.glb`}
                                        mouseRef={mouseRef}
                                        giroRef={modeloAssassinsGiroRef}
                                    />
                                </Bounds>
                            </Suspense>
                        </Canvas>
                    </div>
                    <div className="jogos-modelo" ref={modeloGtaWrapperRef}>
                        <Canvas camera={{ fov: 45 }}>
                            <ambientLight intensity={3.8} />
                            <directionalLight position={[720, 45, 55]} intensity={1.5} />
                            <Suspense fallback={null}>
                                <Bounds fit observe margin={1.2}>
                                    <Modelo
                                        caminho={`${BASE}gta.glb`}
                                        mouseRef={mouseRef}
                                        giroRef={modeloGtaGiroRef}
                                        rotacaoBaseInicial={[0, -1.5, 0]}
                                    />
                                </Bounds>
                            </Suspense>
                        </Canvas>
                    </div>
                </div>

                <div className="jogos-descricao" ref={descricaoRef}>
                    <p>
                        Um clássico pós-apocalíptico de RPG e exploração, com
                        escolhas que moldam o mundo ao seu redor.
                    </p>
                </div>

                <div className="jogos-descricao-minecraft" ref={descricaoMinecraftRef}>
                    <p>
                        Um mundo aberto de blocos, construção e sobrevivência,
                        onde o único limite é a sua imaginação.
                    </p>
                </div>

                <div className="jogos-descricao-assassins" ref={descricaoAssassinsRef}>
                    <p>
                        Uma saga de stealth e ação em mundos abertos históricos,
                        onde cada sombra esconde uma oportunidade.
                    </p>
                </div>

                <div className="jogos-descricao-gta" ref={descricaoGtaRef}>
                    <p>
                        Um mundo aberto de diversão sem limites,
                        desde assaltar uma lojinha de esquina até roubar um jato e sair explodindo tudo pela cidade.
                    </p>
                </div>

            </div>
        </div>
        </div>
        </div>
    );
}