import { useEffect, useRef } from "react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import "./Header.css";

function Globe() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const SIZE = 52;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const R = SIZE / 2 - 2;
        const cx = SIZE / 2;
        const cy = SIZE / 2;
        let angle = 0;

        const continents = [
            [[70,-140],[70,-60],[50,-55],[25,-80],[15,-85],[10,-77],[8,-77],[20,-105],[30,-110],[40,-125],[55,-130],[70,-140]],
            [[10,-75],[0,-50],[-10,-37],[-20,-40],[-35,-57],[-55,-68],[-55,-75],[-40,-72],[-20,-70],[-5,-80],[5,-77],[10,-75]],
            [[70,30],[60,28],[50,15],[43,10],[36,10],[36,28],[42,35],[55,22],[60,25],[70,30]],
            [[37,10],[30,32],[12,42],[0,42],[-10,40],[-35,18],[-35,25],[-20,35],[0,50],[10,42],[22,37],[37,10]],
            [[70,140],[70,60],[55,30],[42,35],[36,28],[36,50],[12,44],[0,42],[0,100],[10,105],[22,115],[35,120],[55,130],[70,140]],
            [[-15,130],[-15,140],[-22,150],[-38,145],[-38,115],[-22,114],[-15,130]],
        ];

        function latLonToXY(lat, lon, rotY) {
            const phi = (90 - lat) * Math.PI / 180;
            const theta = (lon + rotY) * Math.PI / 180;
            const x3 = R * Math.sin(phi) * Math.cos(theta);
            const y3 = R * Math.cos(phi);
            const z3 = R * Math.sin(phi) * Math.sin(theta);
            return { x: cx + x3, y: cy - y3, z: z3 };
        }

        function draw() {
            ctx.clearRect(0, 0, SIZE, SIZE);

            const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
            grad.addColorStop(0, "rgba(80,80,80,0.15)");
            grad.addColorStop(1, "rgba(20,20,20,0.05)");
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 0.4;

            for (let lat = -75; lat <= 75; lat += 30) {
                ctx.beginPath();
                let first = true;
                for (let lon = -180; lon <= 180; lon += 3) {
                    const p = latLonToXY(lat, lon, angle);
                    if (p.z >= 0) { first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); first = false; }
                    else { first = true; }
                }
                ctx.stroke();
            }

            for (let lon = 0; lon < 360; lon += 30) {
                ctx.beginPath();
                let first = true;
                for (let lat = -90; lat <= 90; lat += 3) {
                    const p = latLonToXY(lat, lon, angle);
                    if (p.z >= 0) { first ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); first = false; }
                    else { first = true; }
                }
                ctx.stroke();
            }

            continents.forEach((poly) => {
                const pts = poly.map(([lat, lon]) => latLonToXY(lat, lon, angle));
                ctx.beginPath();
                let started = false;
                pts.forEach((p) => {
                    if (p.z >= 0) { started ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); started = true; }
                    else { started = false; }
                });
                ctx.closePath();
                ctx.fillStyle = "rgba(255,255,255,0.18)";
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,0.35)";
                ctx.lineWidth = 0.6;
                ctx.stroke();
            });

            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx - R * 0.28, cy - R * 0.28, R * 0.18, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.fill();
        }

        let raf;
        function loop() { angle += 0.12; draw(); raf = requestAnimationFrame(loop); }
        loop();
        return () => cancelAnimationFrame(raf);
    }, []);

    return <canvas ref={canvasRef} className="globe-canvas" />;
}

const NAME = "VINÍCIUS KAWASUGUI SANTIAGO";
const REPEAT = 8;

export default function Header() {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    const items = Array.from({ length: REPEAT }, (_, i) => (
        <span className="marquee-item" key={i}>
            <span className="marquee-name">{NAME}</span>
            <span className="marquee-sep">—</span>
        </span>
    ));

    return (
        <div className="main-content">

            <div className="header-left-block">
                <span className="copyright-label">
                    <div className="c-text">
                        <span>©KAWWA</span>
                        <span className="c-serif">©Kawwa</span>
                    </div>
                    <div className="c-fill" />
                </span>

                <div className="role-labels">
                    <span className="role-label">
                        <div className="c-text">
                            <span>Web Designer / Dev Web</span>
                            <span className="c-serif">Web Designer / Dev Web</span>
                        </div>
                        <div className="c-fill" />
                    </span>
                </div>
            </div>

            {/* Globo + localização */}
            <div className="location-widget">
                <Globe />
                <span className="location-text">CURITIBA — BRASIL</span>
            </div>

            <div className="marquee-wrapper">
                <div className="marquee-track">
                    {items}
                    {items}
                </div>
            </div>

            {/* Ícones sociais */}
            <div className="social-icons">
                <a
                    href="https://wa.me/5541988184388?text=Olá%20Vinícius%2C%20vim%20pelo%20seu%20portfólio%20e%20gostaria%20de%20conversar%20sobre%20um%20projeto!"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon-btn"
                    aria-label="WhatsApp"
                >
                    <div className="c-text">
                        <span><FaWhatsapp /> WhatsApp</span>
                        <span className="c-serif"><FaWhatsapp /> WhatsApp</span>
                    </div>
                    <div className="c-fill" />
                </a>
                <div className="social-icon-divider" />
                <a
                    href="https://www.instagram.com/_k.aww.a_/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-icon-btn"
                    aria-label="Instagram"
                >
                    <div className="c-text">
                        <span><FaInstagram /> Instagram</span>
                        <span className="c-serif"><FaInstagram /> Instagram</span>
                    </div>
                    <div className="c-fill" />
                </a>
            </div>
        </div>
    );
}