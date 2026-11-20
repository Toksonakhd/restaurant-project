
export interface ProductModel {
  id: number;
  name: string;
  description: string;
  vegetarian: boolean;
  spiciness: number;
  rate: number;
  price: number;
  image: string;
  canDelete: boolean;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
  };
  ingredients?: string[];
  method?: string;
}

export interface ProductsResponse {
  data: {
    products: ProductModel[];
  };
}
