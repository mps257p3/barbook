// Gera screenshots reais do app rodando (dev server) para a ficha da Play Store.
// Uso: node scripts/take-screenshots.cjs   (com `npm run dev` já rodando na 5173)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_ROOT = path.join(__dirname, '..', '..', 'on-the-rocks-arquivos', 'play-store-screenshots');
const URL = 'http://localhost:5173';

const DEVICES = [
  { dir: 'phone', width: 700, height: 1516 },
  { dir: 'tablet-7', width: 1200, height: 1920 },
  { dir: 'tablet-10', width: 1600, height: 2560 },
];

async function skipTutorial(page) {
  try {
    const btn = page.getByText('Pular tour', { exact: true });
    if (await btn.isVisible({ timeout: 4000 })) await btn.click();
  } catch {}
}

async function shoot(page, dir, name) {
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log('  ->', file);
}

(async () => {
  const browser = await chromium.launch();
  for (const dev of DEVICES) {
    console.log(`\n=== ${dev.dir} (${dev.width}x${dev.height}) ===`);
    const dir = path.join(OUT_ROOT, dev.dir);
    fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: dev.width, height: dev.height } });
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await skipTutorial(page);
    await page.waitForTimeout(2200); // acomoda a animação de entrada do card (ken burns/settle)

    // 1) Descobrir (tela inicial, swipe)
    await shoot(page, dir, '1-descobrir');

    // 2) Explorar
    await page.getByRole('button', { name: /EXPLORAR/i }).click();
    await page.waitForTimeout(800);
    await shoot(page, dir, '2-explorar');

    // 3) Receita aberta (abre a primeira receita clicável da lista)
    try {
      await page.getByText('Negroni', { exact: true }).first().click({ timeout: 4000 });
    } catch {
      // fallback: qualquer card visível
      await page.locator('main').getByText(/./).first().click({ timeout: 4000 }).catch(() => {});
    }
    await page.waitForTimeout(900);
    await shoot(page, dir, '3-receita');
    // fecha o card: clica no fundo escuro (fora do sheet), longe do centro
    await page.locator('.otr-modal-backdrop').click({ position: { x: 5, y: 5 }, force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // 4) Bar (Meu Bar) — marca 2 bebidas para mostrar a lista de "drinks possíveis"
    try {
      await page.getByRole('button', { name: /^⊙? ?BAR$/i }).first().click({ timeout: 4000 });
      await page.waitForTimeout(800);
      await page.getByRole('button', { name: 'Gin', exact: true }).click({ timeout: 3000 }).catch(() => {});
      await page.getByRole('button', { name: 'Vermute Rosso', exact: true }).click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(600);
      await shoot(page, dir, '4-bar');
    } catch (e) {
      console.log('  (Bar não encontrado nesta tela, pulando)', e.message);
    }

    await page.close();
  }
  await browser.close();
  console.log('\nConcluído. Pasta:', OUT_ROOT);
})().catch(err => { console.error('FATAL', err); process.exit(1); });
