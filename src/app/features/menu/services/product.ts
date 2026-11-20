
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProductModel, ProductsResponse } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class Product {
  private apiUrl = 'https://restaurantapi.stepacademy.ge/api/products';

  private headers = {
    'X-STEP-KEY': 'b0bda99a-7f6b-497b-b338-d09686541e99'
  };

  products = signal<ProductModel[]>([]);
  loading = signal(false);
  error = signal('');

  popularProducts = computed(() => this.products().slice(0, 6));

  constructor(private http: HttpClient) {}

  getProducts() {
    this.loading.set(true);
    this.error.set('');

    this.http.get<ProductsResponse>(this.apiUrl, {
      headers: this.headers
    }).subscribe({
      next: (response) => {
        this.products.set(response.data.products);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load products');
        this.loading.set(false);
      }
    });
  }

  getProductById(id: number) {
    return this.http.get<ProductModel>(`${this.apiUrl}/${id}`, {
      headers: this.headers
    });
  }

  getRelatedProducts(categoryId: number) {
    return this.http.get<ProductsResponse>(
      `${this.apiUrl}/filter/?take=4&page=1&categoryId=${categoryId}`,
      {
        headers: this.headers
      }
    );
  }
}
