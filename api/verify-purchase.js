import { GoogleAuth } from 'google-auth-library';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth } from './_lib/firebaseAdmin.js';

const ALLOWED_ORIGINS = [
  'https://on-the-rocks-manager.vercel.app',
  'https://barbook-otyb.vercel.app',
];
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/barbook-[a-z0-9-]+\.vercel\.app$/i,
  /^https:\/\/on-the-rocks-manager-[a-z0-9-]+\.vercel\.app$/i,
];
function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin))) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

const PACKAGE_NAME = 'com.marceloparducci.ontherocks';

// Gera um access token OAuth2 a partir da service account do Play Console.
// Reaproveitado entre invocações quentes (o GoogleAuth já cacheia internamente).
let authClient = null;
function getPlayAuth() {
  const raw = process.env.PLAY_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (!authClient) {
    authClient = new GoogleAuth({
      credentials: JSON.parse(raw),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
  }
  return authClient;
}

// Consulta a Google Play Developer API para confirmar se o purchaseToken é
// válido, real e corresponde a este productId. purchaseState: 0=comprado,
// 1=cancelado, 2=pendente. Só 0 é aceito.
async function verifyWithPlay(productId, purchaseToken) {
  const auth = getPlayAuth();
  if (!auth) {
    const err = new Error('Verificação de compra indisponível no momento.');
    err.status = 503;
    throw err;
  }
  const client = await auth.getClient();
  const { token: accessToken } = await client.getAccessToken();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const err = new Error('Não foi possível confirmar esta compra junto ao Google Play.');
    err.status = 400;
    throw err;
  }
  const data = await resp.json();
  if (data.purchaseState !== 0) {
    const err = new Error('Esta compra não está confirmada (cancelada ou pendente).');
    err.status = 400;
    throw err;
  }
  return data;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const decoded = await requireAuth(req);
    const { packId, purchaseToken } = req.body || {};
    if (!packId || typeof packId !== 'string' || !purchaseToken || typeof purchaseToken !== 'string') {
      return res.status(400).json({ error: 'Dados da compra incompletos.' });
    }

    const db = getFirestore();

    // Anti-reuso: um purchaseToken só pode desbloquear uma vez. Se já foi
    // verificado por ESTE usuário, responde ok (idempotente — reload/retry
    // não deve dar erro). Se foi verificado por OUTRO usuário, rejeita.
    const tokenRef = db.doc(`verifiedPurchases/${encodeURIComponent(purchaseToken)}`);
    const tokenSnap = await tokenRef.get();
    if (tokenSnap.exists) {
      const existing = tokenSnap.data();
      if (existing.uid === decoded.uid && existing.packId === packId) {
        return res.status(200).json({ ok: true, alreadyVerified: true });
      }
      return res.status(409).json({ error: 'Esta compra já foi usada em outra conta.' });
    }

    await verifyWithPlay(packId, purchaseToken);

    // Verificação passou: grava o desbloqueio (só o servidor pode escrever
    // unlockedPacks — ver firestore.rules) e registra o token como usado.
    const userRef = db.doc(`users/${decoded.uid}`);
    await Promise.all([
      userRef.set({ unlockedPacks: FieldValue.arrayUnion(packId) }, { merge: true }),
      tokenRef.set({ uid: decoded.uid, packId, verifiedAt: FieldValue.serverTimestamp() }),
    ]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('verify-purchase:', err);
    return res.status(status).json({ error: err.message || 'Erro ao verificar compra.' });
  }
}
