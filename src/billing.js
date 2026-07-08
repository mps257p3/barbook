// ─── Google Play Billing (Digital Goods API) ─────────────────────────────────
// Compra de packs dentro do app Android instalado pela Play (TWA com o recurso
// playBilling habilitado no twa-manifest). Fora dele (navegador, iOS), a API
// não existe — billingAvailable() retorna false e a UI mostra o fallback.
//
// O ID do produto (SKU) cadastrado no Play Console DEVE ser o id do pack no
// Firestore (ex.: "dg844k35") — é assim que compra e desbloqueio se casam.

const PLAY_BILLING = "https://play.google.com/billing";

export const billingAvailable = () => typeof window !== "undefined" && "getDigitalGoodsService" in window;

async function getService() {
  return await window.getDigitalGoodsService(PLAY_BILLING);
}

// Dispara o fluxo de compra do pack. Devolve { response, purchaseToken } —
// NÃO confirma a compra sozinho: o chamador deve mandar o purchaseToken para
// /api/verify-purchase e só então chamar response.complete("success"|"fail").
// Isso é o que impede o usuário de se autodesbloquear sem pagar de verdade.
// Cancelamento pelo usuário chega como AbortError — o chamador ignora.
export async function purchasePack(sku) {
  const service = await getService();
  const details = await service.getDetails([sku]);
  if (!details || !details.length) {
    throw new Error(`Produto "${sku}" não está cadastrado no Google Play.`);
  }
  const item = details[0];
  const request = new PaymentRequest(
    [{ supportedMethods: PLAY_BILLING, data: { sku } }],
    { total: { label: item.title || "Coleção", amount: { currency: item.price.currency, value: item.price.value } } }
  );
  const response = await request.show();
  const purchaseToken = response.details?.purchaseToken;
  if (!purchaseToken) {
    await response.complete("fail");
    throw new Error("Não foi possível obter o comprovante da compra.");
  }
  return { response, purchaseToken };
}

// Compras ativas nesta conta Google Play (restauração em novo aparelho/reinstalação).
// Devolve { sku, purchaseToken } de cada uma — o token é necessário para
// re-verificar a compra no servidor antes de restaurar o desbloqueio.
export async function listOwnedSkus() {
  const service = await getService();
  const purchases = await service.listPurchases();
  return purchases
    .filter(p => p.itemId && p.purchaseToken)
    .map(p => ({ sku: p.itemId, purchaseToken: p.purchaseToken }));
}

// Preço formatado de um produto (para exibir no botão), ou null se indisponível.
export async function getPackPrice(sku) {
  try {
    const service = await getService();
    const [item] = await service.getDetails([sku]);
    if (!item) return null;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: item.price.currency }).format(Number(item.price.value));
  } catch { return null; }
}
