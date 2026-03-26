import { getInitialCurrency } from "@/utils/currency";
import { create } from "zustand";

interface CurrencyStore {
  currency: string;
  setCurrency: (currency: string) => void;
  initialize: () => Promise<void>;
}

export const useCurrency = create<CurrencyStore>((set) => ({
  currency: "EUR",
  setCurrency: (currency: string) => set({ currency }),

  initialize: async () => {
    try {
      const detectedCurrency = await getInitialCurrency();
      set({ currency: detectedCurrency });
    } catch (error) {
      set({ currency: "EUR" });
    }
  },
}));
