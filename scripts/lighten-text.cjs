// Clareia os textos: levanta a opacidade das cores de texto creme,
// mais nos escuros e menos nos claros (preserva a hierarquia).
// new = old + k*(1-old), k=0.18, arredondado a 2 casas, teto 0.96.
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "src", "App.jsx");
let src = fs.readFileSync(file, "utf8");

const k = 0.18;
const lift = (op) => {
  let v = op + k * (1 - op);
  if (v > 0.97) v = 0.97;
  if (v < op) v = op; // nunca reduzir um valor já claro
  return parseFloat(v.toFixed(2)).toString();
};

const families = ["240,235,225", "231,224,205"];
const seen = {};
let count = 0;
for (const fam of families) {
  const re = new RegExp(`color:"rgba\\(${fam},(0?\\.\\d+|1)\\)"`, "g");
  src = src.replace(re, (m, op) => {
    if (op === "1") return m; // já no máximo
    const nv = lift(parseFloat(op));
    seen[`${op} -> ${nv}`] = (seen[`${op} -> ${nv}`] || 0) + 1;
    count++;
    return `color:"rgba(${fam},${nv})"`;
  });
}

fs.writeFileSync(file, src);
console.log(`Substituições: ${count}`);
console.log("Mapeamento (old -> new : ocorrências):");
Object.keys(seen).sort((a,b)=>parseFloat(a)-parseFloat(b)).forEach(key => console.log(`  ${key} : ${seen[key]}`));
