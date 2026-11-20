
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../auth/services/auth';
import { ProductModel } from '../../menu/models/product.model';

export interface CartItem {
  id: number;
  quantity: number;
  product: ProductModel;
}

export interface CartResponse {
  data: {
    totalItems: number;
    totalPrice: number;
    items: CartItem[];
  };
}

export interface CartActionResponse {
  isSuccess: boolean;
  error?: {
    message: string;
    statusCode: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class Cart {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  private apiUrl = 'https://restaurantapi.stepacademy.ge/api/cart';

  items = signal<CartItem[]>([]);
  loading = signal(false);
  error = signal('');
  updating = signal(false);

  totalItems = computed(() => this.items().length);

  totalPrice = computed(() =>
    this.items().reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    )
  );

  private getHeaders() {
    return new HttpHeaders({
      'X-STEP-KEY': 'b0bda99a-7f6b-497b-b338-d09686541e99',
      Authorization: `Bearer ${this.auth.getToken()}`
    });
  }

  getCart() {
    if (!this.auth.isLoggedIn()) {
      this.items.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.http.get<CartResponse>(this.apiUrl, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.items.set(response.data.items ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load cart');
        this.loading.set(false);
      }
    });
  }

  addToCart(productId: number, quantity: number = 1) {
    return this.http.post<CartActionResponse>(
      `${this.apiUrl}/add-to-cart`,
      { productId, quantity },
      { headers: this.getHeaders() }
    );
  }

  editQuantity(itemId: number, quantity: number) {
    return this.http.put<CartActionResponse>(
      `${this.apiUrl}/edit-quantity`,
      { itemId, quantity },
      { headers: this.getHeaders() }
    );
  }

  removeFromCart(itemId: number) {
    return this.http.delete<CartActionResponse>(
      `${this.apiUrl}/remove-from-cart/${itemId}`,
      { headers: this.getHeaders() }
    );
  }

  checkout() {
    return this.http.post<CartActionResponse>(
      `${this.apiUrl}/checkout`,
      {},
      { headers: this.getHeaders() }
    );
  }
}
