export interface Product {
  name: string;
  price: number;
  salePrice: number;
  url: string;
  imageUrl: string;
  source: number;
  productKey: string;
  relevanceScore: number;
  store: {
    color: string;
    imageUrl: string;
    link: string;
    title: string;
  }
}

export interface StoreData {
  store: number;
  products: Product[];
  title: string;
  color: string;
  imageUrl: string;
  link: string;
  source: number;
}

export interface DoneData {
  // Empty object for done event
}

export interface StoreEvent {
  event: 'store';
  data: StoreData;
}

export interface DoneEvent {
  event: 'done';
  data: DoneData;
}

export type StreamEvent = StoreEvent | DoneEvent;
