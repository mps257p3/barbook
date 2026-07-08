import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { ensureAdmin } from './_lib/firebaseAdmin.js';

const ALLOWED_ORIGINS = [
  'https://on-the-rocks-manager.vercel.app',
  'https://barbook-otyb.vercel.app',
];
// previews do Vercel dos dois projetos
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/barbook-[a-z0-9-]+\.vercel\.app$/i,
  /^https:\/\/on-the-rocks-manager-[a-z0-9-]+\.vercel\.app$/i,
];
const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
]);
const MAX_TOKENS_CAP = 1500;
const RATE_LIMIT = 20;         // requisições por janela, por IP (por instância)
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

// Só o admin (dono do app) fica isento de limite. Colaboradores e o grupo dev
// (Carol, André etc.) usam a IA com o mesmo limite de qualquer usuário comum.
const ADMIN_EMAIL = 'marceloparducci@gmail.com';
// usageType → chave do limite em manager/config + default se não configurado
const LIMIT_KEYS = {
  scan:        { key: 'scanDailyLimit',         def: 10 }, // importar receita por foto (imagem + sonnet — o mais caro)
  profile:     { key: 'aiProfileDailyLimit',    def: 30 }, // sugerir perfil/categorias ao criar receita (botão, haiku)
  autoProfile: { key: 'aiAutoProfileDailyLimit',def: 60 }, // perfil gerado sozinho ao abrir/passar receitas (haiku, mas roda sem clique)
  steps:       { key: 'aiStepsDailyLimit',      def: 15 }, // gerar modo de preparo (botão, sonnet)
};

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))) return true;
  // Allow any localhost port for local development
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  recent.push(now);
  if (hits.size > 5000) hits.clear();
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

// cache da config (limites diários de IA) por 60s para não ler manager/config a cada chamada
let cfgCache = { at: 0, data: null };
async function getConfig(db) {
  const now = Date.now();
  if (cfgCache.data && now - cfgCache.at < 60_000) return cfgCache.data;
  try {
    const snap = await db.doc('manager/config').get();
    cfgCache = { at: now, data: snap.exists ? snap.data() : {} };
  } catch { cfgCache = { at: now, data: cfgCache.data || {} }; }
  return cfgCache.data;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too Many Requests' });
  }

  const body = req.body || {};
  if (!ALLOWED_MODELS.has(body.model)) {
    return res.status(400).json({ error: 'Model not allowed' });
  }
  body.max_tokens = Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS_CAP);

  // usageType é campo NOSSO (não da Anthropic) — separa antes de encaminhar
  const { usageType, ...anthropicBody } = body;

  // ── Camada de auth + limite por usuário (ativa só com a service account) ──
  let usageRef = null, usageField = null;
  if (ensureAdmin()) {
    const authz = req.headers.authorization || '';
    const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Faça login para usar a IA.' });
    }
    let decoded;
    try { decoded = await getAuth().verifyIdToken(token); }
    catch { return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' }); }

    const email = (decoded.email || '').toLowerCase();
    const db = getFirestore();
    const cfg = await getConfig(db);
    const isAdmin = email === ADMIN_EMAIL;

    if (!isAdmin) {
      const t = LIMIT_KEYS[usageType] || LIMIT_KEYS.profile;
      const limit = Number.isFinite(cfg[t.key]) ? cfg[t.key] : t.def;
      const day = new Date().toISOString().slice(0, 10);
      usageField = `${day}_${usageType || 'other'}`;
      usageRef = db.doc(`aiUsage/${decoded.uid}`);
      try {
        const snap = await usageRef.get();
        const used = (snap.exists && snap.data()[usageField]) || 0;
        if (used >= limit) {
          return res.status(429).json({ error: `Limite diário de IA atingido (${limit}/dia). Volte amanhã.` });
        }
      } catch (e) { console.error('leitura de aiUsage falhou:', e.message); usageRef = null; }
    }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(anthropicBody),
    });

    const data = await response.json();
    // consome a cota só quando a leitura de fato aconteceu (chamada bem-sucedida)
    if (response.ok && usageRef && usageField) {
      try { await usageRef.set({ [usageField]: FieldValue.increment(1) }, { merge: true }); } catch {}
    }
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
