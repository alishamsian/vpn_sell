export function formatPrice(price: number) {
  return new Intl.NumberFormat("fa-IR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(price);
}

export function truncateConfig(config: string, maxLength = 80) {
  if (config.length <= maxLength) {
    return config;
  }

  return `${config.slice(0, maxLength)}...`;
}
