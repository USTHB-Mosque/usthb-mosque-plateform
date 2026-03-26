import { Category } from "@/payload-types";

export interface ProductPreview {
  id: number;
  category: {
    label: string;
  };
  title: string;
  price: number;
  priceSecondCurrency: number;
  discount?: number;
  quantityAvailableInStock?: number;
  imagePreview?: {
    url: string;
    filename: string;
    alt: string;
  };
}

export interface GraphqlQueryResponse<T> {
  docs: T[];
  totalDocs: number;
  totalPages: number;
  page: number;
  nextPage: number;
  prevPage: number;
}

export interface BaseParams {
  category: string;
  page: number;
  limit: number;
  sort: string;
  search: string;
}

export enum Sorting {
  LOWEST_PRICE = "lowest-price",
  HIGHEST_PRICE = "highest-price",
  NEWEST = "newest",
  OLDEST = "oldest",
  BEST_SELLER = "best-seller",
}

export type Categories = Record<string, Category[]>;
export interface CreateOrderProduct {
  id: number;
  quantity: number;
  size: string;
  playerNumber: string;
  playerName: string;
  image: string;
  audience?: "men" | "women" | "kids";
}
export interface CreateOrder {
  product: CreateOrderProduct[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hasPaid: boolean;
}
