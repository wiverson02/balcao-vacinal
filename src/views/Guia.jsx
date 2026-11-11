import {useMemo,useState} from "react";import cal from "../data/calendario.json";import produtos from "../data/produtos.json";import Card from "../components/Card";
const normalizarBusca=(texto)=>texto.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export default function Guia(){
  const [q,setQ]=useState("");
  const mapa=useMemo(()=>{const m={},add=(v,g)=>{const item=m[v[0]]??={p:v[1],d:new Set(),g:new Set()};item.d.add(v[1]);item.g.add(g)};
    cal.privada.crianca.forEach(b=>b[1].forEach(v=>add(v,"Criança")));Object.entries(cal.privada.grupos).forEach(([g,l])=>l.forEach(v=>add(v,g)));produtos.EX.forEach(v=>add(v,"Viajantes"));return m},[]);
  const consulta=normalizarBusca(q);
  const nomes=Object.keys(mapa).sort().filter(n=>{const v=mapa[n],c=produtos.CN[n],campos=[n,...v.d,...v.g,c?.marcas,c?.diferencial_sus,c?.beneficio,produtos.FI[n]].filter(Boolean);return normalizarBusca(campos.join(" ")).includes(consulta)});
  return(<><h2>Guia de vacinas</h2><input type="search" placeholder="Buscar vacina ou doença" value={q} onChange={x=>setQ(x.target.value)} style={{width:"100%",marginBottom:14}}/>
    <div className="grid">{nomes.length?nomes.map(n=><Card key={n} privado v={[n,mapa[n].p,`Indicada para: ${[...mapa[n].g].join(", ")}.`]}/>):<p className="muted">Nenhuma vacina encontrada. Tente outro termo.</p>}</div></>);
}
