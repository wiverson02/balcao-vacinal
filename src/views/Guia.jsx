import {useMemo,useState} from "react";import cal from "../data/calendario.json";import produtos from "../data/produtos.json";import guiaVacinas from "../data/guia_vacinas.json";import Card from "../components/Card";
const normalizarBusca=(texto)=>texto.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const TEXTOS_GUIA={
  Hexavalente:["DTPa-VIP-Hib-HB","Difteria, tétano, coqueluche, poliomielite, Haemophilus influenzae b e hepatite B","Indicada para: Criança."],
  "dTpa-VIP":["dTpa-VIP","Difteria, tétano, coqueluche e poliomielite","Indicada para: Criança (reforço) e também adolescentes e adultos, conforme bula."],
  "Tetraviral (SCRV)":["Tetraviral (SCRV)","Sarampo, caxumba, rubéola e varicela","Indicada para: Criança: 1ª dose aos 12 meses (opcional, no lugar de SCR + varicela separadas) e 2ª dose a partir dos 15 meses (preferencial)."],
  "Pneumocócica conjugada":["Pneumocócica conjugada","Doenças pneumocócicas","Indicada para: Criança: 2, 4 e 6 meses + reforço entre 12 e 15 meses (esquema 3+1)."]
};
const TERMOS_GUIA={"Tríplice viral":["SCR"]};
const MARCAS_GUIA={"Pneumocócica conjugada":"Prevenar 20® (Pfizer)"};
const DIFERENCIAIS_GUIA={"Pneumocócica conjugada":"VPC20 (20 sorotipos)"};
const BENEFICIOS_GUIA={
  "Tetraviral (SCRV)":"Reúne sarampo, caxumba, rubéola e varicela em uma única aplicação. Aos 12 meses pode substituir as duas injeções separadas e, na 2ª dose, a partir dos 15 meses, é a opção preferida pela SBIm, com intervalo de 3 meses da dose anterior.",
  "Pneumocócica conjugada":"Protege contra 20 tipos de pneumococo, causadores de pneumonia, meningite e infecção no sangue. Quem já recebeu a VPC10 pode se beneficiar de doses adicionais de VPC20."
};
export default function Guia(){
  const [q,setQ]=useState("");
  const {mapa,guias}=useMemo(()=>{const m={},gids=Object.fromEntries(guiaVacinas.map(v=>[v.nome,v])),add=(v,g)=>{if(v[0]==="DTPa + VIP")return;const item=m[v[0]]??={p:v[1],d:new Set(),g:new Set()};item.d.add(v[1]);item.g.add(g)};
    cal.privada.crianca.forEach(b=>b[1].forEach(v=>add(v,"Criança")));Object.entries(cal.privada.grupos).forEach(([g,l])=>l.forEach(v=>add(v,g)));produtos.EX.forEach(v=>add(v,"Viajantes"));
    for(const vacina of guiaVacinas)m[vacina.nome]??={p:vacina.indicacoes.join("; ")||vacina.nome,d:new Set(),g:new Set()};
    return{mapa:m,guias:gids}},[]);
  const consulta=normalizarBusca(q);
  const nomes=Object.keys(mapa).sort().filter(n=>{const v=mapa[n],guia=guias[n],c=produtos.CN[n],marcas=guia?.nome_comercial??MARCAS_GUIA[n]??c?.marcas,diferencial=guia?.diferenciais_clinicos?.join(" ")??DIFERENCIAIS_GUIA[n]??c?.diferencial_sus,beneficio=guia?.beneficio??BENEFICIOS_GUIA[n]??c?.beneficio,campos=[n,...v.d,...v.g,...(TEXTOS_GUIA[n]||[]),...(TERMOS_GUIA[n]||[]),marcas,diferencial,beneficio,produtos.FI[n],...Object.values(guia||{}).flatMap(x=>Array.isArray(x)?x:typeof x==="string"?[x]:[]),...(guia?.extras||[]).flatMap(x=>[x.titulo,x.conteudo])].filter(Boolean);return normalizarBusca(campos.join(" ")).includes(consulta)});
  return(<><h2>Guia de vacinas</h2><input type="search" placeholder="Buscar vacina ou doença" value={q} onChange={x=>setQ(x.target.value)} style={{width:"100%",marginBottom:14}}/>
    <div className="grid">{nomes.length?nomes.map(n=>{const vacina=guias[n],publicos=[...mapa[n].g],texto=vacina?[n,vacina.indicacoes.join("; ")||TEXTOS_GUIA[n]?.[1]||mapa[n].p,vacina.esquema_doses.length?`Esquema: ${vacina.esquema_doses.join("; ")}`:TEXTOS_GUIA[n]?.[2]||(publicos.length?`Indicada para: ${publicos.join(", ")}.`:"Confira as indicações detalhadas.")]:TEXTOS_GUIA[n]||[n,mapa[n].p,publicos.length?`Indicada para: ${publicos.join(", ")}.`:"Confira as indicações detalhadas."];return <Card key={n} privado produtoKey={n} v={texto} dadosGuia={vacina} marcas={vacina?.nome_comercial||MARCAS_GUIA[n]} diferencial_sus={vacina?.diferenciais_clinicos?.join("; ")||DIFERENCIAIS_GUIA[n]} beneficio={vacina?.beneficio||BENEFICIOS_GUIA[n]}/>;}):<p className="muted">Nenhuma vacina encontrada. Tente outro termo.</p>}</div></>);
}
