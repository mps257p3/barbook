import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Inicializa o firebase-admin uma vez (reaproveitado entre invocações quentes
// da mesma function serverless). Usa a env FIREBASE_SERVICE_ACCOUNT.
let ready = false;
export function ensureAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return false;
  if (!ready) {
    try {
      if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
      ready = true;
    } catch (e) {
      console.error('firebase-admin init falhou:', e.message);
      return false;
    }
  }
  return true;
}

// Extrai e valida o Bearer token do header Authorization. Lança um erro com
// .status (401) pronto para o handler responder direto.
export async function requireAuth(req) {
  if (!ensureAdmin()) {
    const err = new Error('Autenticação indisponível no momento.');
    err.status = 503;
    throw err;
  }
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) {
    const err = new Error('Faça login para continuar.');
    err.status = 401;
    throw err;
  }
  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    const err = new Error('Sessão expirada. Faça login novamente.');
    err.status = 401;
    throw err;
  }
}
