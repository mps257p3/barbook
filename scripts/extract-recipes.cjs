const fs = require('fs');
const path = require('path');

// __dirname é .../on-the-rocks/scripts — o código fica um nível acima
const PROJECT_DIR = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(PROJECT_DIR, 'src', 'App.jsx'), 'utf8');

const recipes = [];
const regex = /\{name:"([^"]+)",categories:\[([^\]]+)\]/g;
let match;

while ((match = regex.exec(content)) !== null) {
  const name = match[1];
  const cats = match[2]
    .split(',')
    .map(c => c.replace(/"/g, '').replace(/St‑Germain/g, 'St-Germain').trim())
    .filter(Boolean);
  recipes.push({ name, categories: cats });
}

const output = `export const BASE_RECIPES = ${JSON.stringify(recipes, null, 2)};\n`;

const outPath = path.join(PROJECT_DIR, '..', 'On the Rocks - manager', 'src', 'data', 'recipes.js');
fs.writeFileSync(outPath, output, 'utf8');
console.log(`Extraídas ${recipes.length} receitas → ${outPath}`);
