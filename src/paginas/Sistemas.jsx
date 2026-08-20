import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Sistemas.css";

const PROJECTS = [
  {
    label: "Sistema Barbearia",
    desc: "Sistema completo para barbearias, com agendamento online, cadastro de clientes e barbeiros, customização do site, acompanhamento financeiro e clube de assinatura para clientes",
    type: "Sistema Web",
    image: "sistemas/barbearia.png",
    link: "https://kawwav.github.io/sistemabarbearia/",
  },
];

function IconLista() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconGrade() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// Faz o ícone dentro do botão "seguir" o cursor com um leve efeito magnético
function useMouseFollow(strength = 0.35) {
  const handleMouseMove = (e) => {
    const btn = e.currentTarget;
    const icon = btn.querySelector("svg");
    if (!icon) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    icon.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const handleMouseLeave = (e) => {
    const icon = e.currentTarget.querySelector("svg");
    if (!icon) return;
    icon.style.transform = "translate(0px, 0px)";
  };

  return { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
}

const DURACAO_SAIDA = 850;
const DURACAO_ENTRADA = 1000;
const ATRASO_POR_ITEM = 60;

export default function Sistemas() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const exitRef = useRef(null);
  const baseUrl = import.meta.env.BASE_URL;

  const [visao, setVisao] = useState("lista");
  const [visaoExibida, setVisaoExibida] = useState("lista");
  const [fase, setFase] = useState("idle"); // "idle" | "saindo" | "entrando"
  const mouseFollow = useMouseFollow(0.3);
  const transicaoTimers = useRef([]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const trocarVisao = (nova) => {
    if (nova === visao || fase !== "idle") return;

    setVisao(nova);
    setFase("saindo");

    const maiorAtraso = (PROJECTS.length - 1) * ATRASO_POR_ITEM;
    const t1 = setTimeout(() => {
      setVisaoExibida(nova);
      setFase("entrando");

      const t2 = setTimeout(() => {
        setFase("idle");
      }, DURACAO_ENTRADA + maiorAtraso);
      transicaoTimers.current.push(t2);
    }, DURACAO_SAIDA + maiorAtraso);
    transicaoTimers.current.push(t1);
  };

  useEffect(() => {
    return () => transicaoTimers.current.forEach(clearTimeout);
  }, []);

  const listaRef = useRef(null);
  const caixaRef = useRef(null);
  const imagemRefA = useRef(null);
  const imagemRefB = useRef(null);
  const imagemAtivaRef = useRef(null);

  const handleListaMouseMove = (e) => {
    const container = listaRef.current;
    const caixa = caixaRef.current;
    if (!container || !caixa) return;
    const rect = container.getBoundingClientRect();
    caixa.style.left = `${e.clientX - rect.left}px`;
    caixa.style.top = `${e.clientY - rect.top}px`;
  };

  const handleItemMouseEnter = (src) => {
    const caixa = caixaRef.current;
    const imgA = imagemRefA.current;
    const imgB = imagemRefB.current;
    if (!caixa || !imgA || !imgB) return;

    caixa.classList.add("sistemas-hover-caixa--ativa");

    const atual = imagemAtivaRef.current;

    if (!atual) {
      imgA.src = src;
      imgA.classList.remove("sistemas-hover-imagem--saindo", "sistemas-hover-imagem--entrando");
      imgA.classList.add("sistemas-hover-imagem--ativa");
      imagemAtivaRef.current = imgA;
      return;
    }

    const proxima = atual === imgA ? imgB : imgA;

    atual.classList.remove("sistemas-hover-imagem--ativa");
    atual.classList.add("sistemas-hover-imagem--saindo");

    proxima.src = src;
    proxima.classList.remove("sistemas-hover-imagem--saindo");
    proxima.classList.add("sistemas-hover-imagem--entrando");

    void proxima.offsetWidth;

    proxima.classList.remove("sistemas-hover-imagem--entrando");
    proxima.classList.add("sistemas-hover-imagem--ativa");

    imagemAtivaRef.current = proxima;
  };

  const handleListaMouseLeave = () => {
    const caixa = caixaRef.current;
    if (caixa) caixa.classList.remove("sistemas-hover-caixa--ativa");
    const atual = imagemAtivaRef.current;
    if (atual) {
      atual.classList.remove("sistemas-hover-imagem--ativa", "sistemas-hover-imagem--entrando", "sistemas-hover-imagem--saindo");
    }
    imagemAtivaRef.current = null;
  };

  const handleBack = useCallback((e) => {
    const el = exitRef.current;
    if (!el) { navigate(-1); return; }

    const origin = e
      ? { x: e.clientX, y: e.clientY }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const maxRadius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    );

    el.style.setProperty("--exit-x", `${origin.x}px`);
    el.style.setProperty("--exit-y", `${origin.y}px`);
    el.style.setProperty("--exit-r", `0px`);
    el.classList.remove("sistemas-exit-overlay--go");
    void el.offsetWidth;

    requestAnimationFrame(() => {
      el.style.setProperty("--exit-r", `${maxRadius}px`);
      el.classList.add("sistemas-exit-overlay--go");
    });

    setTimeout(() => {
      navigate("/", { state: { from: "/sistemas", origin } });
    }, 1000);
  }, [navigate]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") handleBack(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBack]);

  const abrirProjeto = (link) => window.open(link, "_blank", "noopener,noreferrer");

  return (
    <>
      <div className="sistemas-page">
        <button
          className={`sistemas-back${visible ? " is-visible" : ""}`}
          onClick={handleBack}
          aria-label="Voltar para Serviços"
        >
          ← Voltar
        </button>

        <div className={`sistemas-topo${visible ? " is-visible" : ""}`}>
          <h1 className="sistemas-title">Sistemas</h1>

          <div className="sistemas-toggle">
            <button
              type="button"
              className={`sistemas-toggle-btn ${visao === "lista" ? "sistemas-toggle-btn--ativo" : ""}`}
              onClick={() => trocarVisao("lista")}
              onMouseMove={mouseFollow.onMouseMove}
              onMouseLeave={mouseFollow.onMouseLeave}
              aria-label="Ver como lista"
              aria-pressed={visao === "lista"}
              disabled={fase !== "idle"}
            >
              <IconLista />
            </button>
            <button
              type="button"
              className={`sistemas-toggle-btn ${visao === "grade" ? "sistemas-toggle-btn--ativo" : ""}`}
              onClick={() => trocarVisao("grade")}
              onMouseMove={mouseFollow.onMouseMove}
              onMouseLeave={mouseFollow.onMouseLeave}
              aria-label="Ver como grade"
              aria-pressed={visao === "grade"}
              disabled={fase !== "idle"}
            >
              <IconGrade />
            </button>
          </div>
        </div>

        {visaoExibida === "lista" && (
          <>
            <div className="sistemas-cabecalho">
              <span>Sistema</span>
              <span>Descrição</span>
              <span>Tipo</span>
              <span />
            </div>

            <div
              className={`sistemas-lista ${fase === "saindo" ? "sistemas-lista--saindo" : ""} ${fase === "entrando" ? "sistemas-lista--entrando" : ""}`}
              ref={listaRef}
              onMouseMove={handleListaMouseMove}
              onMouseLeave={handleListaMouseLeave}
            >
              {PROJECTS.map((p, i) => (
                <div
                  className="sistemas-item"
                  key={p.label}
                  style={{ "--i": i }}
                  onMouseEnter={() => handleItemMouseEnter(`${baseUrl}${p.image}`)}
                  onClick={() => abrirProjeto(p.link)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && abrirProjeto(p.link)}
                >
                  <h3 className="sistemas-item-label">{p.label}</h3>
                  <span className="sistemas-item-desc">{p.desc}</span>
                  <span className="sistemas-item-type">{p.type}</span>
                  <span className="sistemas-item-arrow">↗</span>
                </div>
              ))}

              <div className="sistemas-hover-caixa" ref={caixaRef}>
                <img src={`${baseUrl}${PROJECTS[0].image}`} alt="" className="sistemas-hover-imagem" ref={imagemRefA} />
                <img src={`${baseUrl}${PROJECTS[0].image}`} alt="" className="sistemas-hover-imagem" ref={imagemRefB} />
              </div>
            </div>
          </>
        )}

        {visaoExibida === "grade" && (
          <div className={`sistemas-grade ${fase === "saindo" ? "sistemas-grade--saindo" : ""} ${fase === "entrando" ? "sistemas-grade--entrando" : ""}`}>
            {PROJECTS.map((p, i) => (
              <div
                className="sistemas-card"
                key={p.label}
                style={{ "--i": i }}
                onClick={() => abrirProjeto(p.link)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && abrirProjeto(p.link)}
              >
                <div className="sistemas-card-imagem-wrap">
                  <img src={`${baseUrl}${p.image}`} alt={p.label} className="sistemas-card-imagem" />
                </div>
                <h3 className="sistemas-card-label">{p.label}</h3>
                <div className="sistemas-card-linha" />
                <div className="sistemas-card-rodape">
                  <span className="sistemas-card-type">{p.type}</span>
                  <span className="sistemas-card-arrow">↗</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sistemas-exit-overlay" ref={exitRef} />
    </>
  );
}