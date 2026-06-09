import React, { useEffect, useRef, useState } from "react";
import "./Footer.css";

const Footer = () => {
  const footerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth <= 768
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const el = footerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const triggerDistance = isMobile ? 200 : 400;
      const start = windowHeight;
      const end = windowHeight - triggerDistance;
      const raw = (start - rect.top) / (start - end);
      const progress = Math.min(Math.max(raw, 0), 1);
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  const radius = 50 * (1 - scrollProgress);
  const width = isMobile ? 60 + 40 * scrollProgress : 40 + 60 * scrollProgress;
  const scale = isMobile ? 0.7 + 0.3 * scrollProgress : 0.85 + 0.15 * scrollProgress;
  const borderRadiusValue = `50% 50% 0 0 / ${radius}% ${radius}% 0 0`;

  return (
    <div className="footer__wrapper">
      <footer
        ref={footerRef}
        className="footer"
        style={{
          borderRadius: borderRadiusValue,
          width: `${width}%`,
          transform: `scale(${scale})`,
        }}
      >
        <div className="footer__top">
          <div className="footer__left">
            <h3 className="footer__subtitle">Vamos trabalhar juntos</h3>
            <p className="footer__description">
              Tem uma ideia ou projeto que precisa ganhar vida?
              Entre em contato e vamos conversar.
            </p>
            <a
              href="https://wa.me/5541988184388?text=Ol%C3%A1%20Vin%C3%ADcius%2C%20vim%20pelo%20seu%20portf%C3%B3lio%20e%20gostaria%20de%20conversar%20sobre%20um%20projeto!"
              target="_blank"
              rel="noopener noreferrer"
              className="footer__contact"
            >
              CONTATO
              <span className="footer__arrow-wrap">
                <span className="footer__arrow">↗</span>
              </span>
            </a>
          </div>

          <div className="footer__right">
            <p className="footer__text">
              Tem um<br />
              Projeto em mente?
            </p>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__col">
            <div className="footer__line" />
            <span className="footer__col-title">LOCALIZAÇÃO</span>
            <p className="footer__col-info">Curitiba, PR<br />Brasil</p>
          </div>

          <div className="footer__col">
            <div className="footer__line" />
            <span className="footer__col-title">CONTATO</span>
            <p className="footer__col-info">
              <a
                href="https://wa.me/5541988184388?text=Ol%C3%A1%20Vin%C3%ADcius%2C%20vim%20pelo%20seu%20portf%C3%B3lio%20e%20gostaria%20de%20conversar%20sobre%20um%20projeto!"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__hover-link"
              >
                <span className="c-text">
                  <span>+55 41 98818-4388</span>
                  <span className="c-serif">+55 41 98818-4388</span>
                </span>
                <span className="c-fill" />
              </a>
            </p>
          </div>

          <div className="footer__col">
            <div className="footer__line" />
            <span className="footer__col-title">E-MAIL</span>
            <p className="footer__col-info">
              <a href="mailto:vinikawwa@gmail.com" className="footer__hover-link">
                <span className="c-text">
                  <span>vinikawwa@gmail.com</span>
                  <span className="c-serif">vinikawwa@gmail.com</span>
                </span>
                <span className="c-fill" />
              </a>
            </p>
          </div>

          <div className="footer__col">
            <div className="footer__line" />
            <span className="footer__col-title">SIGA-NOS</span>
            <p className="footer__col-info">
              <a
                href="https://www.instagram.com/_k.aww.a_/"
                target="_blank"
                rel="noreferrer"
                className="footer__hover-link"
              >
                <span className="c-text">
                  <span>Instagram</span>
                  <span className="c-serif">Instagram</span>
                </span>
                <span className="c-fill" />
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;