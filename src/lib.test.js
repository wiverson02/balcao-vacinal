import {describe,it,expect,beforeEach,afterEach,vi} from "vitest";
import {meses,txtIdade,TP,TS,faixa,grupo,idadeMeses} from "./lib";
import calendario from "./data/calendario.json";

// Data fixa para os testes de idade não dependerem do dia em que rodam: 15/06/2026, meio-dia.
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date("2026-06-15T12:00:00"))});
afterEach(()=>{vi.useRealTimers()});

describe("meses (idade em meses a partir da data de nascimento)",()=>{
  it("nascido hoje tem 0 meses",()=>{expect(meses("2026-06-15")).toBe(0)});
  it("completa o mês exatamente no dia do aniversário mensal",()=>{
    expect(meses("2026-05-15")).toBe(1);
    expect(meses("2026-05-16")).toBe(0);
  });
  it("2 meses: limite exato e um dia antes",()=>{
    expect(meses("2026-04-15")).toBe(2);
    expect(meses("2026-04-16")).toBe(1);
  });
  it("atravessa a virada de ano",()=>{expect(meses("2025-12-15")).toBe(6)});
  it("1 ano, 12 meses e 5 anos",()=>{
    expect(meses("2025-06-15")).toBe(12);
    expect(meses("2021-06-15")).toBe(60);
  });
  it("um dia antes de completar 5 anos ainda tem 59 meses",()=>{expect(meses("2021-06-16")).toBe(59)});
  it("adulto: 60 anos exatos = 720 meses e um dia antes = 719",()=>{
    expect(meses("1966-06-15")).toBe(720);
    expect(meses("1966-06-16")).toBe(719);
  });
  it("nascido em 29/02 (ano bissexto) não quebra",()=>{
    expect(meses("2024-02-29")).toBe(27);
  });
  it("data no futuro devolve número negativo (a tela precisa tratar isso)",()=>{expect(meses("2026-07-15")).toBeLessThan(0)});
  it("data inválida devolve NaN",()=>{expect(meses("abc")).toBeNaN()});
  // Comportamento atual a ser decidido: quem nasceu no dia 31 só "fecha" o mês no dia 31 do mês seguinte.
  it("nascido no dia 31 e hoje dia 28/02: ainda conta como 0 meses (regra do dia do mês)",()=>{
    vi.setSystemTime(new Date("2026-02-28T12:00:00"));
    expect(meses("2026-01-31")).toBe(0);
  });
});

describe("txtIdade",()=>{
  it("menos de 24 meses mostra só meses",()=>{
    expect(txtIdade(0)).toBe("0 meses");
    expect(txtIdade(2)).toBe("2 meses");
    expect(txtIdade(23)).toBe("23 meses");
  });
  it("de 24 meses até 11 anos mostra anos e meses",()=>{
    expect(txtIdade(24)).toBe("2 anos e 0 meses");
    expect(txtIdade(30)).toBe("2 anos e 6 meses");
    expect(txtIdade(143)).toBe("11 anos e 11 meses");
  });
  it("a partir de 12 anos mostra só anos",()=>{
    expect(txtIdade(144)).toBe("12 anos");
    expect(txtIdade(155)).toBe("12 anos");
    expect(txtIdade(720)).toBe("60 anos");
  });
});

describe("tabelas de faixas (TP privada, TS SUS)",()=>{
  it("estão em ordem estritamente crescente e começam em 0",()=>{
    for(const T of [TP,TS]){
      expect(T[0]).toBe(0);
      for(let i=1;i<T.length;i++)expect(T[i]).toBeGreaterThan(T[i-1]);
    }
  });
  // Se alguém editar o calendário sem ajustar TP/TS, estes testes avisam.
  it("têm uma entrada para cada faixa da criança em calendario.json",()=>{
    expect(TP.length).toBe(calendario.privada.crianca.length);
    expect(TS.length).toBe(calendario.sus.crianca.length);
  });
  it("o limite de cada faixa bate com o rótulo dela no calendário",()=>{
    const emMeses=(r)=>{
      if(/ao nascer/i.test(r))return 0;
      const m=r.match(/^(\d+)(?:-\d+)?\s*(meses|anos)/i);
      return m?(+m[1])*(m[2].toLowerCase()==="anos"?12:1):null;
    };
    calendario.privada.crianca.forEach((f,i)=>expect(emMeses(f[0]),f[0]).toBe(TP[i]));
    calendario.sus.crianca.forEach((f,i)=>expect(emMeses(f[0]),f[0]).toBe(TS[i]));
  });
});

describe("faixa (índice da faixa etária da criança)",()=>{
  it("0 meses cai na primeira faixa",()=>{expect(faixa(0,TP)).toBe(0);expect(faixa(0,TS)).toBe(0)});
  it("respeita o limite inferior de cada faixa da rede privada",()=>{
    TP.forEach((t,i)=>{expect(faixa(t,TP)).toBe(i)});
  });
  it("respeita o limite inferior de cada faixa do SUS",()=>{
    TS.forEach((t,i)=>{expect(faixa(t,TS)).toBe(i)});
  });
  it("um mês antes do limite fica na faixa anterior",()=>{
    TP.forEach((t,i)=>{if(i>0)expect(faixa(t-1,TP)).toBe(i-1)});
    TS.forEach((t,i)=>{if(i>0)expect(faixa(t-1,TS)).toBe(i-1)});
  });
  it("1 mês fica na faixa de 0; 2 meses vai para a de 2 meses",()=>{
    expect(faixa(1,TP)).toBe(0);
    expect(faixa(2,TP)).toBe(1);
  });
  it("faixa 18 meses existe na rede privada mas não no SUS",()=>{
    expect(TP).toContain(18);
    expect(TS).not.toContain(18);
    expect(faixa(18,TP)).toBe(TP.indexOf(18));
    expect(faixa(18,TS)).toBe(TS.indexOf(15));
  });
  it("idade acima da última faixa usa a última (9 anos em diante)",()=>{
    expect(faixa(108,TP)).toBe(TP.length-1);
    expect(faixa(131,TP)).toBe(TP.length-1);
    expect(faixa(108,TS)).toBe(TS.length-1);
  });
  it("idade negativa cai na faixa 0 (comportamento atual)",()=>{expect(faixa(-5,TP)).toBe(0)});
});

describe("grupo (Criança, Adolescente, Adulto, Idoso, Gestante)",()=>{
  it("até 10 anos e 11 meses é Criança",()=>{
    expect(grupo(0)).toBe("Criança");
    expect(grupo(131)).toBe("Criança");
  });
  it("12 anos (132 meses) vira Adolescente",()=>{
    expect(grupo(132)).toBe("Adolescente");
    expect(grupo(239)).toBe("Adolescente");
  });
  it("20 anos (240 meses) vira Adulto",()=>{
    expect(grupo(240)).toBe("Adulto");
    expect(grupo(719)).toBe("Adulto");
  });
  it("60 anos (720 meses) vira Idoso",()=>{
    expect(grupo(720)).toBe("Idoso");
    expect(grupo(1200)).toBe("Idoso");
  });
  it("gestante vale só entre 12 e 59 anos",()=>{
    expect(grupo(131,true)).toBe("Criança");
    expect(grupo(132,true)).toBe("Gestante");
    expect(grupo(300,true)).toBe("Gestante");
    expect(grupo(719,true)).toBe("Gestante");
    expect(grupo(720,true)).toBe("Idoso");
  });
  it("sem marcar gestante nunca devolve Gestante",()=>{
    for(const m of [0,132,300,719,720])expect(grupo(m,false)).not.toBe("Gestante");
  });
});

describe("idadeMeses (junta anos, meses e data de nascimento)",()=>{
  it("campos vazios devolvem null",()=>{expect(idadeMeses("","","")).toBeNull()});
  it("só anos: converte para meses",()=>{expect(idadeMeses("5","","")).toBe(60)});
  it("só meses",()=>{expect(idadeMeses("","2","")).toBe(2)});
  it("anos e meses juntos",()=>{expect(idadeMeses("1","6","")).toBe(18)});
  it("aceita números além de texto",()=>{expect(idadeMeses(2,3,"")).toBe(27)});
  it("zero é idade válida (recém-nascido), não vazio",()=>{expect(idadeMeses("0","0","")).toBe(0)});
  it("a data de nascimento tem prioridade sobre anos e meses",()=>{
    expect(idadeMeses("30","0","2026-04-15")).toBe(2);
  });
  it("texto não numérico em um campo é tratado como 0",()=>{expect(idadeMeses("abc","3","")).toBe(3)});
  it("só um campo preenchido já basta",()=>{
    expect(idadeMeses("","","2026-05-15")).toBe(1);
    expect(idadeMeses("0","","")).toBe(0);
  });
});

describe("integração: da data de nascimento até a faixa",()=>{
  const dePorNascimento=(nasc,gest)=>{const m=idadeMeses("","",nasc);return {m,priv:faixa(m,TP),sus:faixa(m,TS),g:grupo(m,gest)}};
  it("bebê de 2 meses cai na faixa de 2 meses nas duas redes",()=>{
    const r=dePorNascimento("2026-04-15");
    expect(r.priv).toBe(TP.indexOf(2));
    expect(r.sus).toBe(TS.indexOf(2));
    expect(r.g).toBe("Criança");
  });
  it("um dia antes de completar 2 meses ainda é a faixa do nascimento",()=>{
    const r=dePorNascimento("2026-04-16");
    expect(r.priv).toBe(0);
    expect(r.sus).toBe(0);
  });
  it("adolescente de 15 anos",()=>{expect(dePorNascimento("2011-06-15").g).toBe("Adolescente")});
  it("gestante de 28 anos",()=>{expect(dePorNascimento("1998-06-15",true).g).toBe("Gestante")});
  it("idoso de 70 anos",()=>{expect(dePorNascimento("1956-06-15").g).toBe("Idoso")});
});
