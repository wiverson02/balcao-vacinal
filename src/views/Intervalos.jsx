import {useState} from "react";import R from "../data/intervalos.json";import cal from "../data/calendario.json";
export default function Intervalos(){
  const [k,setK]=useState(0),[d,setD]=useState("");let out="";
  if(d){const x=new Date(d+"T12:00");x.setDate(x.getDate()+R[k][1]);out="Próxima dose a partir de "+x.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
  return(<><h2>Intervalos e aprazamento</h2>
    <div className="box"><p>Escolha a vacina e a data da dose aplicada para ver quando agendar a próxima.</p>
      <select value={k} onChange={x=>setK(+x.target.value)}>{R.map((r,i)=><option key={i} value={i}>{r[0]} ({r[2]})</option>)}</select> <input type="date" value={d} onChange={x=>setD(x.target.value)}/><div className="res">{out}</div></div>
    <div className="box"><b>Coadministração</b><p>Vacinas inativadas podem ser aplicadas no mesmo dia ou com qualquer intervalo entre elas. Duas vacinas de vírus vivos atenuados injetáveis devem ser aplicadas no mesmo dia ou com intervalo mínimo de 30 dias.</p></div>
    <div className="box"><b>Atraso e esquemas de resgate (SBIm criança 2026/27)</b><p className="muted">O PDF da SBIm não traz idade mínima nem intervalo mínimo para todas as vacinas, como hexavalente, VIP e pneumocócica na série primária. Para essas, consulte a bula e o manual do PNI.</p>
      {Object.entries(cal.privada.resgateCrianca).map(([n,t])=><p key={n}><b>{n}:</b> {t}</p>)}</div>
    <div className="box"><b>Intervalos de referência</b><table><tbody>{R.map((r,i)=><tr key={i}><td>{r[0]}</td><td>{r[2]}</td></tr>)}</tbody></table></div></>);
}
