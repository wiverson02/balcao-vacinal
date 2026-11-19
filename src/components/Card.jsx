import "./Card.css";
import produtos from "../data/produtos.json";
const TIPOS_EXTRA=new Set(["alerta","nota","esquema","contraindicacao"]);
function ConteudoGuia({dados}){
  if(!dados)return null;
  const campos=[
    ["Rede",dados.rede==="pni"?"PNI":dados.rede==="privada"?"Rede privada":dados.rede==="ambas"?"PNI e rede privada":dados.rede],
    ["Apresentações",dados.apresentacoes],
    ["Faixa etária",dados.faixa_etaria],
    ["Fabricante",dados.fabricante],
    ["Esquema de doses",dados.esquema_doses],
    ["Indicações",dados.indicacoes],
    ["Diferenciais clínicos",dados.diferenciais_clinicos],
    ["Conservação e temperatura",dados.conservacao_temperatura],
    ["Diluição e preparo",dados.diluicao_preparo],
    ["Via e sítio de aplicação",dados.via_sitio_aplicacao],
    ["Intervalos mínimos",dados.intervalos_minimos],
    ["Eventos adversos",dados.eventos_adversos],
    ["Contraindicações",dados.contraindicacoes],
  ];
  return <>{campos.filter(([,valor])=>Array.isArray(valor)?valor.length>0:Boolean(valor)).map(([titulo,valor])=><p className="guia-detalhe" key={titulo}><b>{titulo}:</b> {Array.isArray(valor)?valor.join("; "):valor}</p>)}</>;
}
export default function Card({v,privado,produtoKey,marcas,diferencial_sus,beneficio,extras,dadosGuia}){
  const k=produtoKey||v[0],c=privado&&produtos.CN[k],f=privado&&produtos.FI[k];
  const textoMarcas=marcas??dadosGuia?.nome_comercial??c?.marcas;
  const textoDiferencial=diferencial_sus??dadosGuia?.diferenciais_clinicos?.join("; ")??c?.diferencial_sus;
  const textoBeneficio=beneficio??dadosGuia?.beneficio??c?.beneficio;
  const blocos=extras??dadosGuia?.extras??v[3]??[];
  const mostrarFicha=f&&!dadosGuia?.extras?.some(x=>x.titulo==="Ficha de imunização");
  return(<details className="c"><summary><b>{v[0]}</b>{textoDiferencial&&<span className="diferencial">{textoDiferencial}</span>}<small>{v[1]}</small></summary><p>{v[2]}</p>
    {textoMarcas&&<p className="cm"><span className="pill">{dadosGuia?.nome_comercial?"Nome comercial":"Pague Menos"}</span>{textoMarcas}</p>}{mostrarFicha&&<p className="fi">{f}</p>}
    {textoBeneficio&&<p className="beneficio"><b>💡 Por que recomendar:</b> {textoBeneficio}</p>}
    <ConteudoGuia dados={dadosGuia}/>
    {blocos.filter(x=>x&&TIPOS_EXTRA.has(x.tipo)&&x.titulo&&x.conteudo).map((x,i)=><div className={`extra extra-${x.tipo}`} key={`${x.tipo}-${i}`}><b>{x.titulo}</b><p>{x.conteudo}</p></div>)}
  </details>);
}
export const Lista=({itens,privado})=><div className="grid">{itens.map((v,i)=><Card key={i} v={v} privado={privado}/>)}</div>;
