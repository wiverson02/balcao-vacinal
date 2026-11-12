import produtos from "../data/produtos.json";
export default function Card({v,privado,produtoKey,marcas,diferencial_sus,beneficio}){
  const k=produtoKey||v[0],c=privado&&produtos.CN[k],f=privado&&produtos.FI[k];
  const textoMarcas=marcas??c?.marcas,textoDiferencial=diferencial_sus??c?.diferencial_sus,textoBeneficio=beneficio??c?.beneficio;
  return(<details className="c"><summary><b>{v[0]}</b>{textoDiferencial&&<span className="diferencial">{textoDiferencial}</span>}<small>{v[1]}</small></summary><p>{v[2]}</p>
    {textoMarcas&&<p className="cm"><span className="pill">Pague Menos</span>{textoMarcas}</p>}{f&&<p className="fi">{f}</p>}
    {textoBeneficio&&<p className="beneficio"><b>💡 Por que recomendar:</b> {textoBeneficio}</p>}</details>);
}
export const Lista=({itens,privado})=><div className="grid">{itens.map((v,i)=><Card key={i} v={v} privado={privado}/>)}</div>;
