import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Designer.css";

const PROJECTS = [
  {
    label: "Designer de Roupa",
    desc: "Projeto no Figma com foco em UX, tipografia expressiva e identidade visual única",
    type: "UI/UX",
    image: "designer/roupa.png",
    link: "https://www.figma.com/proto/C2CBBMK6sZ3NqDlQER8vXz/Kawa?node-id=40-52&p=f&t=3wMEfPb71WCkETQq-0&scaling=contain&content-scaling=fixed&page-id=0%3A1",
  },
  {
    label: "Barbearia",
    desc: "Identidade visual e landing page para barbearia urbana com foco em conversão",
    type: "Serviços / UI",
    image: "designer/barbearia.PNG",
    link: "https://www.figma.com/proto/jvZpBRqssemA92rRvezZPT/Untitled?node-id=2-6&p=f&t=MViT0JtzB9yw9EXa-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=2%3A6",
  },
  {
    label: "Pet Shop",
    desc: "Design de interface amigável e colorida para clínica veterinária e pet shop",
    type: "UI/UX",
    image: "designer/petshop.PNG",
    link: "https://www.figma.com/proto/8GGxUQWTnV3NflPHdxvDbp/pet-shoop?node-id=4-7&starting-point-node-id=4%3A7",
  },
  {
    label: "Souza Industrial",
    desc: "Portfólio digital para empresa industrial com navegação imersiva e animada",
    type: "UI / Motion",
    image: "designer/souza.PNG",
    link: "https://www.figma.com/proto/Zz8UxpaWutVfM0326TpAfZ/SOUZA?node-id=6-11&p=f&t=EeTFp7LF7HeU3kRk-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1",
  },
  {
    label: "Vivi Art",
    desc: "Loja virtual para artista plástica com galeria interativa e checkout otimizado",
    type: "E-commerce",
    image: "designer/viviart.PNG",
    link: "https://www.figma.com/proto/HIZKSZ2MGeAPpzfIbKKhE3/site-viviart-VER-1.2?node-id=1-2&t=v1Nr5V3hRXI0uXOy-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1",
  },
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
      className={"row-cursor-img" + (visible ? " row-cursor-img--visible" : "")}
      style={{ left: smoothPos.current.x, top: smoothPos.current.y }}
    >
      <div className="row-cursor-img__backdrop" />
      {prevImage && (
        <img
          key={prevImage}
          src={`${baseUrl}${prevImage}`}
          alt=""
          className="row-cursor-img__photo row-cursor-img__photo--prev"
        />
      )}
      {currentImage && (
        <img
          key={currentImage}
          src={`${baseUrl}${currentImage}`}
          alt=""
          className="row-cursor-img__photo row-cursor-img__photo--active"
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

  // Pega "/" localmente ou "/Kawwa/" no GitHub Pages
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <div
      className={`designer-meta__row${hovered ? " is-hovered" : ""}`}
      style={{ "--row-delay": `${index * 0.07}s` }}
      onMouseEnter={() => { setHovered(true); onHoverStart(project); }}
      onMouseLeave={() => { setHovered(false); onHoverEnd(); }}
      onMouseMove={onMouseMove}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <div className="row-card-img">
        {/* Adicionado o baseUrl aqui */}
        <img src={`${baseUrl}${project.image}`} alt={project.label} />
      </div>

      {/* Campos desktop */}
      <span className="designer-meta__label">{project.label}</span>
      <span className="designer-meta__desc">{project.desc}</span>
      <span className="designer-meta__type">{project.type}</span>
      <span className="designer-meta__arrow">↗</span>

      {/* Rodapé mobile */}
      <div className="designer-meta__info-mobile">
        <div className="designer-meta__info-top">
          <span className="designer-meta__label">{project.label}</span>
          <span className="designer-meta__arrow" aria-hidden="true">↗</span>
        </div>
        <span className="designer-meta__type">{project.type}</span>
      </div>
    </div>
  );
}

export default function Designer() {
  const [visible, setVisible] = useState(false);
  const navigate  = useNavigate();
  const exitRef   = useRef(null);

  const [cursorVisible, setCursorVisible] = useState(false);
  const [hoveredImage,  setHoveredImage]  = useState(null);
  const [mousePos,      setMousePos]      = useState({ x: 0, y: 0 });
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
    el.classList.remove("exit-overlay--go");
    void el.offsetWidth;

    requestAnimationFrame(() => {
      el.style.setProperty("--exit-r", `${maxRadius}px`);
      el.classList.add("exit-overlay--go");
    });

    setTimeout(() => {
      navigate("/", {
        state: { from: "/designer", origin },
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
      <div className="designer-page">


        <button
          className={`designer-back${visible ? " is-visible" : ""}`}
          onClick={handleBack}
          aria-label="Voltar para Serviços"
        >
          ← Voltar
        </button>

        <h1 className={`designer-title${visible ? " is-visible" : ""}`}>
          WEB DESIGNER
        </h1>

        <div className={`designer-meta${visible ? " is-visible" : ""}`}>
          <div className="designer-meta__header">
            <span>CATEGORIA</span>
            <span>DESCRIÇÃO</span>
            <span>TIPO</span>
            <span />
          </div>

          <div className="designer-meta__divider" />

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

      
      <div className="exit-overlay" ref={exitRef} />
    </>
  );
}