window.scrollTo=()=>{};
import {render,screen,fireEvent,cleanup} from "@testing-library/react";import {describe,it,expect,afterEach} from "vitest";import App from "./App";
import Card from "./components/Card";
afterEach(()=>{cleanup();location.hash=""});
const go=h=>{location.hash=h;fireEvent(window,new HashChangeEvent("hashchange"))};
const idade=(a,m)=>{fireEvent.change(screen.getByLabelText(/^Anos/),{target:{value:String(a)}});fireEvent.change(screen.getByLabelText(/^Meses/),{target:{value:String(m)}})};
const txt=()=>document.body.textContent;
describe("Balcão Vacinal",()=>{
  it("idade de 2 meses mostra a faixa e o nome comercial da rede",()=>{render(<App/>);idade(0,2);expect(txt()).toContain("2 meses · Criança");expect(txt()).toContain("Hexaxim");expect(txt()).toContain("Rotateq")});
  it("cards com hexavalente mostram somente Hexaxim e Infanrix Hexa",()=>{for(const vacina of ["Hexavalente","DTPa + VIP"]){const {container,unmount}=render(<Card privado v={[vacina,"",""]}/>);const card=container.querySelector(".cm").textContent;expect(card).toContain("Hexaxim®");expect(card).toContain("Infanrix Hexa®");expect(card).not.toMatch(/Pentaxim|Infanrix Penta|pentavalentes acelulares/i);unmount()}});
  it("faixas por idade: adolescente, adulto, idoso e gestante",()=>{render(<App/>);idade(15,0);expect(txt()).toContain("Adolescente");idade(30,0);expect(txt()).toContain("Adulto");idade(70,0);expect(txt()).toContain("Idoso");idade(28,0);fireEvent.click(screen.getByLabelText(/Paciente gestante/));expect(txt()).toContain("Gestante")});
  it("alternar para SUS tira as etiquetas Pague Menos",()=>{render(<App/>);idade(0,2);expect(document.querySelectorAll(".pill").length).toBeGreaterThan(0);fireEvent.click(screen.getByText("SUS (PNI)"));expect(document.querySelectorAll(".pill").length).toBe(0);expect(txt()).toContain("Pentavalente")});
  it("calendário privado: quadros de atraso em todos os grupos adultos",()=>{render(<App/>);go("#privada");for(const g of ["Adolescente","Adulto","Idoso","Gestante"]){fireEvent.click(screen.getByRole("button",{name:g}));expect(txt()).toContain("Atraso e esquemas incompletos")}});
  it("calendário SUS e privado abrem todas as faixas da criança",()=>{for(const h of ["#privada","#sus"]){render(<App/>);go(h);for(const b of document.querySelectorAll(".tabs button")){fireEvent.click(b);expect(document.querySelectorAll("details.c").length).toBeGreaterThan(0)}cleanup()}});
  it("guia busca e febre tifoide aparece",()=>{render(<App/>);go("#guia");fireEvent.change(screen.getByPlaceholderText(/Buscar vacina/),{target:{value:"tifoide"}});expect(txt()).toContain("Typhim")});
  it("intervalos calcula a próxima dose",()=>{render(<App/>);go("#intervalos");fireEvent.change(document.querySelector("input[type=date]"),{target:{value:"2026-11-05"}});expect(txt()).toContain("Próxima dose a partir de")});
  it("caderneta lista pendentes e marcar reduz a contagem",()=>{render(<App/>);go("#caderneta");idade(2,0);const n=Number(txt().match(/Pendentes: (\d+)/)[1]);expect(n).toBeGreaterThan(0);fireEvent.click(document.querySelector(".ck input:not(:disabled)"));expect(Number(txt().match(/Pendentes: (\d+)/)[1])).toBe(n-1);expect(txt()).toContain("Só no SUS, encaminhar")});
  it("não há preços no app",()=>{render(<App/>);expect(txt()).not.toMatch(/R\$/)});
});
