import { useEffect, useRef, useState } from "react";
import "./Sobremim.css";
import Jogos from "./jogos";

// clamp01 precisa existir em escopo de módulo: o loop da linha do tempo usa
// essa função e, sem ela, o requestAnimationFrame quebrava no 1º frame — por
// isso a seção "passava reto" (sem scroll horizontal nem item ativo).
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

export default function Sobremim({ onClose }) {
    const cortinaRef = useRef(null);
    const paginaRef  = useRef(null);
    const painelPrincipalRef = useRef(null);
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
    const listaRef = useRef(null); // trilha horizontal que desliza com o scroll
    const trilhoScrollRef = useRef(null); // wrapper alto que dá espaço de scroll à seção sticky
    const pontoRefs = useRef([]);
    const [linhaTempoVisiveis, setLinhaTempoVisiveis] = useState([]);
    const [linhaTempoAtivo, setLinhaTempoAtivo] = useState(-1);
    const missaoTexto =
        "Minha missão é desenvolver sites e experiências digitais que fortaleçam marcas, gerem resultados e ajudem empresas a crescer com design moderno, estratégia e tecnologia.";

const linhaTempo = [
    { ano: "01.", titulo: "Descoberta", descricao: "Entendo o negócio, seus objetivos e o que precisa ser resolvido." },
    { ano: "02.", titulo: "Estratégia", descricao: "Defino a estrutura, funcionalidades e a melhor experiência para o usuário." },
    { ano: "03.", titulo: "Design", descricao: "Crio uma identidade visual moderna, intuitiva e alinhada à marca." },
    { ano: "04.", titulo: "Desenvolvimento", descricao: "Transformo o projeto em um site ou sistema funcional, rápido e responsivo." },
    { ano: "05.", titulo: "Entrega e evolução", descricao: "Testo, ajusto e entrego a solução pronta para crescer junto com o negócio." },
];

    useEffect(() => {
        document.body.classList.add("pagina-aberta");
        return () => document.body.classList.remove("pagina-aberta");
    }, []);

    useEffect(() => {
        const TAMANHO_MAXIMO = 190;
        const TAMANHO_MINIMO = 28;

        const ajustarFonte = () => {
            const nome = nomeRef.current;
            const hero = heroRef.current;
            if (!nome || !hero) return;

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

    useEffect(() => {
        const pagina = paginaRef.current;
        const grupo = processoGrupoRef.current;
        if (!pagina || !grupo) return;

        const ESCALA_MINIMA = 0.45; // tamanho final, em relação ao tamanho original

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

        const VELOCIDADE_GLOBAL = 1.6;
        const VELOCIDADE_LINHA1 = 1.25; // chega primeiro
        const VELOCIDADE_LINHA2 = 1.1;
        const VELOCIDADE_LINHA3 = 1.0;  // chega por último
        const SUAVIZACAO = 0.05;
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

    useEffect(() => {
        const pagina = paginaRef.current;
        const texto = missaoTextoRef.current;
        if (!pagina || !texto) return;

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

    useEffect(() => {
        const pagina = paginaRef.current;
        if (!pagina) return;

        setLinhaTempoVisiveis(new Array(linhaTempo.length).fill(false));

        // revela todos os itens de uma vez quando a seção da linha do tempo entra na tela
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setLinhaTempoVisiveis(new Array(linhaTempo.length).fill(true));
                        observer.disconnect();
                    }
                });
            },
            { root: pagina, threshold: 0.15 }
        );

        if (linhaTempoSecaoRef.current) observer.observe(linhaTempoSecaoRef.current);
        return () => observer.disconnect();
    }, []);

    // ── LINHA DO TEMPO HORIZONTAL ──
    // Mesmo padrão do jogos.jsx: um wrapper alto ("trilho") dá espaço de
    // scroll e a seção fica grudada no topo via position: sticky (NADA de
    // pin do GSAP — pin + scroller customizado causava vãos pretos e
    // quebrava a animação de entrada do jogos). Aqui só lemos o scroll e
    // convertemos em deslocamento horizontal da lista, com suavização.
    useEffect(() => {
        if (!paginaVisivel) return;
        const pagina = paginaRef.current;
        const trilhoScroll = trilhoScrollRef.current;
        const lista = listaRef.current;
        const progresso = trilhoProgressoRef.current;
        if (!pagina || !trilhoScroll || !lista || !progresso) return;

        let atual = 0;
        let frameId;

        // distância que a lista precisa andar na horizontal
        const distancia = () => Math.max(lista.scrollWidth - pagina.clientWidth, 1);

        // altura do trilho = 1 tela parada + a distância horizontal convertida em scroll
        const ajustarAltura = () => {
            trilhoScroll.style.height = (pagina.clientHeight + distancia()) + "px";
        };

        const passo = () => {
            const rectPagina = pagina.getBoundingClientRect();
            const rectTrilho = trilhoScroll.getBoundingClientRect();

            // 0 quando o topo do trilho encosta no topo da página;
            // 1 quando rolamos toda a "sobra" do trilho
            const alvo = clamp01((rectPagina.top - rectTrilho.top) / distancia());

            // suaviza o deslize (mesmo estilo de interpolação do resto da página)
            atual += (alvo - atual) * 0.12;

            lista.style.transform = "translate3d(" + (-atual * distancia()) + "px, 0, 0)";
            progresso.style.width = (atual * 100) + "%";

            // item ativo = o mais próximo do progresso atual
            const indice = Math.min(
                linhaTempo.length - 1,
                Math.round(atual * (linhaTempo.length - 1))
            );
            setLinhaTempoAtivo(indice);

            frameId = requestAnimationFrame(passo);
        };

        ajustarAltura();
        window.addEventListener("resize", ajustarAltura);
        frameId = requestAnimationFrame(passo);
        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener("resize", ajustarAltura);
        };
    }, [paginaVisivel]);

    return (
        <>
            <div ref={cortinaRef} className="cortina" />
            <div
                ref={paginaRef}
                className={"pagina" + (paginaVisivel ? " pagina-visivel" : "")}
            >
                <button className="botao-voltar" onClick={handleVoltar}>
                    <span className="botao-voltar-seta">←</span>
                </button>

                <div className="sobremim-painel" ref={painelPrincipalRef}>
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
                                    preserveAspectRatio="xMidYMid meet"
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

                {/* ── LINHA DO TEMPO (horizontal) ──
                    o wrapper alto dá espaço de scroll; a seção fica sticky no
                    topo e o scroll vertical vira deslocamento horizontal da
                    .linha-tempo-lista (mesmo padrão sticky do jogos.jsx) */}
                <div className="linha-tempo-trilho-scroll" ref={trilhoScrollRef}>
                <div className="linha-tempo-secao" ref={linhaTempoSecaoRef}>
                    <div className="linha-tempo-lista" ref={listaRef}>
                        {/* trilha horizontal única: o trecho colorido cresce
                            em largura conforme o scroll horizontal avança */}
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
                                <span className="linha-tempo-ano">{item.ano}</span>

                                <span
                                    className="linha-tempo-ponto"
                                    ref={(el) => (pontoRefs.current[index] = el)}
                                />

                                <h3 className="linha-tempo-titulo">{item.titulo}</h3>
                                <p className="linha-tempo-descricao">{item.descricao}</p>
                            </div>
                        ))}
                    </div>
                </div>
                </div>

                <Jogos />
                </div>
            </div>
        </>
    );
}