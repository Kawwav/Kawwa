import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./paginas/Header";
import Entrada from "./paginas/Entrada";
import Sobre from "./paginas/Sobre";
import Sobremim from "./paginas/Sobremim";
import Servicos from "./paginas/Servicos";
import Designer from "./paginas/Designer";
import Desenvolvimento from "./paginas/Desenvolvimento";
import "./App.css";
import Footer from "./componentes/Footer";

/*npm run build 
npm run deploy*/


function App() {
  return (
    <BrowserRouter basename={import.meta.env.DEV ? "/" : "/Kawwa"}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Entrada />
              <Header />
              <Sobre />
              <Servicos />
              <Footer />
            </>
          }
        />
        <Route path="/sobre-mim" element={<Sobremim />} />
        <Route path="/designer" element={<Designer />} />
        <Route path="/desenvolvimento" element={<Desenvolvimento />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;