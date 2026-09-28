import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import Header from "./paginas/Header";
import Entrada from "./paginas/Entrada";
import Sobre from "./paginas/Sobre";
import Sobremim from "./paginas/Sobremim";
import Servicos from "./paginas/Servicos";
import Designer from "./paginas/Designer";
import Desenvolvimento from "./paginas/Desenvolvimento";
import Sistemas from "./paginas/Sistemas";
import Museum from "./paginas/museum";
import "./App.css";
import Footer from "./componentes/Footer";

/*npm run build 
npm run deploy*/

//git add .
//git commit -m "....."
//git push


function SmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname !== "/") return;

    const lenis = new Lenis({
      lerp: 0.065,          
      wheelMultiplier: 0.9,
      smoothWheel: true,
    });
    window.__lenis = lenis; 

    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete window.__lenis;
    };
  }, [pathname]);

  return null;
}

function App() {

  const base = import.meta.env.DEV ? "/" : "/Kawwa";
  const [introDone, setIntroDone] = useState(
    () => sessionStorage.getItem("entrada-exibida") === "true"
  );

  return (
    <BrowserRouter basename={base}>
      <SmoothScroll />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Entrada onFinish={() => setIntroDone(true)} />
              <Header revealed={introDone} />
              <Sobre />
              <Servicos />
              <Footer />
            </>
          }
        />
        <Route path="/sobre-mim" element={<Sobremim />} />
        <Route path="/designer" element={<Designer />} />
        <Route path="/desenvolvimento" element={<Desenvolvimento />} />
        <Route path="/sistemas" element={<Sistemas />} />
        <Route path="/museum" element={<Museum />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;