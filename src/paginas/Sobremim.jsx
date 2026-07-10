import { useEffect, useRef, useState } from "react";
import "./Sobremim.css";

export default function Sobremim({ onClose }) {
    const cortinaRef = useRef(null);
    const paginaRef  = useRef(null);
    const etapasRef  = useRef([]);
    const linhaRef   = useRef(null);
    const fotoRef    = useRef(null);
    const textoRef   = useRef(null);
    const [paginaVisivel, setPaginaVisivel] = useState(false);

    useEffect(() => {
        document.body.classList.add("pagina-aberta");
        return () => document.body.classList.remove("pagina-aberta");
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

    // Revela cada card exatamente quando ele entra na área visível da tela,
    // e esconde de novo quando sai (rolando pra cima ou pra baixo)
    useEffect(() => {
        if (!paginaVisivel) return;

        const pagina = paginaRef.current;
        const etapas = etapasRef.current.filter(Boolean);
        if (!etapas.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    entry.target.classList.toggle("etapa-visivel", entry.isIntersecting);
                });
            },
            {
                root: pagina,
                // só considera "alcançado" quando o card entra na parte de baixo da tela
                rootMargin: "0px 0px -10% 0px",
                threshold: 0,
            }
        );

        etapas.forEach((etapa) => observer.observe(etapa));

        return () => observer.disconnect();
    }, [paginaVisivel]);

    // Efeito parallax na foto e no texto de introdução + progresso da linha do processo
    useEffect(() => {
        if (!paginaVisivel) return;

        const pagina = paginaRef.current;
        const linha  = linhaRef.current;
        const etapas = etapasRef.current.filter(Boolean);

        const handleScroll = () => {
            const scrollY = pagina.scrollTop;
            const emMobile = window.innerWidth <= 768;

            // parallax: a foto "atrasa" em relação ao scroll, o texto avança um pouco mais rápido
            if (fotoRef.current) {
                fotoRef.current.style.transform = emMobile
                    ? "translateY(0px)"
                    : `translateY(${scrollY * 0.18}px)`;
            }
            if (textoRef.current) {
                textoRef.current.style.transform = emMobile
                    ? "translateY(0px)"
                    : `translateY(${scrollY * -0.1}px)`;
            }

            if (!linha || !etapas.length) return;

            const wrapper    = linha.parentElement;
            const wrapperTop = wrapper.offsetTop;

            // a linha vai do centro do primeiro ponto até o centro do último ponto
            const primeiroNo = etapas[0].querySelector(".etapa-no");
            const ultimoNo   = etapas[etapas.length - 1].querySelector(".etapa-no");
            const inicio = wrapperTop + primeiroNo.offsetTop + primeiroNo.offsetHeight / 2;
            const fim    = wrapperTop + ultimoNo.offsetTop + ultimoNo.offsetHeight / 2;

            const alcance = scrollY + pagina.clientHeight * 0.5;
            let progresso = fim > inicio ? (alcance - inicio) / (fim - inicio) : 1;
            progresso = Math.min(1, Math.max(0, progresso));

            // se a página já chegou ao fim do scroll, força a linha a completar
            const maxScroll = pagina.scrollHeight - pagina.clientHeight;
            if (scrollY >= maxScroll - 2) progresso = 1;

            linha.style.height = (progresso * 100) + "%";
        };

        pagina.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => pagina.removeEventListener("scroll", handleScroll);
    }, [paginaVisivel]);

    const processo = [
        {
            num: "01",
            title: "Web Design",
            text: "Criar a versão visual do site utilizando Figma, Framer e Canva, conforme a aprovação do cliente.",
        },
        {
            num: "02",
            title: "Desenvolvimento",
            text: "Após a aprovação do design, inicio o desenvolvimento do projeto utilizando React e CSS no front-end, e PHP com MySQL no back-end. Todo o processo segue fielmente o design aprovado, com a aplicação de melhorias visuais e animações para enriquecer a experiência do usuário.",
        },
        {
            num: "03",
            title: "Finalização",
            text: "Depois que tudo estiver conforme o solicitado e aprovado pelo cliente, o site é finalizado e preparado para publicação.",
        },
    ];

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

                <div className="topo">
                    <div className="topo-texto" ref={textoRef}>
                        <h1 className="nome">Vinícius<br />Kawasugui<br />Santiago</h1>
                        <p className="bio">
                            Sou formado em Engenharia de Software e atuo como
                            desenvolvedor web e web designer. Ajudo empresas a
                            construírem uma presença digital forte e estratégica,
                            criando sites que vão além do básico.
                        </p>
                        <p className="bio">
                            Tenho como foco desenvolver visuais modernos,
                            diferenciados e dinâmicos, sempre pensando na melhor
                            experiência para o usuário e nos resultados para o negócio.
                        </p>
                    </div>
                    <div className="topo-foto">
                        <div className="foto" ref={fotoRef}>
                            <img src="eu2.jpg" alt="Vinícius Kawasugui Santiago" />
                            <div className="foto-sombra" />
                        </div>
                    </div>
                </div>

                <div className="divisor" />

                <div className="processo">
                    <p className="processo-titulo">O processo criativo</p>

                    <div className="processo-lista">
                        {/* trilha cinza de fundo */}
                        <div className="linha-base" />
                        {/* trilha branca que cresce */}
                        <div className="linha-progresso" ref={linhaRef} />

                        {processo.map((item, i) => {
                            const lado = i % 2 === 0 ? "etapa-esquerda" : "etapa-direita";
                            return (
                                <div
                                    className={`etapa ${lado}`}
                                    key={item.num}
                                    ref={(el) => (etapasRef.current[i] = el)}
                                >
                                    {lado === "etapa-esquerda" && (
                                        <div className="etapa-caixa">
                                            <p className="etapa-titulo">{item.title}</p>
                                            <p className="etapa-texto">{item.text}</p>
                                        </div>
                                    )}

                                    <div className="etapa-no">
                                        <div className="etapa-circulo">
                                            <span className="etapa-numero">{item.num}</span>
                                        </div>
                                    </div>

                                    {lado === "etapa-direita" && (
                                        <div className="etapa-caixa">
                                            <p className="etapa-titulo">{item.title}</p>
                                            <p className="etapa-texto">{item.text}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}