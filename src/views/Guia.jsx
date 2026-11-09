import {useMemo,useState} from "react";import cal from "../data/calendario.json";import produtos from "../data/produtos.json";import Card from "../components/Card";
export default function Guia(){
  const [q,setQ]=useState("");
  const mapa=useMemo(()=>{const m={},add=(v,g)=>{(m[v[0]]??={p:v[1],g:new Set()}).g.add(g)};
    cal.privada.crianca.forEach(b=>b[1].forEach(v=>add(v,"Criança")));Object.entries(cal.privada.grupos).forEach(([g,l])=>l.forEach(v=>add(v,g)));produtos.EX.forEach(v=>add(v,"Viajantes"));return m},[]);
  const nomes=Object.keys(mapa).sort().filter(n=>(n+mapa[n].p).toLowerCase().includes(q.toLowerCase()));
  return(<><h2>Guia de vacinas</h2><input type="search" placeholder="Buscar vacina ou doença" value={q} onChange={x=>setQ(x.target.value)} style={{width:"100%",marginBottom:14}}/>
    <div className="grid">{nomes.length?nomes.map(n=><Card key={n} privado v={[n,mapa[n].p,`Indicada para: ${[...mapa[n].g].join(", ")}.`]}/>):<p className="muted">Nenhuma vacina encontrada. Tente outro termo.</p>}</div></>);
}
