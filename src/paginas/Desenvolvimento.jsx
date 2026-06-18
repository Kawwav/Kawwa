import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Desenvolvimento.css";
const PROJECTS = [
  {
    label: "Marinho",
    desc: "Site moderno e responsivo, com design contemporâneo e elegante, desenvolvido para o advogado Armando Haeffner Marinho Neto, de Curitiba",
    type: "Institucional",
    image: "desenvolvimento/marinho.PNG",
    link: "https://haeffnermarinho.adv.br/#/",
  },
  {
    label: "Zero (em construção)",
    desc: "Landing page desenvolvida para a empresa .ZERO, especializada em ações de degustação em mercados, que trabalha com marcas como Ambev, Heinz e Hemmer, e atua em redes como Festval, Condor e Carrefour, entre outras",
    type: "Landing Page",
    image: "desenvolvimento/zero.PNG",
    link: "https://kawwav.github.io/Zero-1.2/",
  },

 {
    label: "Site imobiliaria (em construção)",
    desc: "Encontre o imóvel dos seus sonhos: as melhores opções prontas para morar. ",
    type: "Corporativo",
    image: "desenvolvimento/jmarinho.png",
    link: "https://kawwav.github.io/Jmarinho-1.2/",
  },


  {
    label: "Site Bolsa (em construção)",
    desc: "Plataforma web com painel dinâmico e integração de dados em tempo real",
    type: "Web App",
    image: "desenvolvimento/sitebolsa.PNG",
    link: "https://kawwav.github.io/Viviart-Croch-v1.2/",
  },
  {
    label: "Souza",
    desc: "Site institucional com foco industrial, desenvolvido para apresentar a empresa Souza e seus serviços de manutenção e montagem industrial",
    type: "Corporativo",
    image: "desenvolvimento/souza (1).PNG",
    link: "https://souzaindustria.netlify.app/",
  }
];
// ─────────────────────────────────────────────

function ProjectRow({ project, index }) {
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const rafRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setMousePos({ x: e.clientX, y: e.clientY });
    });
  }, []);

  const handleClick = () => {
    window.open(project.link, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div
        className={`desenv-meta__row${hovered ? " is-hovered" : ""}`}
        style={{ "--row-delay": `${index * 0.07}s` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >

        <div className="desenv-card-img">
          <img src={project.image} alt={project.label} />
        </div>

        {/* Campos desktop */}
        <span className="desenv-meta__label">{project.label}</span>
        <span className="desenv-meta__desc">{project.desc}</span>
        <span className="desenv-meta__type">{project.type}</span>
        <span className="desenv-meta__arrow">↗</span>

        {/* Rodapé mobile */}
        <div className="desenv-meta__info-mobile">
          <div className="desenv-meta__info-top">
            <span className="desenv-meta__label">{project.label}</span>
            <span className="desenv-meta__arrow" aria-hidden="true">↗</span>
          </div>
          <span className="desenv-meta__type">{project.type}</span>
        </div>
      </div>


      <div
        className={"desenv-cursor-img" + (hovered ? " desenv-cursor-img--visible" : "")}
        style={{ left: mousePos.x, top: mousePos.y }}
      >
        <img src={project.image} alt={project.label} />
      </div>
    </>
  );
}

export default function Desenvolvimento() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const exitRef  = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleBack = useCallback((e) => {
    const el = exitRef.current;
    if (!el) { navigate(-1); return; }

    const origin = e
      ? { x: e.clientX, y: e.clientY }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const maxRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth  - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );

    el.style.setProperty("--exit-x", `${origin.x}px`);
    el.style.setProperty("--exit-y", `${origin.y}px`);
    el.style.setProperty("--exit-r", `0px`);
    el.classList.remove("desenv-exit-overlay--go");
    void el.offsetWidth;

    requestAnimationFrame(() => {
      el.style.setProperty("--exit-r", `${maxRadius}px`);
      el.classList.add("desenv-exit-overlay--go");
    });

    setTimeout(() => {
      navigate("/", {
        state: { from: "/desenvolvimento", origin },
      });
    }, 1000);
  }, [navigate]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleBack(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBack]);

  return (
    <>
      <div className="desenv-page">

        <button
          className={`desenv-back${visible ? " is-visible" : ""}`}
          onClick={handleBack}
          aria-label="Voltar para Serviços"
        >
          ← Voltar
        </button>

        <h1 className={`desenv-title${visible ? " is-visible" : ""}`}>
          DESENVOLVIMENTO
        </h1>

        <div className={`desenv-meta${visible ? " is-visible" : ""}`}>
          <div className="desenv-meta__header">
            <span>PROJETO</span>
            <span>DESCRIÇÃO</span>
            <span>TIPO</span>
            <span />
          </div>

          <div className="desenv-meta__divider" />

          {PROJECTS.map((project, i) => (
            <ProjectRow key={project.label} project={project} index={i} />
          ))}
        </div>
      </div>

      <div className="desenv-exit-overlay" ref={exitRef} />
    </>
  );
}
