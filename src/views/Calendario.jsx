import {useState} from "react";import cal from "../data/calendario.json";import {Lista} from "../components/Card";
const GR=["Criança","Adolescente","Adulto","Idoso","Gestante"];
export default function Calendario({modo}){
  const s=modo==="sus",d=s?cal.sus:cal.privada,[g,setG]=useState("Criança"),[a,setA]=useState(0),F=d.crianca,R=!s&&g!=="Criança"&&d.resgateGrupos[g];
  return(<><h2>{s?"Calendário SUS (PNI)":"Calendário vacinal da rede privada (SBIm)"}</h2>
    <div className="chips">{GR.map(x=><button key={x} className={x===g?"on":""} onClick={()=>setG(x)}>{x}</button>)}</div>
    {g==="Criança"?<><div className="tabs">{F.map((f,i)=><button key={f[0]} className={i===a?"on":""} onClick={()=>setA(i)}>{f[0]}</button>)}</div><h2>{F[a][0]}</h2><Lista itens={F[a][1]} privado={!s}/></>:<Lista itens={d.grupos[g]} privado={!s}/>}
    {R&&<div className="box"><b>Atraso e esquemas incompletos (SBIm {g.toLowerCase()} 2026/27)</b>{R.map((x,i)=><p key={i}><b>{x[0]}:</b> {x[1]}</p>)}</div>}
    {!s&&g==="Gestante"&&<div className="warn">Tríplice viral, varicela, dengue e HPV não devem ser aplicadas na gestação. Tríplice viral, varicela e HPV podem ser feitas no puerpério e na amamentação; a dengue é contraindicada também em lactantes. A febre amarela só entra em situação de risco, com avaliação médica.</div>}
    {s&&<><div className="warn">Resumo do Calendário Nacional de Vacinação 2026, a partir da nota técnica do Espírito Santo e das atualizações do Ministério da Saúde. A Pneumo-20 entrou na rotina das crianças em 2026 com introdução gradual, então a oferta muda de um município para outro. Confira sempre o calendário oficial.</div>
    <a className="lk" href="https://www.gov.br/saude/pt-br/vacinacao/calendario" target="_blank" rel="noopener noreferrer"><b>Calendário Nacional de Vacinação</b><span>Ministério da Saúde</span></a></>}</>);
}
