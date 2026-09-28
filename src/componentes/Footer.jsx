import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./Footer.css";

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const containerRef = useRef(null);
  const footerRef = useRef(null);

  // Entrada em "bolha": o footer nasce estreito com o topo em cúpula e se abre
  // até a largura total, junto com um scale suave. Tudo preso ao scroll
  // (scrub) para acompanhar o Lenis com um atraso bem macio.
  useLayoutEffect(() => {
    const footer = footerRef.current;
    const container = containerRef.current;
    if (!footer || !container) return;

    const ctx = gsap.context(() => {
      const mobile = window.matchMedia("(max-width: 768px)").matches;
      const larguraInicial = mobile ? 0.7 : 0.5;   // fração da largura da tela
      const RAIO_FINAL = mobile ? 40 : 70;         // topo continua arredondado no fim

      // cúpula inicial: raio horizontal = metade da largura, vertical = quase a altura toda
      const raioH = () => (container.offsetWidth * larguraInicial) / 2;
      const raioV = () => footer.offsetHeight * 0.9;

      const tl = gsap.timeline({
        defaults: { ease: "sine.inOut" },
        scrollTrigger: {
          trigger: container,
          start: "top 100%",     // footer começa a aparecer na base da tela
          end: "bottom bottom",  // termina quando a página chega ao fim
          scrub: 3.5,            // quanto maior, mais lenta/atrasada a bolha
          invalidateOnRefresh: true,
        },
      });

      // Bolha: nasce estreita com o topo em cúpula e se abre até a largura total,
      // mantendo um topo redondo visível em vez de "bater na parede".
      tl.fromTo(
        footer,
        {
          width: `${larguraInicial * 100}%`,
          borderTopLeftRadius: () => `${raioH()}px ${raioV()}px`,
          borderTopRightRadius: () => `${raioH()}px ${raioV()}px`,
          scale: mobile ? 0.85 : 0.8,
          transformOrigin: "50% 100%",
        },
        {
          width: "100%",
          borderTopLeftRadius: `${RAIO_FINAL}px ${RAIO_FINAL}px`,
          borderTopRightRadius: `${RAIO_FINAL}px ${RAIO_FINAL}px`,
          scale: 1,
          duration: 1,
        },
        0
      ).fromTo(
        footer.querySelectorAll(".rodape__topo > *, .rodape__coluna"),
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: "power2.out" },
        0.4
      );
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div className="rodape__container" ref={containerRef}>
      <footer
        ref={footerRef}
        className="rodape"
      >
        <div className="rodape__topo">
          <div className="rodape__esquerda">
            <h3 className="rodape__subtitulo">Vamos trabalhar juntos</h3>
            <p className="rodape__descricao">
              Tem uma ideia ou projeto que precisa ganhar vida?
              Entre em contato e vamos conversar.
            </p>
            <a
              href="https://wa.me/5541988184388?text=Ol%C3%A1%20Vin%C3%ADcius%2C%20vim%20pelo%20seu%20portf%C3%B3lio%20e%20gostaria%20de%20conversar%20sobre%20um%20projeto!"
              target="_blank"
              rel="noopener noreferrer"
              className="rodape__contato"
            >
              CONTATO
              <span className="rodape__seta-container">
                <span className="rodape__seta">↗</span>
              </span>
            </a>
          </div>

          <div className="rodape__direita">
            <p className="rodape__texto">
              Tem um<br />
              Projeto em mente?
            </p>
          </div>
        </div>

        <div className="rodape__base">
          <div className="rodape__coluna">
            <div className="rodape__linha" />
            <span className="rodape__coluna-titulo">LOCALIZAÇÃO</span>
            <p className="rodape__coluna-info">Curitiba, PR<br />Brasil</p>
          </div>

          <div className="rodape__coluna">
            <div className="rodape__linha" />
            <span className="rodape__coluna-titulo">CONTATO</span>
            <p className="rodape__coluna-info">
              <a
                href="https://wa.me/5541988184388?text=Ol%C3%A1%20Vin%C3%ADcius%2C%20vim%20pelo%20seu%20portf%C3%B3lio%20e%20gostaria%20de%20conversar%20sobre%20um%20projeto!"
                target="_blank"
                rel="noopener noreferrer"
                className="rodape__link"
              >
                <span className="link__texto">
                  <span>+55 41 98818-4388</span>
                  <span className="link__texto-hover">+55 41 98818-4388</span>
                </span>
                <span className="link__linha" />
              </a>
            </p>
          </div>

          <div className="rodape__coluna">
            <div className="rodape__linha" />
            <span className="rodape__coluna-titulo">E-MAIL</span>
            <p className="rodape__coluna-info">
              <a href="mailto:vinikawwa@gmail.com" className="rodape__link">
                <span className="link__texto">
                  <span>vinikawwa@gmail.com</span>
                  <span className="link__texto-hover">vinikawwa@gmail.com</span>
                </span>
                <span className="link__linha" />
              </a>
            </p>
          </div>

          <div className="rodape__coluna">
            <div className="rodape__linha" />
            <span className="rodape__coluna-titulo">SIGA-NOS</span>
            <p className="rodape__coluna-info">
              <a
                href="https://www.instagram.com/_k.aww.a_/"
                target="_blank"
                rel="noreferrer"
                className="rodape__link"
              >
                <span className="link__texto">
                  <span>Instagram</span>
                  <span className="link__texto-hover">Instagram</span>
                </span>
                <span className="link__linha" />
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;