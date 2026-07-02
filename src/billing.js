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

// Dispara o fluxo de compra do pack. Resolve true ao concluir; lança em erro.
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
  // complete('success') confirma (acknowledge) a compra junto ao Play — sem
  // isso o Google estorna automaticamente em ~3 dias.
  await response.complete("success");
  return true;
}

// Compras ativas nesta conta Google Play (restauração em novo aparelho/reinstalação).
export async function listOwnedSkus() {
  const service = await getService();
  const purchases = await service.listPurchases();
  return purchases.map(p => p.itemId).filter(Boolean);
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
