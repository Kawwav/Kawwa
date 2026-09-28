import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Sobremim.css";

gsap.registerPlugin(ScrollTrigger);

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

    // Scroll suave (Lenis) dentro do painel do "Sobre mim".
    // O scroll real acontece em .pagina (position: fixed + overflow auto),
    // por isso o Lenis usa esse elemento como wrapper e não a window.
    useEffect(() => {
        const pagina = paginaRef.current;
        const conteudo = painelPrincipalRef.current;
        if (!pagina || !conteudo) return;

        // pausa o Lenis global da home enquanto este painel está aberto
        window.__lenis?.stop();

        const lenis = new Lenis({
            wrapper: pagina,
            content: conteudo,
            lerp: 0.065,
            wheelMultiplier: 0.9,
            smoothWheel: true,
        });

        let rafId;
        const raf = (time) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
            window.__lenis?.start();
        };
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

        const INTENSIDADE = 0.55;       
        const INTENSIDADE_NOME = 0.42;
        const INTENSIDADE_CARGO = 0.75
        const DISTANCIA_FADE = 420;    

        let ticking = false;

        const atualizar = () => {
            const rectPagina  = pagina.getBoundingClientRect();
            const rectWrapper = wrapper.getBoundingClientRect();
            const scrollTop = pagina.scrollTop;

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

            const topoRelativo = rectGrupo.top - rectPagina.top;
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

    // "Por trás do processo criativo": linhas entram pelos lados com GSAP + ScrollTrigger.
    // O scroller é o .pagina (não a window). O trigger é o wrapper .processo-secao
    // (o h2 interno sofre scale em outro efeito, o que bagunçaria as posições).
    useEffect(() => {
        const pagina = paginaRef.current;
        const grupo = processoGrupoRef.current;
        const linha1 = processoLinha1Ref.current;
        const linha2 = processoLinha2Ref.current;
        const linha3 = processoLinha3Ref.current;
        if (!pagina || !grupo || !linha1 || !linha2 || !linha3) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                defaults: { ease: "power3.out", duration: 1 },
                scrollTrigger: {
                    trigger: grupo.parentElement,
                    scroller: pagina,
                    start: "top bottom",
                    end: "top 15%",
                    scrub: 1.2, // atraso suave entre o scroll e a animação
                    invalidateOnRefresh: true,
                },
            });

            // x: 0 zera o translateX vindo do CSS; xPercent faz o movimento
            tl.fromTo(linha1, { xPercent: -115, x: 0 }, { xPercent: 0 }, 0)
              .fromTo(linha2, { xPercent: 115,  x: 0 }, { xPercent: 0 }, 0.12)
              .fromTo(linha3, { xPercent: -115, x: 0 }, { xPercent: 0 }, 0.24);
        }, pagina);

        const refrescar = () => ScrollTrigger.refresh();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(refrescar);

        return () => ctx.revert();
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

        const ALCANCE = 10; 
        const OPACIDADE_APAGADA = 0.22;
        const SUAVIZACAO = 0.15;

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

    // Linha do tempo horizontal com GSAP + ScrollTrigger.
    // O wrapper alto (.linha-tempo-trilho-scroll) dá o espaço de scroll e a seção
    // sticky fica parada na tela; o scroll vertical do wrapper vira x da lista.
    useEffect(() => {
        if (!paginaVisivel) return;
        const pagina = paginaRef.current;
        const trilhoScroll = trilhoScrollRef.current;
        const lista = listaRef.current;
        const progresso = trilhoProgressoRef.current;
        if (!pagina || !trilhoScroll || !lista || !progresso) return;

        const distancia = () => Math.max(lista.scrollWidth - pagina.clientWidth, 1);

        // define a altura antes de cada medição do ScrollTrigger (inclusive no resize)
        const ajustarAltura = () => {
            trilhoScroll.style.height = (pagina.clientHeight + distancia()) + "px";
        };
        ajustarAltura();
        ScrollTrigger.addEventListener("refreshInit", ajustarAltura);

        let indiceAtual = -1;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                defaults: { ease: "none" },
                scrollTrigger: {
                    trigger: trilhoScroll,
                    scroller: pagina,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 1, // atraso suave (substitui o antigo * 0.12)
                    invalidateOnRefresh: true,
                    onUpdate: (self) => {
                        const indice = Math.min(
                            linhaTempo.length - 1,
                            Math.round(self.progress * (linhaTempo.length - 1))
                        );
                        if (indice !== indiceAtual) {
                            indiceAtual = indice;
                            setLinhaTempoAtivo(indice);
                        }
                    },
                },
            });

            tl.to(lista, { x: () => -distancia() }, 0)
              .fromTo(progresso, { width: "0%" }, { width: "100%" }, 0);
        }, pagina);

        ScrollTrigger.refresh();

        return () => {
            ScrollTrigger.removeEventListener("refreshInit", ajustarAltura);
            ctx.revert();
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
                <div className="linha-tempo-trilho-scroll" ref={trilhoScrollRef}>
                <div className="linha-tempo-secao" ref={linhaTempoSecaoRef}>
                    <div className="linha-tempo-lista" ref={listaRef}>
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
                </div>
            </div>
        </>
    );
}