// Idade em meses a partir da data de nascimento (AAAA-MM-DD).
export const meses=(d)=>{const n=new Date(),b=new Date(d+"T12:00");let m=(n.getFullYear()-b.getFullYear())*12+n.getMonth()-b.getMonth();if(n.getDate()<b.getDate())m--;return m};
export const txtIdade=(m)=>m<24?`${m} meses`:m<144?`${Math.floor(m/12)} anos e ${m%12} meses`:`${Math.floor(m/12)} anos`;
// Idade mínima (em meses) de cada faixa da criança: rede privada (TP) e SUS (TS). A ordem segue calendario.json.
export const TP=[0,2,3,4,5,6,7,9,12,15,18,48,108],TS=[0,2,3,4,5,6,7,9,12,15,48,108];
export const faixa=(m,T)=>T.reduce((k,t,i)=>m>=t?i:k,0);
export const grupo=(m,gest)=>gest&&m>=132&&m<720?"Gestante":m>=720?"Idoso":m>=240?"Adulto":m>=132?"Adolescente":"Criança";
export const idadeMeses=(a,e,n)=>n?meses(n):a===""&&e===""?null:(+a||0)*12+(+e||0);
