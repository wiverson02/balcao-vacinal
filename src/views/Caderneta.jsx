import {useState} from "react";import cal from "../data/calendario.json";import {TP,TS,idadeMeses} from "../lib";
export default function Caderneta(){
  const [a,setA]=useState(""),[e,setE]=useState(""),[n,setN]=useState(""),[sus,setSus]=useState(false),[ck,setCk]=useState({});
  const m=idadeMeses(a,e,n),T=sus?TS:TP,F=(sus?cal.sus:cal.privada).crianca,RES=cal.privada.resgateCrianca;
  const soSus=v=>!sus&&/^Só no SUS/.test(v[2]),rs=nm=>!sus&&RES[nm]?<small>{RES[nm]}</small>:null,key=(i,j)=>`${sus}${i}_${j}`;
  const pend=[],enc=[];let prox="";const ok=m!==null&&m>=0&&m<=131;
  if(ok)F.forEach((b,i)=>{if(m<T[i]){if(!prox)prox=`${b[0]}, em ${T[i]-m} ${T[i]-m===1?"mês":"meses"}`;return}
    b[1].forEach((v,j)=>{if(ck[key(i,j)]||(v[0].startsWith("Nirsevimabe")&&m>=12))return;soSus(v)?enc.push(v[0]):pend.push([b[0],v])})});
  return(<><h2>Caderneta da criança</h2><div className="box"><p>Informe a idade e marque o que já consta na caderneta. O app mostra o que está pendente para a idade.</p>
    <div className="ln"><label>Anos<input type="number" min="0" max="10" inputMode="numeric" value={a} aria-invalid={m!==null&&!ok} aria-describedby={m!==null&&!ok?"idade-error":undefined} onChange={x=>{setA(x.target.value);setN("")}}/></label>
    <label>Meses<input type="number" min="0" inputMode="numeric" value={e} aria-invalid={m!==null&&!ok} aria-describedby={m!==null&&!ok?"idade-error":undefined} onChange={x=>{setE(x.target.value);setN("")}}/></label>
    <label>ou nascimento<input type="date" value={n} aria-invalid={m!==null&&!ok} aria-describedby={m!==null&&!ok?"idade-error":undefined} onChange={x=>{setN(x.target.value);setA("");setE("")}}/></label></div>
    <div className="chips" style={{margin:0}}><button className={sus?"":"on"} onClick={()=>setSus(false)}>Rede privada</button><button className={sus?"on":""} onClick={()=>setSus(true)}>SUS (PNI)</button></div></div>
    {m!==null&&!ok&&<div id="idade-error" className="warn error" role="alert">Esta tela cobre crianças até 10 anos e 11 meses. Para maiores, use a consulta por idade na tela inicial.</div>}
    {ok&&<><div className="box"><b>{pend.length?`Pendentes: ${pend.length}`:"Nenhuma dose pendente para a idade"}</b>
      <ul className="pd">{pend.map(([b,v],i)=><li key={i}><b>{v[0]}</b> ({b}){rs(v[0])}</li>)}</ul>
      {enc.length>0&&<p className="muted">Só no SUS, encaminhar à UBS: {enc.join(", ")}.</p>}{prox&&<p className="muted">Próxima faixa: {prox}.</p>}
      <div className="warn">Esquema atrasado não se reinicia: continue de onde parou, respeitando os intervalos mínimos (aba Intervalos). A influenza é anual e deve ser conferida pela data da última dose.</div></div>
      {F.map((b,i)=>m>=T[i]&&<div key={i}><h3>{b[0]}</h3>{b[1].map((v,j)=><label className="ck" key={j}><input type="checkbox" checked={!!ck[key(i,j)]} disabled={soSus(v)} onChange={x=>setCk({...ck,[key(i,j)]:x.target.checked})}/><span><b>{v[0]}</b><small>{v[2]}</small>{rs(v[0])}</span></label>)}</div>)}</>}</>);
}
