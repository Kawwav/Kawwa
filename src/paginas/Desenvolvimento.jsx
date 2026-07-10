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
    label: "Site imobiliaria",
    desc: "Encontre o imóvel dos seus sonhos: as melhores opções prontas para morar.",
    type: "Corporativo",
    image: "desenvolvimento/imobiliaria.png",
    link: "https://www.jmarinhoimoveis.com.br/",
  },


  {
    label: "Zero (em construção)",
    desc: "Landing page desenvolvida para a empresa .ZERO, especializada em ações de degustação em mercados, que trabalha com marcas como Ambev, Heinz e Hemmer, e atua em redes como Festval, Condor e Carrefour, entre outras",
    type: "Landing Page",
    image: "desenvolvimento/zero.PNG",
    link: "https://kawwav.github.io/Zero-1.2/",
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
  },

  {
    label: "Souza 1.2 (em construção)",
    desc: "Site institucional com foco industrial, desenvolvido para apresentar a empresa Souza e seus serviços de manutenção e montagem industrial. Com um versão melhorada",
    type: "Corporativo",
    image : "desenvolvimento/industrial.png",
    link: "https://kawwav.github.io/Souza-/",
  }
  

];

/* ─── Imagem que segue o cursor (backdrop + crossfade + delay suave) ─── */
function CursorImage({ mousePos, visible, image }) {
  const [currentImage, setCurrentImage] = useState(image);
  const [prevImage, setPrevImage] = useState(null);

  const containerRef = useRef(null);
  const targetPos = useRef(mousePos);
  const smoothPos = useRef(mousePos);
  const baseUrl = import.meta.env.BASE_URL;

  // mantém sempre o alvo (posição real do mouse) atualizado
  useEffect(() => {
    targetPos.current = mousePos;
  }, [mousePos]);

  // loop contínuo de interpolação (delay suave ao seguir o mouse)
  useEffect(() => {
    let raf;
    const EASE = 0.12; // menor = mais "atraso"/suavidade, maior = mais rápido/direto

    const animate = () => {
      smoothPos.current = {
        x: smoothPos.current.x + (targetPos.current.x - smoothPos.current.x) * EASE,
        y: smoothPos.current.y + (targetPos.current.y - smoothPos.current.y) * EASE,
      };

      if (containerRef.current) {
        containerRef.current.style.left = `${smoothPos.current.x}px`;
        containerRef.current.style.top = `${smoothPos.current.y}px`;
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  // crossfade: quando a imagem muda (troca de linha em hover), a antiga esmaece e a nova aparece
  useEffect(() => {
    if (image && image !== currentImage) {
      setPrevImage(currentImage);
      setCurrentImage(image);
    }
  }, [image]);

  return (
    <div
      ref={containerRef}
      className={"desenv-cursor-img" + (visible ? " desenv-cursor-img--visible" : "")}
      style={{ left: smoothPos.current.x, top: smoothPos.current.y }}
    >
      <div className="desenv-cursor-img__backdrop" />
      {prevImage && (
        <img
          key={prevImage}
          src={`${baseUrl}${prevImage}`}
          alt=""
          className="desenv-cursor-img__photo desenv-cursor-img__photo--prev"
        />
      )}
      {currentImage && (
        <img
          key={currentImage}
          src={`${baseUrl}${currentImage}`}
          alt=""
          className="desenv-cursor-img__photo desenv-cursor-img__photo--active"
        />
      )}
    </div>
  );
}

function ProjectRow({ project, index, onHoverStart, onHoverEnd, onMouseMove }) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    window.open(project.link, "_blank", "noopener,noreferrer");
  };

  // ADICIONE ESSA LINHA: Pega "/" localmente ou "/Kawwa/" no deploy online
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <div
      className={`desenv-meta__row${hovered ? " is-hovered" : ""}`}
      style={{ "--row-delay": `${index * 0.07}s` }}
      onMouseEnter={() => { setHovered(true); onHoverStart(project); }}
      onMouseLeave={() => { setHovered(false); onHoverEnd(); }}
      onMouseMove={onMouseMove}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >

      <div className="desenv-card-img">
        {/* ALTERADO: Incluído o baseUrl antes do caminho */}
        <img src={`${baseUrl}${project.image}`} alt={project.label} />
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
  );
}

export default function Desenvolvimento() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const exitRef  = useRef(null);

  const [cursorVisible,  setCursorVisible]  = useState(false);
  const [hoveredImage,   setHoveredImage]   = useState(null);
  const [mousePos,       setMousePos]       = useState({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setMousePos({ x: e.clientX, y: e.clientY });
    });
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
            <ProjectRow
              key={project.label}
              project={project}
              index={i}
              onHoverStart={(p) => { setHoveredImage(p.image); setCursorVisible(true); }}
              onHoverEnd={() => setCursorVisible(false)}
              onMouseMove={handleMouseMove}
            />
          ))}
        </div>

        <CursorImage
          mousePos={mousePos}
          visible={cursorVisible}
          image={hoveredImage}
        />
      </div>

      <div className="desenv-exit-overlay" ref={exitRef} />
    </>
  );
}