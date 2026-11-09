import L from "../data/materiais.json";
export default function Materiais(){
  return(<><h2>Materiais de apoio</h2><div className="warn">O calendário da SBIm é revisado todo ano (as versões 2026/27 são de abril e junho de 2026). Antes de usar no balcão, veja se há versão mais nova na página oficial.</div>
    {L.map(l=><a key={l[0]} className="lk" href={l[0]} target="_blank" rel="noopener noreferrer"><b>{l[1]}</b><span>{l[2]}</span></a>)}</>);
}
