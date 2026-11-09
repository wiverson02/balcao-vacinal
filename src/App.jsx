import {useEffect,useState} from "react";
import Inicio from "./views/Inicio";import Calendario from "./views/Calendario";import Guia from "./views/Guia";
import Intervalos from "./views/Intervalos";import Caderneta from "./views/Caderneta";import Materiais from "./views/Materiais";
const Privada=()=><Calendario modo="privada"/>,Sus=()=><Calendario modo="sus"/>;
const ABAS=[["inicio","Início",Inicio],["privada","Rede privada",Privada],["sus","Calendário SUS",Sus],["guia","Guia de vacinas",Guia],["intervalos","Intervalos",Intervalos],["caderneta","Caderneta",Caderneta],["materiais","Materiais",Materiais]];
const lerHash=()=>(typeof location!=="undefined"?location.hash.slice(1):"")||"inicio";
export default function App(){
  const [h,setH]=useState(lerHash);
  useEffect(()=>{const f=()=>{setH(lerHash());window.scrollTo(0,0)};window.addEventListener("hashchange",f);return()=>window.removeEventListener("hashchange",f)},[]);
  const aba=ABAS.find(x=>x[0]===h)||ABAS[0],View=aba[2];
  return(<><header><div className="top"><div className="logo">+</div><b>Balcão Vacinal</b></div>
    <nav>{ABAS.map(([id,nome])=><a key={id} href={"#"+id} className={id===aba[0]?"on":""}>{nome}</a>)}</nav></header>
    <main><View/></main>
    <footer>Material de apoio ao farmacêutico vacinador: rede privada pela SBIm 2026/27 e SUS pelo PNI. A rede privada foi revisada com os PDFs da SBIm 2026/27 (criança, adolescente, adulto, idoso e gestante). Os nomes comerciais seguem a tabela da rede Pague Menos de 07/05/2026; a disponibilidade varia por loja. Dados: SBIm 2026/27 (versões de junho/2026), PNI 2026 e tabela Pague Menos de 07/05/2026. O app não substitui a avaliação profissional nem a caderneta do paciente.</footer></>);
}
