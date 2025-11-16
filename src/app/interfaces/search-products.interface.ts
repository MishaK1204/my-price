import { Product } from './home-products.interface';

export interface SearchProductsResponse {
  products: Product[];
  totalCount: number;
  storeCounts: {
    [storeId: string]: number;
  };
  query: string;
}