export const formatPrice = (price) => {
  const amount = Number(price || 0);
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `PKR ${safeAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};
