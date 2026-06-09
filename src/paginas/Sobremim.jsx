import { useEffect, useRef, useState } from "react";
import "./Sobremim.css";

export default function Sobremim({ onClose }) {
    const curtainRef  = useRef(null);
    const pageRef     = useRef(null);
    const stepsRef    = useRef([]);
    const lineRef     = useRef(null);
    const [pageVisible, setPageVisible] = useState(false);

    useEffect(() => {
        document.body.classList.add("sobremim-open");
        return () => document.body.classList.remove("sobremim-open");
    }, []);

    useEffect(() => {
        const curtain = curtainRef.current;
        curtain.classList.add("curtain-in");
        const phase2 = setTimeout(() => {
            setPageVisible(true);
            curtain.classList.remove("curtain-in");
            curtain.classList.add("curtain-out");
        }, 550);
        return () => clearTimeout(phase2);
    }, []);

    const handleBack = () => {
        const curtain = curtainRef.current;
        curtain.classList.remove("curtain-out");
        curtain.classList.add("curtain-close-in");
        setTimeout(() => {
            setPageVisible(false);
            onClose();
            curtain.classList.remove("curtain-close-in");
            curtain.classList.add("curtain-close-out");
        }, 550);
    };

    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") handleBack(); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    useEffect(() => {
        if (!pageVisible) return;

        const page  = pageRef.current;
        const line  = lineRef.current;
        const steps = stepsRef.current.filter(Boolean);
        if (!line || !steps.length) return;

        const handleScroll = () => {
            const wrapper       = line.parentElement;
            const wrapperTop    = wrapper.offsetTop;
            const wrapperHeight = wrapper.offsetHeight;

            
            const pen      = page.scrollTop + page.clientHeight * 0.70;
            const progress = Math.min(1, Math.max(0, (pen - wrapperTop) / wrapperHeight));

            // cresce a linha
            line.style.height = (progress * 100) + "%";

            
            const lineReachedPx = wrapperTop + progress * wrapperHeight;

            
            steps.forEach((step, i) => {
                const node    = step.querySelector(".sobremim-processo-node");
                const nodeTop = node.offsetTop + wrapperTop;
                const nodeMid = nodeTop + node.offsetHeight / 2;

                
                if (i === 0 || lineReachedPx >= nodeMid) {
                    step.classList.add("step-visible");
                }
            });
        };

        page.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll(); 
        return () => page.removeEventListener("scroll", handleScroll);
    }, [pageVisible]);

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
            <div ref={curtainRef} className="sobremim-curtain" />
            <div
                ref={pageRef}
                className={"sobremim-page" + (pageVisible ? " sm-visible" : "")}
            >
                <button className="sobremim-back" onClick={handleBack}>
                    <span className="sobremim-back-arrow">←</span>
                </button>

                <div className="sobremim-hero">
                    <div className="sobremim-hero-left">
                        <h1 className="sobremim-name">Vinícius<br />Kawasugui<br />Santiago</h1>
                        <p className="sobremim-bio">
                            Sou formado em Engenharia de Software e atuo como
                            desenvolvedor web e web designer. Ajudo empresas a
                            construírem uma presença digital forte e estratégica,
                            criando sites que vão além do básico.
                        </p>
                        <p className="sobremim-bio">
                            Tenho como foco desenvolver visuais modernos,
                            diferenciados e dinâmicos, sempre pensando na melhor
                            experiência para o usuário e nos resultados para o negócio.
                        </p>
                    </div>
                    <div className="sobremim-hero-right">
                        <div className="sobremim-img-wrap">
                            <img src="/eu2.jpg" alt="Vinícius Kawasugui Santiago" />
                            <div className="sobremim-img-overlay" />
                        </div>
                    </div>
                </div>

                <div className="sobremim-divider" />

                <div className="sobremim-processo">
                    <p className="sobremim-processo-eyebrow">O processo criativo</p>

                    <div className="sobremim-processo-steps">
                        {/* trilha cinza de fundo */}
                        <div className="sobremim-track-bg" />
                        {/* trilha branca que cresce */}
                        <div className="sobremim-track-fill" ref={lineRef} />

                        {processo.map((item, i) => {
                            const side = i % 2 === 0 ? "step-left" : "step-right";
                            return (
                                <div
                                    className={`sobremim-processo-step ${side}`}
                                    key={item.num}
                                    ref={(el) => (stepsRef.current[i] = el)}
                                >
                                    {side === "step-left" && (
                                        <div className="sobremim-processo-card">
                                            <p className="sobremim-processo-title">{item.title}</p>
                                            <p className="sobremim-processo-text">{item.text}</p>
                                        </div>
                                    )}

                                    <div className="sobremim-processo-node">
                                        <div className="sobremim-processo-dot">
                                            <span className="sobremim-processo-dot-num">{item.num}</span>
                                        </div>
                                    </div>

                                    {side === "step-right" && (
                                        <div className="sobremim-processo-card">
                                            <p className="sobremim-processo-title">{item.title}</p>
                                            <p className="sobremim-processo-text">{item.text}</p>
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