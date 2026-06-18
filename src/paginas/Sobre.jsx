import { useEffect, useRef, useState } from "react";
import "./Sobre.css";
import Sobremim from "./Sobremim";

export default function Sobre() {
    const sectionRef = useRef(null);
    const btnRef = useRef(null);
    const labelRef = useRef(null);
    const rafRef = useRef(null);

    const [sobreMounted, setSobreMounted] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    sectionRef.current?.classList.add("is-visible");
                } else {
                    sectionRef.current?.classList.remove("is-visible");
                }
            },
            { threshold: 0.2 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const btn = btnRef.current;
        const label = labelRef.current;
        if (!btn || !label) return;

        const handleMouseMove = (e) => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                const rect = btn.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2);
                const dy = (e.clientY - cy) / (rect.height / 2);

                btn.style.transform = "translate(" + (dx * 8) + "px, " + (dy * 8) + "px) scale(1.03)";
                label.style.transform = "translate(" + (dx * 18) + "px, " + (dy * 18) + "px)";
            });
        };

        const handleMouseLeave = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            btn.style.transform = "";
            label.style.transform = "";
        };

        btn.addEventListener("mousemove", handleMouseMove);
        btn.addEventListener("mouseleave", handleMouseLeave);
        return () => {
            btn.removeEventListener("mousemove", handleMouseMove);
            btn.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);



    const handleClose = () => {
        setTimeout(() => setSobreMounted(false), 550);
    };

    return (
        <>
            <section className="sobre-section" ref={sectionRef}>
                <div className="sobre-grid">

                    <div className="sobre-left">
                        <p className="sobre-left-text">
                            Trasformando empresas com{" "}
                            <em>sites modernos</em>
                            {" "}e funcionais.{" "}
                            Unindo{" "}
                            <em>UI/UX Design</em>
                            {" "}e tecnologia de ponta,{" "}
                            crio experiências responsivas que conectam
                            sua marca ao{" "}
                            <em>futuro digital.</em>
                        </p>
                    </div>

                    <div className="sobre-right">
                        <p className="sobre-right-text">
                            Adoro transformar experiências em{" "}
                            sites memoráveis,{" "}
                            combinando estéticas únicas{" "}
                            e animações que fogem do comum{" "}
                            para destacar sua marca.
                        </p>
                        <button
                            className="sobre-about-btn"
                            ref={btnRef}
                            onClick={() => setSobreMounted(true)}
                        >
                            <span className="sobre-btn-label" ref={labelRef}>
                                Sobre mim
                            </span>
                        </button>
                    </div>

                </div>
            </section>

            {sobreMounted && (
                <Sobremim onClose={handleClose} />
            )}
        </>
    );
}