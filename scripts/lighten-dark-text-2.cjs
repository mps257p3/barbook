// 2º passe de acessibilidade: levanta SÓ a ponta escura dos textos creme,
// para baixa visão. Não mexe nos médios/claros que já estão bons.
//   op <= 0.50  -> +0.10
//   0.50<op<=0.62 -> +0.05
//   acima        -> inalterado    (teto 0.70, nunca reduz)
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "src", "App.jsx");
let src = fs.readFileSync(file, "utf8");

const lift = (op) => {
  let v = op;
  if (op <= 0.50) v = op + 0.10;
  else if (op <= 0.62) v = op + 0.05;
  if (v > 0.70) v = 0.70;
  if (v < op) v = op;
  return parseFloat(v.toFixed(2)).toString();
};

const families = ["240,235,225", "231,224,205"];
const seen = {};
let count = 0;
for (const fam of families) {
  const re = new RegExp(`color:"rgba\\(${fam},(0?\\.\\d+|1)\\)"`, "g");
  src = src.replace(re, (m, op) => {
    if (op === "1") return m;
    const nv = lift(parseFloat(op));
    if (nv === op) return m;
    seen[`${op} -> ${nv}`] = (seen[`${op} -> ${nv}`] || 0) + 1;
    count++;
    return `color:"rgba(${fam},${nv})"`;
  });
}
fs.writeFileSync(file, src);
console.log(`Ajustes: ${count}`);
Object.keys(seen).sort((a,b)=>parseFloat(a)-parseFloat(b)).forEach(k => console.log(`  ${k} : ${seen[k]}`));
