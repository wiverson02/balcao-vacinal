import produtos from "../data/produtos.json";
export default function Card({v,privado}){
  const c=privado&&produtos.CN[v[0]],f=privado&&produtos.FI[v[0]];
  return(<details className="c"><summary><b>{v[0]}</b>{c&&c.diferencial_sus&&<span className="diferencial">{c.diferencial_sus}</span>}<small>{v[1]}</small></summary><p>{v[2]}</p>
    {c&&<p className="cm"><span className="pill">Pague Menos</span>{c.marcas}</p>}{f&&<p className="fi">{f}</p>}
    {c&&c.beneficio&&<p className="beneficio"><b>💡 Por que recomendar:</b> {c.beneficio}</p>}</details>);
}
export const Lista=({itens,privado})=><div className="grid">{itens.map((v,i)=><Card key={i} v={v} privado={privado}/>)}</div>;
