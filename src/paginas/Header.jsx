import { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import * as THREE from "three";
import "./Header.css";

const baseUrl = import.meta.env.BASE_URL;
const GLB_PATH = `${baseUrl}low_poly_planet_earth.glb`;
const EU_IMAGE_PATH = `${baseUrl}eu.png`;

function EarthModel() {
    const { scene } = useGLTF(GLB_PATH);
    const ref = useRef(null);
    const centeredScene = useMemo(() => {
        const clone = scene.clone(true);

        const box = new THREE.Box3().setFromObject(clone);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) / 2;

        // Recentraliza no (0,0,0)
        clone.position.sub(center);

        // Normaliza a escala para um raio-alvo consistente
        const targetRadius = 1.1;
        const scaleFactor = radius > 0 ? targetRadius / radius : 1;
        clone.scale.setScalar(scaleFactor);

        return clone;
    }, [scene]);

    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.y += delta * 0.25;
    });

    return <primitive ref={ref} object={centeredScene} />;
}

function Globe() {
    return (
        <div className="globe-canvas">
            <Canvas
                camera={{ position: [0, 0, 3], fov: 45 }}
                gl={{ alpha: true, antialias: true }}
                dpr={[1, 2]}
                onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
            >
                <ambientLight intensity={1} />
                <directionalLight position={[3, 2, 4]} intensity={1.2} />
                <directionalLight position={[-3, -1, -2]} intensity={0.3} />
                <Suspense fallback={null}>
                    <EarthModel />
                </Suspense>
            </Canvas>
        </div>
    );
}

// Pré-carrega o modelo assim que o bundle é avaliado
useGLTF.preload(GLB_PATH);

const NAME = "VINÍCIUS KAWASUGUI SANTIAGO";
const REPEAT = 8;

export default function Header({ revealed = true }) {
    const [visible, setVisible] = useState(revealed);
    useEffect(() => {
        if (revealed && !visible) {

            const t = setTimeout(() => setVisible(true), 50);
            return () => clearTimeout(t);
        }
    }, [revealed]);

    const items = Array.from({ length: REPEAT }, (_, i) => (
        <span className="marquee-item" key={i}>
            <span className="marquee-name">{NAME}</span>
            <span className="marquee-sep">—</span>
        </span>
    ));

    return (
        <div
            className="main-content"
            style={{ "--eu-bg": `url('${EU_IMAGE_PATH}')` }}
        >

            <div className={`header-left-block${visible ? " is-visible" : ""}`}>
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

            {/* Globo 3D + localização */}
            <div className={`location-widget${visible ? " is-visible" : ""}`}>
                <Globe />
                <span className="location-text">CURITIBA — BRASIL</span>
            </div>

            <div className={`marquee-wrapper${visible ? " is-visible" : ""}`}>
                <div className="marquee-track">
                    {items}
                    {items}
                </div>
            </div>

            {/* Ícones sociais */}
            <div className={`social-icons${visible ? " is-visible" : ""}`}>
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