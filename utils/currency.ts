export const mainCurrency = "DZD";

export const formatCurrency = (
  amount: number,
  currency: string,
  amountSecondCurrency?: number,
) => {
  let amountToFormat = amount;
  if (currency !== mainCurrency && amountSecondCurrency) {
    amountToFormat = amountSecondCurrency;
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountToFormat);
};

export const convertToSubCurrency = (amount: number, factor: number = 100) => {
  return Math.round(amount * factor);
};

export const getInitialCurrency = async (): Promise<string> => {
  try {
    const response = await fetch("/api/localisation");
    const data = await response.json();

    if (data.country_code === null) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ===
        "Africa/Algiers"
        ? "DZD"
        : "EUR";
    } else if (data.country_code === "DZ") {
      return "DZD";
    } else return "EUR";
  } catch (e) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Algiers"
      ? "DZD"
      : "EUR";
  }
};
