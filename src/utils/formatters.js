export const formatCurrency = (amount, locale = "ko-KR", currency = "KRW") => {
  if (typeof amount !== "number") return "0원";

  if (currency === "KRW") {
    return amount.toLocaleString("ko-KR") + "원";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercent = (value, decimals = 2) => {
  if (typeof value !== "number") return "0.00%";
  return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (value, decimals = 2) => {
  if (typeof value !== "number") return "0";
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
