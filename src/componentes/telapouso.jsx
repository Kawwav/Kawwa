import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./telapouso.css";

const IDLE_MS = 9000; // tempo parado até aparecer 9se
const SPEED = 180; // velocidade em px/s
const IMG_WIDTH = 500;
const IMG_SRC = `${import.meta.env.BASE_URL}eudvd.svg`;
const EVENTS = [
  "mousemove",
  "mousedown",
  "pointerdown",
  "keydown",
  "touchstart",
  "touchmove",
  "wheel",
];

export default function TelaPouso() {
  const { pathname } = useLocation();
  const enabled = pathname !== "/museum";
  const [active, setActive] = useState(false);
  const imgRef = useRef(null);

  const show = active && enabled;

  useEffect(() => {
    if (!enabled) return;

    let timer;
    const start = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setActive(true), IDLE_MS);
    };
    const onActivity = () => {
      setActive(false);
      start();
    };

    start();
    EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );

    return () => {
      clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [enabled, pathname]);

  useEffect(() => {
    if (!show) return;
    const el = imgRef.current;
    if (!el) return;

    const box = el.parentElement;
    const speed = SPEED * Math.min(1, box.clientWidth / 1000);

    let x = Math.random() * Math.max(box.clientWidth - el.offsetWidth, 0);
    let y = Math.random() * Math.max(box.clientHeight - el.offsetHeight, 0);
    let dx = Math.random() < 0.5 ? speed : -speed;
    let dy = Math.random() < 0.5 ? speed : -speed;
    let last = performance.now();
    let raf;

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const maxX = Math.max(box.clientWidth - el.offsetWidth, 0);
      const maxY = Math.max(box.clientHeight - el.offsetHeight, 0);

      x += dx * dt;
      y += dy * dt;

      if (x <= 0) { x = 0; dx = Math.abs(dx); }
      else if (x >= maxX) { x = maxX; dx = -Math.abs(dx); }

      if (y <= 0) { y = 0; dy = Math.abs(dy); }
      else if (y >= maxY) { y = maxY; dy = -Math.abs(dy); }

      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="tela-pouso"
      style={{ "--pouso-img-width": `${IMG_WIDTH}px` }}
    >
      <img
        ref={imgRef}
        className="tela-pouso__img"
        src={IMG_SRC}
        alt=""
        draggable={false}
      />
    </div>
  );
}