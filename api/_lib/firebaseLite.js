// Substitui o SDK firebase-admin (que sozinho + suas dependências transitivas
// como @grpc/protobufjs/google-gax somam ~30MB+) por chamadas diretas: JWT
// verificado manualmente com crypto nativo do Node, e Firestore via REST API
// usando google-auth-library (bem mais leve). O firebase-admin completo estava
// estourando o limite de tamanho de function serverless da Vercel e causando
// FUNCTION_INVOCATION_FAILED — um crash no carregamento do módulo, antes de
// qualquer try/catch nosso rodar (por isso o cliente via só "Failed to fetch").
import { createVerify } from 'crypto';
import { GoogleAuth } from 'google-auth-library';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certsCache = { at: 0, certs: null };

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

async function getGoogleCerts() {
  const now = Date.now();
  if (certsCache.certs && now - certsCache.at < 3600_000) return certsCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  const certs = await res.json();
  certsCache = { at: now, certs };
  return certs;
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Verifica um Firebase ID token (RS256) manualmente: assinatura contra as
// chaves públicas do Google + claims (aud/iss/exp). Lança em qualquer falha.
export async function verifyFirebaseIdToken(idToken) {
  const sa = getServiceAccount();
  if (!sa) { const e = new Error('Autenticação indisponível.'); e.code = 'NO_SA'; throw e; }
  const projectId = sa.project_id;

  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token malformado');
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));

  if (header.alg !== 'RS256') throw new Error('Algoritmo de assinatura inesperado');
  const certs = await getGoogleCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error('Chave de assinatura desconhecida (token pode ter expirado)');

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  if (!verifier.verify(cert, base64UrlDecode(sigB64))) throw new Error('Assinatura inválida');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Token expirado');
  if (payload.iat > now + 300) throw new Error('Token com iat no futuro');
  if (payload.aud !== projectId) throw new Error('Token de outro projeto');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Emissor do token inválido');
  if (!payload.sub) throw new Error('Token sem uid');

  return { uid: payload.sub, email: payload.email || '' };
}

// Extrai e valida o Bearer token do header Authorization. Lança um erro com
// .status (401/503) pronto para o handler responder direto.
export async function requireAuth(req) {
  if (!getServiceAccount()) {
    const e = new Error('Autenticação indisponível no momento.');
    e.status = 503;
    throw e;
  }
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) {
    const e = new Error('Faça login para continuar.');
    e.status = 401;
    throw e;
  }
  try {
    return await verifyFirebaseIdToken(token);
  } catch {
    const e = new Error('Sessão expirada. Faça login novamente.');
    e.status = 401;
    throw e;
  }
}

// ── Firestore via REST (sem o SDK admin) ──────────────────────────────────
let authClient = null;
function getFirestoreAuth() {
  const sa = getServiceAccount();
  if (!sa) return null;
  if (!authClient) {
    authClient = new GoogleAuth({ credentials: sa, scopes: ['https://www.googleapis.com/auth/datastore'] });
  }
  return authClient;
}

async function firestoreToken() {
  const auth = getFirestoreAuth();
  if (!auth) throw new Error('Firestore indisponível (sem service account)');
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

function baseUrl() {
  const sa = getServiceAccount();
  return `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
}

// Converte um valor JS simples para o formato tipado do Firestore REST API.
function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, toFirestoreValue(val)])) } };
  return { stringValue: String(v) };
}

// Converte um documento do formato Firestore REST de volta para um objeto JS simples.
function fromFirestoreValue(v) {
  if (!v) return null;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, fromFirestoreValue(val)]));
  return null;
}

function docToObject(doc) {
  if (!doc || !doc.fields) return {};
  return Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, fromFirestoreValue(v)]));
}

// GET de um doc — { exists, data() } para ficar parecido com o SDK.
export async function firestoreGet(path) {
  const token = await firestoreToken();
  const res = await fetch(`${baseUrl()}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return { exists: false, data: () => ({}) };
  if (!res.ok) throw new Error(`Firestore GET ${path} falhou: HTTP ${res.status}`);
  const doc = await res.json();
  return { exists: true, data: () => docToObject(doc) };
}

// PATCH com merge (equivalente a setDoc(..., {merge:true})) — só os campos
// enviados são sobrescritos, os demais do documento existente são preservados.
export async function firestoreSet(path, data) {
  const token = await firestoreToken();
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFirestoreValue(v)]));
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const res = await fetch(`${baseUrl()}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore SET ${path} falhou: HTTP ${res.status}`);
  return res.json();
}

// arrayUnion simplificado: lê o array atual e agrega o valor (evita duplicar).
// Suficiente para os usos deste projeto (baixo volume de escrita concorrente).
export async function firestoreArrayUnion(path, field, value) {
  const snap = await firestoreGet(path);
  const current = Array.isArray(snap.data()[field]) ? snap.data()[field] : [];
  if (!current.includes(value)) current.push(value);
  await firestoreSet(path, { [field]: current });
}
