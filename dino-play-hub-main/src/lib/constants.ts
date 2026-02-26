export const ARCADE_PRICE = 3500;
export const VR_PRICE = 6000;
export const PROMO_GAMES_FOR_COUPON = 6;

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateSettlement(params: {
  initialTokens: number;
  finalTokens: number;
  vrUses: number;
  arcadeCoupons: number;
  vrCoupons: number;
  baseMoney: number;
  nequiDeposits?: number;
  productSales?: number;
}) {
  // Arcade coupons discount from arcade sales; VR coupons are just recorded
  const tokensConsumed = Math.max(0, params.initialTokens - params.finalTokens);
  const arcadeSales = Math.max(0, (tokensConsumed - params.arcadeCoupons) * ARCADE_PRICE);
  const vrSales = params.vrUses * VR_PRICE;
  const productSales = params.productSales || 0;
  const nequiDeposits = params.nequiDeposits || 0;

  // Net profit = only what was sold (arcade + vr + products). Nequi is informational only.
  const totalVendido = arcadeSales + vrSales + productSales;
  const netProfit = totalVendido;

  return {
    arcadeSales,
    vrSales,
    productSales,
    nequiDeposits,
    totalVendido,
    netProfit: Math.max(0, netProfit),
  };
}
