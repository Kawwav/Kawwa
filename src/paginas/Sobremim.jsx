import { useEffect, useRef, useState } from "react";
import "./Sobremim.css";

export default function Sobremim({ onClose }) {
    const cortinaRef = useRef(null);
    const paginaRef  = useRef(null);
    const heroRef    = useRef(null);
    const nomeRef    = useRef(null);
    const fotoWrapperRef = useRef(null);
    const fotoImgRef     = useRef(null);
    const nomeWrapperRef = useRef(null);
    const rodapeRef      = useRef(null);
    const missaoRef      = useRef(null);
    const missaoTextoRef   = useRef(null);
    const missaoLetrasRef = useRef([]);
    const processoGrupoRef = useRef(null);
    const processoLinha1Ref = useRef(null); // "Por trás"     -> esquerda
    const processoLinha2Ref = useRef(null); // "do processo"  -> direita
    const processoLinha3Ref = useRef(null); // "criativo"     -> esquerda
    const [paginaVisivel, setPaginaVisivel] = useState(false);
    const [missaoVisivel, setMissaoVisivel] = useState(false);
    const linhaTempoItensRef = useRef([]);
    const linhaTempoSecaoRef = useRef(null);
    const trilhoRef = useRef(null);
    const trilhoProgressoRef = useRef(null);
    const pontoRefs = useRef([]);
    const [linhaTempoVisiveis, setLinhaTempoVisiveis] = useState([]);
    const [linhaTempoAtivo, setLinhaTempoAtivo] = useState(-1);

    // Fundo com imagem por item da linha do tempo: duas camadas empilhadas
    // que alternam entre si (crossfade) — a camada "de trás" recebe a nova
    // imagem e sobe a opacidade, enquanto a camada visível atual desce a
    // opacidade, evitando qualquer "piscada" ao trocar de imagem.
    const [camadasFundo, setCamadasFundo] = useState([
        { src: null, visivel: false },
        { src: null, visivel: false },
    ]);
    const camadaAtivaRef = useRef(0);

    // Texto de missão — cada LETRA vira um <span> que vai de "apagada" (cinza)
    // para branca conforme a página rola (ver useEffect "Preenche o texto de
    // missão..." abaixo). Edite a frase livremente aqui.
    const missaoTexto =
        "Minha missão é desenvolver sites e experiências digitais que fortaleçam marcas, gerem resultados e ajudem empresas a crescer com design moderno, estratégia e tecnologia.";

    // Conteúdo da linha do tempo — edite número/título/descrição livremente aqui
const BASE = import.meta.env.BASE_URL;

const linhaTempo = [
    { ano: "01.", titulo: "Descoberta", descricao: "Entendo o negócio, seus objetivos e o que precisa ser resolvido.", imagem: `${BASE}item1.jpg` },
    { ano: "02.", titulo: "Estratégia", descricao: "Defino a estrutura, funcionalidades e a melhor experiência para o usuário.", imagem: `${BASE}item2.jpg` },
    { ano: "03.", titulo: "Design", descricao: "Crio uma identidade visual moderna, intuitiva e alinhada à marca.", imagem: `${BASE}item3.jpg` },
    { ano: "04.", titulo: "Desenvolvimento", descricao: "Transformo o projeto em um site ou sistema funcional, rápido e responsivo.", imagem: `${BASE}item4.jpg` },
    { ano: "05.", titulo: "Entrega e evolução", descricao: "Testo, ajusto e entrego a solução pronta para crescer junto com o negócio.", imagem: `${BASE}item5.jpg` },
];

    useEffect(() => {
        document.body.classList.add("pagina-aberta");
        return () => document.body.classList.remove("pagina-aberta");
    }, []);

    // Ajusta o tamanho da fonte do nome para nunca ultrapassar a largura da tela
    useEffect(() => {
        const TAMANHO_MAXIMO = 190;
        const TAMANHO_MINIMO = 28;

        const ajustarFonte = () => {
            const nome = nomeRef.current;
            const hero = heroRef.current;
            if (!nome || !hero) return;

            // Em telas pequenas o nome quebra em duas linhas (regra definida no CSS)
            if (window.innerWidth <= 768) {
                nome.style.fontSize = "";
                return;
            }

            const larguraDisponivel = hero.clientWidth;
            let tamanho = TAMANHO_MAXIMO;
            nome.style.fontSize = tamanho + "px";

            while (nome.scrollWidth > larguraDisponivel && tamanho > TAMANHO_MINIMO) {
                tamanho -= 2;
                nome.style.fontSize = tamanho + "px";
            }
        };

        ajustarFonte();
        // Garante recálculo após a fonte DM Sans carregar (evita medir com fonte de fallback)
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(ajustarFonte);
        }

        window.addEventListener("resize", ajustarFonte);
        return () => window.removeEventListener("resize", ajustarFonte);
    }, []);

    useEffect(() => {
        const cortina = cortinaRef.current;
        cortina.classList.add("cortina-entrando");
        const fase2 = setTimeout(() => {
            setPaginaVisivel(true);
            cortina.classList.remove("cortina-entrando");
            cortina.classList.add("cortina-saindo");
        }, 550);
        return () => clearTimeout(fase2);
    }, []);

    const handleVoltar = () => {
        const cortina = cortinaRef.current;
        cortina.classList.remove("cortina-saindo");
        cortina.classList.add("cortina-fecha-entrando");
        setTimeout(() => {
            setPaginaVisivel(false);
            onClose();
            cortina.classList.remove("cortina-fecha-entrando");
            cortina.classList.add("cortina-fecha-saindo");
        }, 550);
    };

    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") handleVoltar(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    // Efeito parallax forte na foto e nos textos do hero: cada camada se
    // desloca em velocidade diferente do scroll (a .pagina rola internamente,
    // não a window), criando sensação de profundidade.
    useEffect(() => {
        const pagina = paginaRef.current;
        const wrapper = fotoWrapperRef.current;
        const img = fotoImgRef.current;
        const nomeWrapper = nomeWrapperRef.current;
        const rodape = rodapeRef.current;
        if (!pagina || !wrapper || !img) return;

        const INTENSIDADE = 0.55;       // parallax da foto
        const INTENSIDADE_NOME = 0.42;  // parallax do nome + assinatura (camada de trás)
        const INTENSIDADE_CARGO = 0.75; // parallax do cargo (camada da frente, mais rápida)
        const DISTANCIA_FADE = 420;     // px de scroll até o texto sumir por completo

        let ticking = false;

        const atualizar = () => {
            const rectPagina  = pagina.getBoundingClientRect();
            const rectWrapper = wrapper.getBoundingClientRect();
            const scrollTop = pagina.scrollTop;

            // posição do centro do wrapper relativa ao centro da área visível da .pagina
            const centroWrapper = rectWrapper.top + rectWrapper.height / 2;
            const centroPagina  = rectPagina.top + rectPagina.height / 2;
            const distancia = centroWrapper - centroPagina;

            const deslocamento = distancia * -INTENSIDADE;
            img.style.transform = `translate3d(-50%, calc(-50% + ${deslocamento}px), 0) scale(1.25)`;

            if (nomeWrapper) {
                const deslocNome = scrollTop * -INTENSIDADE_NOME;
                const opNome = Math.max(1 - scrollTop / DISTANCIA_FADE, 0);
                nomeWrapper.style.transform = `translate3d(0, ${deslocNome}px, 0)`;
                nomeWrapper.style.opacity = opNome;
            }

            if (rodape) {
                const deslocCargo = scrollTop * -INTENSIDADE_CARGO;
                const opCargo = Math.max(1 - scrollTop / (DISTANCIA_FADE * 0.75), 0);
                rodape.style.transform = `translate3d(0, ${deslocCargo}px, 0)`;
                rodape.style.opacity = opCargo;
            }

            ticking = false;
        };

        const aoRolar = () => {
            if (!ticking) {
                window.requestAnimationFrame(atualizar);
                ticking = true;
            }
        };

        atualizar();
        pagina.addEventListener("scroll", aoRolar, { passive: true });
        window.addEventListener("resize", aoRolar);
        return () => {
            pagina.removeEventListener("scroll", aoRolar);
            window.removeEventListener("resize", aoRolar);
        };
    }, [paginaVisivel]);

    // "Por trás do processo criativo": o texto rola normalmente junto com a
    // página (sem sticky, sem ficar preso) e só o tamanho dele muda —
    // encolhe progressivamente conforme vai subindo pela tela.
    useEffect(() => {
        const pagina = paginaRef.current;
        const grupo = processoGrupoRef.current;
        if (!pagina || !grupo) return;

        const ESCALA_MINIMA = 0.45; // tamanho final, em relação ao tamanho original
        const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

        let ticking = false;

        const atualizar = () => {
            const rectPagina = pagina.getBoundingClientRect();
            const rectGrupo = grupo.getBoundingClientRect();

            // posição do topo do texto relativa ao topo da área visível da .pagina
            const topoRelativo = rectGrupo.top - rectPagina.top;

            // 0 = texto ainda embaixo, entrando pela parte de baixo da tela (tamanho cheio)
            // 1 = texto já subiu bastante e atingiu o tamanho mínimo
            const progresso = clamp01(
                (rectPagina.height - topoRelativo) / (rectPagina.height * 1.3)
            );

            const escala = 1 - progresso * (1 - ESCALA_MINIMA);
            grupo.style.transform = `scale(${escala})`;

            ticking = false;
        };

        const aoRolar = () => {
            if (!ticking) {
                window.requestAnimationFrame(atualizar);
                ticking = true;
            }
        };

        atualizar();
        pagina.addEventListener("scroll", aoRolar, { passive: true });
        window.addEventListener("resize", aoRolar);
        return () => {
            pagina.removeEventListener("scroll", aoRolar);
            window.removeEventListener("resize", aoRolar);
        };
    }, [paginaVisivel]);

    useEffect(() => {
        const pagina = paginaRef.current;
        const grupo = processoGrupoRef.current;
        const linha1 = processoLinha1Ref.current;
        const linha2 = processoLinha2Ref.current;
        const linha3 = processoLinha3Ref.current;
        if (!pagina || !grupo || !linha1 || !linha2 || !linha3) return;

        const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

        // velocidades diferentes por linha (via multiplicador no progresso-alvo),
        // criando uma leve cascata mesmo sem qualquer delay de tempo
        const VELOCIDADE_GLOBAL = 1.6;
        const VELOCIDADE_LINHA1 = 1.25; // chega primeiro
        const VELOCIDADE_LINHA2 = 1.1;
        const VELOCIDADE_LINHA3 = 1.0;  // chega por último
        // quanto menor, mais suave e com mais atraso (a linha "arrasta" atrás
        // do alvo); quanto maior, mais rápido e colado ao scroll
        const SUAVIZACAO = 0.05;

        // valores atuais (em %), começam fora da tela — mesmo estado do CSS inicial
        let atual1 = 115;
        let atual2 = 115;
        let atual3 = 115;
        let frameId;

        const passo = () => {
            const rectPagina = pagina.getBoundingClientRect();
            const rectGrupo = grupo.getBoundingClientRect();
            const topoRelativo = rectGrupo.top - rectPagina.top;
            const progresso = clamp01(
                (rectPagina.height - topoRelativo) / (rectPagina.height * 1.1)
            );

            const alvo1 = (1 - clamp01(progresso * VELOCIDADE_GLOBAL * VELOCIDADE_LINHA1)) * 115;
            const alvo2 = (1 - clamp01(progresso * VELOCIDADE_GLOBAL * VELOCIDADE_LINHA2)) * 115;
            const alvo3 = (1 - clamp01(progresso * VELOCIDADE_GLOBAL * VELOCIDADE_LINHA3)) * 115;

            atual1 += (alvo1 - atual1) * SUAVIZACAO;
            atual2 += (alvo2 - atual2) * SUAVIZACAO;
            atual3 += (alvo3 - atual3) * SUAVIZACAO;

            linha1.style.transform = `translateX(${-atual1}%)`;
            linha2.style.transform = `translateX(${atual2}%)`;
            linha3.style.transform = `translateX(${-atual3}%)`;

            frameId = requestAnimationFrame(passo);
        };

        frameId = requestAnimationFrame(passo);
        return () => cancelAnimationFrame(frameId);
    }, [paginaVisivel]);

    // Revela o texto de missão com um fade suave quando ele entra na área
    // visível do scroll (o root é a .pagina, que é quem rola de fato).
    useEffect(() => {
        const pagina = paginaRef.current;
        const alvo = missaoRef.current;
        if (!pagina || !alvo) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setMissaoVisivel(true);
                        observer.disconnect();
                    }
                });
            },
            { root: pagina, threshold: 0.3 }
        );

        observer.observe(alvo);
        return () => observer.disconnect();
    }, []);

    // Preenche o texto de missão letra por letra: cada <span> começa
    // "apagado" (cinza, pouca opacidade) e vai ficando branco conforme o
    // texto sobe pela tela — como se as letras fossem "acendendo" à medida
    // que você lê/rola. Mesmo estilo de suavização (lerp) usado no trilho da
    // linha do tempo, para o preenchimento acompanhar o scroll com atraso suave.
    useEffect(() => {
        const pagina = paginaRef.current;
        const texto = missaoTextoRef.current;
        if (!pagina || !texto) return;

        const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
        const ALCANCE = 10;     // nº de letras "acendendo" ao mesmo tempo (suaviza a transição)
        const OPACIDADE_APAGADA = 0.22;
        const SUAVIZACAO = 0.15; // menor = mais atraso/suavidade atrás do scroll

        let progressoAtual = 0;
        let frameId;

        const passo = () => {
            const letras = missaoLetrasRef.current.filter(Boolean);

            if (letras.length) {
                const rectPagina = pagina.getBoundingClientRect();
                const rectTexto = texto.getBoundingClientRect();

                // início: topo do texto ainda perto do fundo da área visível (0%)
                // fim: topo do texto já subiu perto do topo da área visível (100%)
                const inicio = rectPagina.top + rectPagina.height * 0.85;
                const fim = rectPagina.top + rectPagina.height * 0.25;
                const alvo = clamp01((inicio - rectTexto.top) / (inicio - fim));

                progressoAtual += (alvo - progressoAtual) * SUAVIZACAO;

                const numLetras = letras.length;
                letras.forEach((el, i) => {
                    const bruto = progressoAtual * (numLetras + ALCANCE) - i;
                    const valor = clamp01(bruto / ALCANCE);
                    el.style.opacity = (OPACIDADE_APAGADA + valor * (1 - OPACIDADE_APAGADA)).toFixed(3);
                });
            }

            frameId = requestAnimationFrame(passo);
        };

        frameId = requestAnimationFrame(passo);
        return () => cancelAnimationFrame(frameId);
    }, [paginaVisivel]);

    // Revela cada item da linha do tempo individualmente, em cascata,
    // conforme ele entra na área visível do scroll (mesma lógica da missão,
    // mas aplicada a vários elementos).
    useEffect(() => {
        const pagina = paginaRef.current;
        if (!pagina) return;

        setLinhaTempoVisiveis(new Array(linhaTempo.length).fill(false));

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.dataset.index);
                        setLinhaTempoVisiveis((prev) => {
                            if (prev[index]) return prev;
                            const proximo = [...prev];
                            proximo[index] = true;
                            return proximo;
                        });
                        observer.unobserve(entry.target);
                    }
                });
            },
            { root: pagina, threshold: 0.25 }
        );

        linhaTempoItensRef.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);

    // Acompanha o scroll para saber, a cada momento, qual item da linha do
    // tempo está de fato visível na tela. Esse item fica em destaque; os
    // demais ficam apagados/acinzentados (ver .linha-tempo-item-ativo no CSS).
    useEffect(() => {
        const pagina = paginaRef.current;
        if (!pagina) return;

        let ticking = false;

        const atualizarAtivo = () => {
            const rectPagina = pagina.getBoundingClientRect();

            // faixa central da tela usada como referência (não a tela inteira):
            // o item só conta como "visível" pela parte dele que cai dentro
            // dessa faixa — assim um item curto não ativa cedo demais só por
            // estar inteiro perto da borda de baixo da tela
            const faixaTopo = rectPagina.top + rectPagina.height * 0.35;
            const faixaBaixo = rectPagina.top + rectPagina.height * 0.65;
            const alturaFaixa = faixaBaixo - faixaTopo;

            let maiorVisibilidade = 0;
            let indiceMaisVisivel = -1;

            linhaTempoItensRef.current.forEach((el, index) => {
                if (!el) return;
                const rect = el.getBoundingClientRect();

                const topoVisivel = Math.max(rect.top, faixaTopo);
                const baixoVisivel = Math.min(rect.bottom, faixaBaixo);
                const alturaVisivel = Math.max(0, baixoVisivel - topoVisivel);
                const referencia = Math.min(rect.height, alturaFaixa);
                const proporcaoVisivel = referencia > 0 ? alturaVisivel / referencia : 0;

                if (proporcaoVisivel > maiorVisibilidade) {
                    maiorVisibilidade = proporcaoVisivel;
                    indiceMaisVisivel = index;
                }
            });

            // só ativa quando o item está de fato tomando a faixa central da
            // tela — não basta estar visível em algum canto da tela
            const dentroDoAlcance = maiorVisibilidade > 0.8;
            setLinhaTempoAtivo(dentroDoAlcance ? indiceMaisVisivel : -1);
            ticking = false;
        };

        const aoRolar = () => {
            if (!ticking) {
                window.requestAnimationFrame(atualizarAtivo);
                ticking = true;
            }
        };

        atualizarAtivo();
        pagina.addEventListener("scroll", aoRolar, { passive: true });
        window.addEventListener("resize", aoRolar);
        return () => {
            pagina.removeEventListener("scroll", aoRolar);
            window.removeEventListener("resize", aoRolar);
        };
    }, [paginaVisivel]);

    // Troca a imagem de fundo conforme o item ativo da linha do tempo muda.
    // Usa a camada "inativa" para carregar a nova imagem e a traz para
    // frente; a camada anterior fica por baixo com opacidade zero.
    useEffect(() => {
        const imagem = linhaTempoAtivo >= 0 ? linhaTempo[linhaTempoAtivo]?.imagem ?? null : null;

        setCamadasFundo((prev) => {
            const ativa = camadaAtivaRef.current;

            if (!imagem) {
                if (!prev[ativa].visivel) return prev;
                const proximo = [...prev];
                proximo[ativa] = { ...proximo[ativa], visivel: false };
                return proximo;
            }

            if (prev[ativa].src === imagem && prev[ativa].visivel) return prev;

            const outra = ativa === 0 ? 1 : 0;
            const proximo = [...prev];
            proximo[outra] = { src: imagem, visivel: true };
            proximo[ativa] = { ...proximo[ativa], visivel: false };
            camadaAtivaRef.current = outra;
            return proximo;
        });
    }, [linhaTempoAtivo]);

    useEffect(() => {
        const pagina = paginaRef.current;
        const secao = linhaTempoSecaoRef.current;
        const trilho = trilhoRef.current;
        const progresso = trilhoProgressoRef.current;
        if (!pagina || !secao || !trilho || !progresso) return;

        const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
        let progressoAtual = 0;
        let frameId;

        const passo = () => {
            const pontos = pontoRefs.current.filter(Boolean);

            if (pontos.length >= 2) {
                const rectPagina = pagina.getBoundingClientRect();
                const rectSecao = secao.getBoundingClientRect();
                const rectPrimeiro = pontos[0].getBoundingClientRect();
                const rectUltimo = pontos[pontos.length - 1].getBoundingClientRect();

                const topoAbsoluto = rectPrimeiro.top + rectPrimeiro.height / 2;
                const baseAbsoluta = rectUltimo.top + rectUltimo.height / 2;
                const alturaTrilho = Math.max(baseAbsoluta - topoAbsoluto, 1);

                // posiciona e dimensiona a trilha para encostar exatamente no
                // centro do primeiro e do último ponto
                trilho.style.top = (topoAbsoluto - rectSecao.top) + "px";
                trilho.style.left = (rectPrimeiro.left + rectPrimeiro.width / 2 - rectSecao.left) + "px";
                trilho.style.height = alturaTrilho + "px";

                // linha de referência: centro da área visível da .pagina —
                // quando ela cruza o primeiro ponto, progresso = 0; quando
                // cruza o último, progresso = 1
                const linhaReferencia = rectPagina.top + rectPagina.height * 0.5;
                const alvo = clamp01((linhaReferencia - topoAbsoluto) / alturaTrilho);

                // suaviza o preenchimento (mesmo estilo do "por trás do processo criativo")
                progressoAtual += (alvo - progressoAtual) * 0.12;
                progresso.style.height = (progressoAtual * 100) + "%";
            }

            frameId = requestAnimationFrame(passo);
        };

        frameId = requestAnimationFrame(passo);
        return () => cancelAnimationFrame(frameId);
    }, [paginaVisivel]);

    // "Scroll-jacking" suave dentro da linha do tempo: enquanto a seção
    // estiver ocupando a tela, cada scroll (roda do mouse/trackpad ou
    // arraste no touch) avança ou volta exatamente UM item por vez, com uma
    // transição extremamente suave (easing customizado via
    // requestAnimationFrame, não o "smooth" nativo do navegador). Antes do
    // primeiro item e depois do último o scroll volta a ser livre, para
    // entrar/sair da seção com naturalidade.
    useEffect(() => {
        const pagina = paginaRef.current;
        const secao = linhaTempoSecaoRef.current;
        if (!pagina || !secao) return;

        let animando = false;
        let travaId = null;
        const DURACAO_MS = 1500;

        // easeInOutCubic — acelera e desacelera suavemente, sem nenhum
        // solavanco no começo nem no fim do movimento
        const facilitador = (t) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const animarScrollPara = (destino) => {
            animando = true;
            const origem = pagina.scrollTop;
            const distancia = destino - origem;
            const inicio = performance.now();

            const passo = (agora) => {
                const decorrido = agora - inicio;
                const progresso = Math.min(decorrido / DURACAO_MS, 1);
                pagina.scrollTop = origem + distancia * facilitador(progresso);

                if (progresso < 1) {
                    requestAnimationFrame(passo);
                } else {
                    // pequena folga antes de liberar novos disparos, pra
                    // absorver eventos de "momentum" residuais do trackpad
                    travaId = setTimeout(() => { animando = false; }, 120);
                }
            };
            requestAnimationFrame(passo);
        };

        const indiceMaisProximoDoCentro = () => {
            const rectPagina = pagina.getBoundingClientRect();
            const centroPagina = rectPagina.top + rectPagina.height / 2;
            let menorDistancia = Infinity;
            let indice = 0;

            linhaTempoItensRef.current.forEach((el, i) => {
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const centroItem = rect.top + rect.height / 2;
                const distancia = Math.abs(centroItem - centroPagina);
                if (distancia < menorDistancia) {
                    menorDistancia = distancia;
                    indice = i;
                }
            });

            return indice;
        };

        const scrollParaItem = (indice) => {
            const el = linhaTempoItensRef.current[indice];
            if (!el) return;
            const rectPagina = pagina.getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            const centroPagina = rectPagina.top + rectPagina.height / 2;
            const centroItem = rect.top + rect.height / 2;
            animarScrollPara(pagina.scrollTop + (centroItem - centroPagina));
        };

        // a seção "conta" como em uso quando parte dela está de fato visível
        // na área da página — só aí o scroll fica "preso" andando item a item
        const dentroDaSecao = () => {
            const rectSecao = secao.getBoundingClientRect();
            const rectPagina = pagina.getBoundingClientRect();
            return rectSecao.top < rectPagina.bottom && rectSecao.bottom > rectPagina.top;
        };

        const tentarAvancar = (direcao) => {
            const alvo = indiceMaisProximoDoCentro() + direcao;

            // nas pontas (antes do 1º item / depois do último) libera o
            // scroll normal, pra sair da seção com naturalidade
            if (alvo < 0 || alvo > linhaTempo.length - 1) return false;

            scrollParaItem(alvo);
            return true;
        };

        const aoRodaMouse = (e) => {
            if (!dentroDaSecao()) return;

            if (animando) {
                e.preventDefault();
                return;
            }

            if (tentarAvancar(e.deltaY > 0 ? 1 : -1)) e.preventDefault();
        };

        let toqueInicioY = null;

        const aoTocarInicio = (e) => {
            toqueInicioY = dentroDaSecao() ? e.touches[0].clientY : null;
        };

        const aoTocarMover = (e) => {
            if (toqueInicioY === null) return;

            if (animando) {
                e.preventDefault();
                return;
            }

            const yAtual = e.touches[0].clientY;
            const deslocamento = toqueInicioY - yAtual;
            const LIMIAR = 40; // px mínimos de arraste pra contar como "um scroll"

            if (Math.abs(deslocamento) > LIMIAR) {
                if (tentarAvancar(deslocamento > 0 ? 1 : -1)) {
                    e.preventDefault();
                    toqueInicioY = yAtual;
                }
            }
        };

        const aoTocarFim = () => { toqueInicioY = null; };

        pagina.addEventListener("wheel", aoRodaMouse, { passive: false });
        pagina.addEventListener("touchstart", aoTocarInicio, { passive: true });
        pagina.addEventListener("touchmove", aoTocarMover, { passive: false });
        pagina.addEventListener("touchend", aoTocarFim, { passive: true });

        return () => {
            pagina.removeEventListener("wheel", aoRodaMouse);
            pagina.removeEventListener("touchstart", aoTocarInicio);
            pagina.removeEventListener("touchmove", aoTocarMover);
            pagina.removeEventListener("touchend", aoTocarFim);
            if (travaId) clearTimeout(travaId);
        };
    }, [paginaVisivel]);

    return (
        <>
            <div ref={cortinaRef} className="cortina" />
            <div
                ref={paginaRef}
                className={"pagina" + (paginaVisivel ? " pagina-visivel" : "")}
            >
                {camadasFundo.map((camada, i) => (
                    <div
                        key={i}
                        className={"pagina-fundo" + (camada.visivel ? " pagina-fundo-visivel" : "")}
                        style={
                            camada.src
                                ? {
                                      backgroundImage:
                                          `linear-gradient(rgba(0,0,0,0.712), rgba(0,0,0,0.745)), url(${camada.src})`,
                                  }
                                : undefined
                        }
                        aria-hidden="true"
                    />
                ))}

                <button className="botao-voltar" onClick={handleVoltar}>
                    <span className="botao-voltar-seta">←</span>
                </button>

                <div className="hero" ref={heroRef}>
                    <div className="hero-topo">
                        <div className="hero-nome-wrapper" ref={nomeWrapperRef}>
                            <h1 className="hero-nome" ref={nomeRef}>
                                VINÍCIUS <br className="hero-nome-quebra" />KAWASUGUI
                            </h1>

                            {/* Assinatura "Santiago" desenhada como se fosse escrita à mão:
                                o SVG traça o contorno das letras (stroke-dashoffset) e,
                                em seguida, a tinta preenche o traço. */}
                            <div className={"hero-santiago" + (paginaVisivel ? " hero-santiago-escrevendo" : "")}>
                                <svg
                                    className="hero-santiago-svg"
                                    viewBox="0 0 330 140"
                                    preserveAspectRatio="xMinYMid meet"
                                >
                                    <text x="6" y="105" className="hero-santiago-texto">
                                        Santiago
                                    </text>
                                </svg>
                            </div>
                        </div>

                        <div className={"hero-rodape" + (paginaVisivel ? " hero-rodape-visivel" : "")} ref={rodapeRef}>
                            <div className="hero-cargo-mascara">
                                <p className="hero-cargo">
                                    Web Designer<br />e Desenvolvedor
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="foto-secao" ref={fotoWrapperRef}>
                    <img
                        ref={fotoImgRef}
                        className="foto-secao-img"
                        src={`${import.meta.env.BASE_URL}Santiago1.jpg`}
                        alt="eu"
                    />
                    <div className="foto-secao-sombra" />
                </div>

                <div
                    className={"missao-secao" + (missaoVisivel ? " missao-secao-visivel" : "")}
                    ref={missaoRef}
                >
                    <p className="missao-texto" ref={missaoTextoRef}>
                        {missaoTexto.split("").map((letra, i) =>
                            letra === " " ? (
                                " "
                            ) : (
                                <span
                                    key={i}
                                    className="missao-letra"
                                    ref={(el) => (missaoLetrasRef.current[i] = el)}
                                >
                                    {letra}
                                </span>
                            )
                        )}
                    </p>
                </div>

                <div className="processo-secao">
                    <h2 className="processo-texto-grupo" ref={processoGrupoRef}>
                        <span className="processo-linha processo-linha-esquerda" ref={processoLinha1Ref}>
                            <span className="processo-texto">Por trás</span>
                        </span>
                        <span className="processo-linha processo-linha-direita" ref={processoLinha2Ref}>
                            <span className="processo-texto">do processo</span>
                        </span>
                        <span className="processo-linha processo-linha-esquerda" ref={processoLinha3Ref}>
                            <span className="processo-texto">criativo</span>
                        </span>
                    </h2>
                </div>

                {/* ── LINHA DO TEMPO ── */}
                <div className="linha-tempo-secao" ref={linhaTempoSecaoRef}>
                    {/* trilha única que acompanha o scroll: o trecho cinza é fixo,
                        o trecho colorido cresce conforme a página rola */}
                    <div className="linha-tempo-trilho" ref={trilhoRef} aria-hidden="true">
                        <div className="linha-tempo-trilho-progresso" ref={trilhoProgressoRef} />
                    </div>

                    {linhaTempo.map((item, index) => (
                        <div
                            key={item.ano}
                            ref={(el) => (linhaTempoItensRef.current[index] = el)}
                            data-index={index}
                            className={
                                "linha-tempo-item" +
                                (linhaTempoVisiveis[index] ? " linha-tempo-item-visivel" : "") +
                                (linhaTempoAtivo === index ? " linha-tempo-item-ativo" : "")
                            }
                        >
                            <div className="linha-tempo-ano-col">
                                <span className="linha-tempo-ano">{item.ano}</span>
                            </div>

                            <div className="linha-tempo-eixo-col">
                                <span
                                    className="linha-tempo-ponto"
                                    ref={(el) => (pontoRefs.current[index] = el)}
                                />
                            </div>

                            <div className="linha-tempo-descricao-col">
                                <h3 className="linha-tempo-titulo">{item.titulo}</h3>
                                <p className="linha-tempo-descricao">{item.descricao}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}