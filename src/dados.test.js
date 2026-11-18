import {describe,it,expect} from "vitest";
import cal from "./data/calendario.json";
import produtos from "./data/produtos.json";
import intervalos from "./data/intervalos.json";
import materiais from "./data/materiais.json";
import fontes from "./data/fontes.json";
import meta from "./data/meta.json";

// Estes testes protegem os dados, não a tela. Rode `npm test` depois de editar qualquer JSON em src/data/.
// Se um deles falhar, a mensagem diz qual vacina ou faixa está com problema.

const texto=(x)=>typeof x==="string"&&x.trim()!==""&&x===x.trim();
const nomesDoCalendario=()=>new Set([
  ...cal.privada.crianca.flatMap(f=>f[1].map(v=>v[0])),
  ...Object.values(cal.privada.grupos).flatMap(l=>l.map(v=>v[0])),
]);

describe("calendario.json: faixas da criança",()=>{
  for(const modo of ["privada","sus"]){
    const faixas=cal[modo].crianca;
    describe(modo,()=>{
      it("cada faixa tem rótulo, lista de vacinas e idade mínima em meses",()=>{
        faixas.forEach(f=>{
          expect(f.length,f[0]).toBe(3);
          expect(texto(f[0]),`rótulo: ${JSON.stringify(f[0])}`).toBe(true);
          expect(Array.isArray(f[1]),f[0]).toBe(true);
          expect(f[1].length,`${f[0]} sem vacinas`).toBeGreaterThan(0);
          expect(Number.isInteger(f[2])&&f[2]>=0,`${f[0]}: idade mínima inválida`).toBe(true);
        });
      });
      it("idades mínimas crescem sem repetir e a primeira faixa começa em 0",()=>{
        expect(faixas[0][2]).toBe(0);
        for(let i=1;i<faixas.length;i++)expect(faixas[i][2],faixas[i][0]).toBeGreaterThan(faixas[i-1][2]);
      });
      it("rótulos das faixas não se repetem",()=>{
        const r=faixas.map(f=>f[0]);expect(new Set(r).size).toBe(r.length);
      });
      it("nenhuma vacina aparece duas vezes na mesma faixa",()=>{
        faixas.forEach(f=>{const n=f[1].map(v=>v[0]);expect(new Set(n).size,`${f[0]}: ${n.join(", ")}`).toBe(n.length)});
      });
    });
  }
});

describe("calendario.json: vacinas (nome, protege contra, esquema)",()=>{
  const todas=[];
  for(const modo of ["privada","sus"]){
    cal[modo].crianca.forEach(f=>f[1].forEach(v=>todas.push([`${modo} / ${f[0]}`,v])));
    Object.entries(cal[modo].grupos).forEach(([g,l])=>l.forEach(v=>todas.push([`${modo} / ${g}`,v])));
  }
  it("toda vacina tem exatamente 3 textos preenchidos e sem espaço sobrando",()=>{
    todas.forEach(([onde,v])=>{
      expect(v.length,`${onde}: ${JSON.stringify(v)}`).toBe(3);
      v.forEach((x,i)=>expect(texto(x),`${onde} / ${v[0]}: campo ${i} vazio ou com espaço sobrando`).toBe(true));
    });
  });
  it("a rede privada e o SUS têm os mesmos grupos de adolescente, adulto, idoso e gestante",()=>{
    const g=["Adolescente","Adulto","Idoso","Gestante"];
    expect(Object.keys(cal.privada.grupos)).toEqual(g);
    expect(Object.keys(cal.sus.grupos)).toEqual(g);
  });
});

describe("calendario.json: esquemas de resgate (atraso)",()=>{
  it("resgateCrianca: cada chave é uma vacina que existe no calendário da criança e tem texto",()=>{
    const nomes=new Set(cal.privada.crianca.flatMap(f=>f[1].map(v=>v[0])));
    Object.entries(cal.privada.resgateCrianca).forEach(([n,t])=>{
      expect(nomes.has(n),`resgateCrianca: "${n}" não existe no calendário da criança`).toBe(true);
      expect(texto(t),`resgateCrianca: "${n}" sem texto`).toBe(true);
    });
  });
  it("resgateGrupos: só grupos que existem, cada item é [título, texto]",()=>{
    Object.entries(cal.privada.resgateGrupos).forEach(([g,l])=>{
      expect(cal.privada.grupos[g],`resgateGrupos: grupo "${g}" não existe`).toBeDefined();
      l.forEach(x=>{expect(x.length,`${g}: ${JSON.stringify(x)}`).toBe(2);x.forEach(y=>expect(texto(y),`${g}: item vazio`).toBe(true))});
    });
  });
});

describe("produtos.json: nomes comerciais da rede",()=>{
  it("cada produto (CN) tem marcas preenchidas; diferencial e benefício podem ficar vazios (ex.: Febre amarela), mas sem espaço sobrando",()=>{
    Object.entries(produtos.CN).forEach(([n,p])=>{
      expect(texto(p.marcas),`CN "${n}": marcas vazio`).toBe(true);
      ["diferencial_sus","beneficio"].forEach(c=>expect(typeof p[c]==="string"&&p[c]===p[c].trim(),`CN "${n}": campo ${c} ausente ou com espaço sobrando`).toBe(true));
    });
  });
  it("cada chave de CN e FI aponta para uma vacina do calendário da rede privada ou da lista EX (erro de digitação some silenciosamente na tela)",()=>{
    const nomes=nomesDoCalendario();produtos.EX.forEach(v=>nomes.add(v[0]));
    for(const bloco of ["CN","FI"])Object.keys(produtos[bloco]).forEach(n=>expect(nomes.has(n),`${bloco}: "${n}" não existe no calendário nem em EX (erro de digitação?)`).toBe(true));
  });
  it("EX (fora do calendário): pares [nome, protege contra] preenchidos",()=>{
    produtos.EX.forEach(v=>{expect(v.length).toBe(2);v.forEach(x=>expect(texto(x),JSON.stringify(v)).toBe(true))});
  });
});

describe("intervalos.json",()=>{
  it("cada linha é [nome, dias inteiros maiores que 0, texto]",()=>{
    intervalos.forEach(r=>{
      expect(r.length,JSON.stringify(r)).toBe(3);
      expect(texto(r[0]),JSON.stringify(r)).toBe(true);
      expect(Number.isInteger(r[1])&&r[1]>0,`${r[0]}: dias inválidos`).toBe(true);
      expect(texto(r[2]),`${r[0]}: texto vazio`).toBe(true);
    });
  });
  it("nomes não se repetem",()=>{const n=intervalos.map(r=>r[0]);expect(new Set(n).size).toBe(n.length)});
});

describe("materiais.json",()=>{
  it("cada link é https válido, com título e descrição",()=>{
    materiais.forEach(([url,titulo,desc])=>{
      expect(()=>new URL(url),url).not.toThrow();
      expect(new URL(url).protocol,url).toBe("https:");
      expect(texto(titulo),url).toBe(true);expect(texto(desc),url).toBe(true);
    });
  });
});

const dataValida=(d)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(new Date(d+"T12:00").getTime());

describe("fontes.json: registro dos documentos",()=>{
  it("cada fonte tem id, instituição e título; arquivo, url e conferidoEm são opcionais",()=>{
    fontes.forEach(f=>{
      expect(/^[a-z0-9-]+$/.test(f.id),`id inválido: ${f.id}`).toBe(true);
      expect(texto(f.instituicao),`${f.id}: instituição`).toBe(true);
      expect(texto(f.titulo),`${f.id}: título`).toBe(true);
      if(f.arquivo!==undefined)expect(/\.pdf$/i.test(f.arquivo),`${f.id}: arquivo deve ser .pdf`).toBe(true);
      if(f.url!==undefined)expect(new URL(f.url).protocol,`${f.id}: url`).toBe("https:");
      if(f.conferidoEm!==null&&f.conferidoEm!==undefined)expect(dataValida(f.conferidoEm),`${f.id}: conferidoEm inválido`).toBe(true);
    });
  });
  it("ids não se repetem",()=>{const i=fontes.map(f=>f.id);expect(new Set(i).size).toBe(i.length)});
});

describe("meta.json: data dos dados e fonte de cada seção",()=>{
  const ids=new Set(fontes.map(f=>f.id));
  const secoesDoCalendario=()=>{
    const r=["privada.crianca","sus.crianca","privada.resgateCrianca"];
    for(const m of ["privada","sus"])Object.keys(cal[m].grupos).forEach(g=>r.push(`${m}.grupos.${g}`));
    Object.keys(cal.privada.resgateGrupos).forEach(g=>r.push(`privada.resgateGrupos.${g}`));
    return r;
  };
  it("atualizadoEm é uma data válida e não está no futuro",()=>{
    expect(dataValida(meta.atualizadoEm),meta.atualizadoEm).toBe(true);
    expect(new Date(meta.atualizadoEm+"T12:00").getTime()).toBeLessThanOrEqual(Date.now()+24*3600*1000);
  });
  it("toda seção do calendário declara pelo menos uma fonte",()=>{
    secoesDoCalendario().forEach(k=>expect(meta.secoes[k]?.length,`seção sem fonte em meta.json: ${k}`).toBeGreaterThan(0));
  });
  it("toda fonte citada em meta.json existe em fontes.json",()=>{
    Object.entries(meta.secoes).forEach(([k,l])=>l.forEach(id=>expect(ids.has(id),`${k}: fonte "${id}" não existe em fontes.json`).toBe(true)));
  });
  it("nenhuma seção de meta.json é inventada (erro de digitação na chave)",()=>{
    const validas=new Set([...secoesDoCalendario(),"produtos.CN","produtos.FI","intervalos"]);
    Object.keys(meta.secoes).forEach(k=>expect(validas.has(k),`seção desconhecida em meta.json: ${k}`).toBe(true));
  });
});
