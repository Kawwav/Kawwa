import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Servicos.css";

const GALLERY_IMAGES = {
  designer: [
    "/designer/academia.PNG",
    "/designer/barbearia.PNG",
    "/designer/petshop.PNG",
    "/designer/roupa.png",
    "/designer/souza.PNG",
    "/designer/viviart.PNG",
  ],
  desenvolvimento: [
    "/desenvolvimento/marinho.PNG",
    "/desenvolvimento/zero.PNG",
    "/desenvolvimento/igor.PNG",
    "/desenvolvimento/sitebolsa.PNG",
    "/desenvolvimento/souza (1).PNG",
    "/desenvolvimento/barbearia (1).PNG",
  ],
};

const ITEMS = [
  {
    title: "WEB DESIGNER",
    num: "01",
    hasGallery: true,
    folder: "designer",
    hasSplit: true,
    route: "/designer",
  },
  {
    title: "DESENVOLVIMENTO",
    num: "02",
    hasGallery: true,
    folder: "desenvolvimento",
    hasSplit: true,
    route: "/desenvolvimento",
  },
];

/* ─── Galeria no cursor ─── */
function CursorGallery({ mousePos, visible, images }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!visible) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setPrevIndex(currentIndex);
      setCurrentIndex((i) => (i + 1) % images.length);
    }, 2000);
    return () => clearInterval(intervalRef.current);
  }, [visible, currentIndex, images]);

  useEffect(() => {
    if (visible) { setCurrentIndex(0); setPrevIndex(null); }
  }, [visible]);

  return (
    <div
      className={"cursor-gallery" + (visible ? " cursor-gallery--visible" : "")}
      style={{ left: mousePos.x, top: mousePos.y }}
    >
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={[
            "cursor-gallery__img",
            i === currentIndex ? "cursor-gallery__img--active" : "",
            i === prevIndex    ? "cursor-gallery__img--prev"   : "",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

/* ─── Item da lista ─── */
function SplitItem({ item, index, onMouseEnter, onMouseLeave, onMouseMove, onSplitClick }) {
  const [split, setSplit] = useState(false);
  const itemRef = useRef(null);
  const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  const handleClick = (e) => {
    if (!item.hasSplit || split) return;
    setSplit(true);
    onMouseLeave(item);

    const rect = itemRef.current?.getBoundingClientRect();
    const origin = rect
      ? { x: e.clientX || rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    setTimeout(() => onSplitClick(item.route, origin), 500);
  };

  return (
    <li
      ref={itemRef}
      className={[
        "servicos-item",
        item.hasGallery && !split && !isTouchDevice ? "servicos-item--gallery"   : "",
        item.hasSplit             ? "servicos-item--splittable" : "",
        split                     ? "servicos-item--split"      : "",
      ].join(" ")}
      style={{ "--item-delay": `${index * 0.12}s` }}
      onMouseEnter={() => { if (!split && !isTouchDevice) onMouseEnter(item); }}
      onMouseLeave={() => { if (!split && !isTouchDevice) onMouseLeave(item); }}
      onMouseMove={item.hasGallery && !split && !isTouchDevice ? onMouseMove : undefined}
      onClick={handleClick}
    >
      <div className="servicos-item__row">
        <div className="servicos-item__half servicos-item__half--top">
          <h2 className="servicos-item-title">{item.title}</h2>
          <span className="servicos-item-num">{item.num}</span>
        </div>
        <div className="servicos-item__half servicos-item__half--bottom">
          <h2 className="servicos-item-title">{item.title}</h2>
          <span className="servicos-item-num">{item.num}</span>
        </div>
        <div className="servicos-item__hover-bg" />
      </div>
    </li>
  );
}

/* ─── Componente principal ─── */
export default function Servicos() {
  const sectionRef  = useRef(null);
  const navigate    = useNavigate();
  const location    = useLocation();
  const zoomRef     = useRef(null);   // overlay de SAÍDA (entrar numa rota)
  const revealRef   = useRef(null);   // overlay de ENTRADA (voltar de uma rota)

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [activeFolder,   setActiveFolder]   = useState("designer");
  const [mousePos,       setMousePos]       = useState({ x: 0, y: 0 });
  const [zoomTarget,     setZoomTarget]     = useState(null);

  const rafRef = useRef(null);

  /* ── Animação de ENTRADA reversa (vindo do Designer de volta) ── */
  useEffect(() => {
    // só roda se veio de uma rota filha (state.from definido pelo Designer)
    const from = location.state?.from;
    if (!from) return;

    // Scroll imediato para a seção de serviços (antes da animação começar)
    const section = sectionRef.current;
    if (section) {
      window.scrollTo({ top: section.offsetTop, behavior: "instant" });
    }

    const el = revealRef.current;
    if (!el) return;

    const origin = location.state?.origin ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    const maxRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth  - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );

    // começa grande (cobrindo tudo) e fecha até raio 0
    el.style.setProperty("--reveal-x", `${origin.x}px`);
    el.style.setProperty("--reveal-y", `${origin.y}px`);
    el.style.setProperty("--reveal-r", `${maxRadius}px`);
    el.classList.remove("reveal-overlay--go");

    // força reflow
    void el.offsetWidth;

    
    requestAnimationFrame(() => {
      el.style.setProperty("--reveal-r", `0px`);
      el.classList.add("reveal-overlay--go");
    });
  }, []);  

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) section.classList.add("is-visible");
        else section.classList.remove("is-visible");
      },
      { threshold: 0.15 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setMousePos({ x: e.clientX, y: e.clientY });
    });
  }, []);

  const handleSplitClick = useCallback((route, origin) => {
    const el = zoomRef.current;
    if (!el) return;

    const maxRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth  - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );

    el.style.setProperty("--zoom-x", `${origin.x}px`);
    el.style.setProperty("--zoom-y", `${origin.y}px`);
    el.style.setProperty("--zoom-r", `0px`);
    el.classList.remove("zoom-overlay--go");
    setZoomTarget(route);
    void el.offsetWidth;

    requestAnimationFrame(() => {
      el.style.setProperty("--zoom-r", `${maxRadius}px`);
      el.classList.add("zoom-overlay--go");
    });

    setTimeout(() => navigate(route), 1000);
  }, [navigate]);

  return (
    <>
      <section className="servicos-section" ref={sectionRef}>
        <p className="servicos-label">Serviços</p>

        <ul className="servicos-list">
          {ITEMS.map((item, i) => (
            <SplitItem
              key={item.title}
              item={item}
              index={i}
              onMouseEnter={(it) => {
                if (it.hasGallery) { setActiveFolder(it.folder); setGalleryVisible(true); }
              }}
              onMouseLeave={(it) => { if (it.hasGallery) setGalleryVisible(false); }}
              onMouseMove={handleMouseMove}
              onSplitClick={handleSplitClick}
            />
          ))}
        </ul>

        <CursorGallery
          mousePos={mousePos}
          visible={galleryVisible}
          images={GALLERY_IMAGES[activeFolder]}
        />
      </section>

      <div className="zoom-overlay" ref={zoomRef} aria-hidden={zoomTarget === null} />

     
      <div className="reveal-overlay" ref={revealRef} />
    </>
  );
}