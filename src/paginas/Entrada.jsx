import { useEffect, useState } from "react";
import "./Entrada.css";

const fonts = [
    "'Crimson Text', serif",
    "'Playfair Display', serif",
    "'Dancing Script', cursive",
    "'Space Mono', monospace",
    "'Bebas Neue', sans-serif",
    "'Abril Fatface', serif",
    "'Pacifico', cursive",
];

export default function Entrada({ onFinish }) {
    const jaExibiu = sessionStorage.getItem("entrada-exibida") === "true";
    const [slideUp, setSlideUp] = useState(jaExibiu);
    const [fontIndex, setFontIndex] = useState(0);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        if (jaExibiu) {
            if (onFinish) onFinish();
            return;
        }
        const slideTimer = setTimeout(() => {
            sessionStorage.setItem("entrada-exibida", "true");
            setSlideUp(true);
            if (onFinish) setTimeout(onFinish, 1000);
        }, 5000);
        return () => clearTimeout(slideTimer);
    }, []);

    useEffect(() => {
        if (jaExibiu) return;
        const interval = setInterval(() => {
            setFading(true);
            setTimeout(() => {
                setFontIndex((prev) => (prev + 1) % fonts.length);
                setFading(false);
            }, 300);
        }, 900);
        return () => clearInterval(interval);
    }, []);

    if (jaExibiu) return null;

    return (
        <div className={`entrada-overlay ${slideUp ? "slide-up" : ""}`}>
            <p className="entrada-text">
                Sites para sua{" "}
                <span
                    className={`entrada-marca ${fading ? "fade-out" : "fade-in"}`}
                    style={{ fontFamily: fonts[fontIndex] }}
                >
                    marca
                </span>
            </p>
        </div>
    );
}