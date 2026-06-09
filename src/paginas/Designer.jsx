import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Designer.css";

const PROJECTS = [
  {
    label: "Designer de Roupa",
    desc: "Projeto no Figma com foco em UX, tipografia expressiva e identidade visual única",
    type: "UI/UX",
    image: "/designer/roupa.png",
    link: "https://www.figma.com/proto/C2CBBMK6sZ3NqDlQER8vXz/Kawa?node-id=40-52&p=f&t=3wMEfPb71WCkETQq-0&scaling=contain&content-scaling=fixed&page-id=0%3A1",
  },
  {
    label: "Barbearia",
    desc: "Identidade visual e landing page para barbearia urbana com foco em conversão",
    type: "Serviços / UI",
    image: "/designer/barbearia.PNG",
    link: "https://www.figma.com/proto/jvZpBRqssemA92rRvezZPT/Untitled?node-id=2-6&p=f&t=MViT0JtzB9yw9EXa-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=2%3A6",
  },
  {
    label: "Pet Shop",
    desc: "Design de interface amigável e colorida para clínica veterinária e pet shop",
    type: "UI/UX",
    image: "/designer/petshop.PNG",
    link: "https://www.figma.com/proto/8GGxUQWTnV3NflPHdxvDbp/pet-shoop?node-id=4-7&starting-point-node-id=4%3A7",
  },
  {
    label: "Academia",
    desc: "Página de alta performance para academia com foco em captação de alunos",
    type: "Web Design",
    image: "/designer/academia.PNG",
    link: "https://www.figma.com/proto/Kz7A1ggBZinhCkml9aFRs6/projeto-academia?node-id=1-3&starting-point-node-id=1%3A3",
  },
  {
    label: "Souza Industrial",
    desc: "Portfólio digital para empresa industrial com navegação imersiva e animada",
    type: "UI / Motion",
    image: "/designer/souza.PNG",
    link: "https://www.figma.com/proto/Zz8UxpaWutVfM0326TpAfZ/SOUZA?node-id=6-11&p=f&t=EeTFp7LF7HeU3kRk-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1",
  },
  {
    label: "Vivi Art",
    desc: "Loja virtual para artista plástica com galeria interativa e checkout otimizado",
    type: "E-commerce",
    image: "/designer/viviart.PNG",
    link: "https://www.figma.com/proto/HIZKSZ2MGeAPpzfIbKKhE3/site-viviart-VER-1.2?node-id=1-2&t=v1Nr5V3hRXI0uXOy-0&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1",
  },
];


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
        className={`designer-meta__row${hovered ? " is-hovered" : ""}`}
        style={{ "--row-delay": `${index * 0.07}s` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
      >
        {/* Imagem do card — só visível no mobile via CSS */}
        <div className="row-card-img">
          <img src={project.image} alt={project.label} />
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

      <div
        className={"row-cursor-img" + (hovered ? " row-cursor-img--visible" : "")}
        style={{ left: mousePos.x, top: mousePos.y }}
      >
        <img src={project.image} alt={project.label} />
      </div>
    </>
  );
}

export default function Designer() {
  const [visible, setVisible] = useState(false);
  const navigate  = useNavigate();
  const exitRef   = useRef(null);   

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
            <ProjectRow key={project.label} project={project} index={i} />
          ))}
        </div>
      </div>

      
      <div className="exit-overlay" ref={exitRef} />
    </>
  );
}