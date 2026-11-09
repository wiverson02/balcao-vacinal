import {useState} from "react";import cal from "../data/calendario.json";import {Lista} from "../components/Card";
import {txtIdade,TP,TS,faixa,grupo,idadeMeses} from "../lib";
const ATALHOS=[["privada","Calendário rede privada","Criança, adolescente, adulto, idoso e gestante"],["sus","Calendário SUS","Calendário Nacional (PNI)"],["caderneta","Caderneta da criança","Marque o que já foi aplicado e veja as pendências"],["guia","Guia de vacinas","Busque por vacina ou doença"],["intervalos","Intervalos e aprazamento","Calcule a data da próxima dose"],["materiais","Materiais de apoio","PDFs oficiais da SBIm"]];
export default function Inicio(){
  const [a,setA]=useState(""),[e,setE]=useState(""),[n,setN]=useState(""),[gest,setGest]=useState(false),[sus,setSus]=useState(false);
  const m=idadeMeses(a,e,n);let res=null;
  if(m!==null){
    if(m<0||m>1440)res=<div className="warn">Confira a idade ou a data informada.</div>;
    else{const d=sus?cal.sus:cal.privada,k=faixa(m,sus?TS:TP),g=grupo(m,gest),itens=g==="Criança"?d.crianca[k][1]:d.grupos[g];
      res=<><div className="chips"><button className={sus?"":"on"} onClick={()=>setSus(false)}>Rede privada</button><button className={sus?"on":""} onClick={()=>setSus(true)}>SUS (PNI)</button></div>
        <div className="res">{txtIdade(m)} · {g}{g==="Criança"&&` · faixa ${d.crianca[k][0]}`}</div>
        <div className="warn">Estas são as doses da faixa atual. Confira na caderneta o que ficou atrasado.</div><Lista itens={itens} privado={!sus}/></>;}
  }
  return(<><div className="box hero"><h1>Qual a idade do paciente?</h1><p>Digite a idade ou a data de nascimento e veja as vacinas da faixa.</p>
    <div className="ln"><label>Anos<input type="number" min="0" inputMode="numeric" value={a} onChange={x=>{setA(x.target.value);setN("")}}/></label>
    <label>Meses<input type="number" min="0" inputMode="numeric" value={e} onChange={x=>{setE(x.target.value);setN("")}}/></label>
    <label>ou nascimento<input type="date" value={n} onChange={x=>{setN(x.target.value);setA("");setE("")}}/></label></div>
    <label className="gst"><input type="checkbox" checked={gest} onChange={x=>setGest(x.target.checked)}/> Paciente gestante</label></div>
    {res}<h2>Atalhos</h2><div className="grid">{ATALHOS.map(([h,t,s])=><a key={h} className="box card2" href={"#"+h}><b>{t}</b><div className="muted">{s}</div></a>)}</div></>);
}
