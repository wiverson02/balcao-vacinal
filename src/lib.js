import cal from "./data/calendario.json";
// Idade em meses a partir da data de nascimento (AAAA-MM-DD).
export const meses=(d)=>{const n=new Date(),b=new Date(d+"T12:00");let m=(n.getFullYear()-b.getFullYear())*12+n.getMonth()-b.getMonth();if(n.getDate()<b.getDate())m--;return m};
export const txtIdade=(m)=>m<24?`${m} meses`:m<144?`${Math.floor(m/12)} anos e ${m%12} meses`:`${Math.floor(m/12)} anos`;
// Idade mínima (em meses) de cada faixa da criança. Vem do próprio calendario.json (3º item de cada faixa),
// então não existe mais uma tabela separada para manter em sincronia: rede privada (TP) e SUS (TS).
export const TP=cal.privada.crianca.map(f=>f[2]),TS=cal.sus.crianca.map(f=>f[2]);
export const faixa=(m,T)=>T.reduce((k,t,i)=>m>=t?i:k,0);
export const grupo=(m,gest)=>gest&&m>=132&&m<720?"Gestante":m>=720?"Idoso":m>=240?"Adulto":m>=132?"Adolescente":"Criança";
export const idadeMeses=(a,e,n)=>n?meses(n):a===""&&e===""?null:(+a||0)*12+(+e||0);
