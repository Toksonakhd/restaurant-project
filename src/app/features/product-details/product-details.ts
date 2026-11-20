
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../menu/services/product';
import { ProductModel } from '../menu/models/product.model';
import { Cart } from '../cart/services/cart';
import { Auth } from '../auth/services/auth';

@Component({
  selector: 'app-product-details',
  imports: [],
  templateUrl: './product-details.html',
  styleUrl: './product-details.scss'
})
export class ProductDetails implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cartService = inject(Cart);
  private authService = inject(Auth);

  productService = inject(Product);

  product = signal<ProductModel | null>(null);
  loading = signal(false);
  error = signal('');
  quantity = signal(1);

  recommendations = signal<ProductModel[]>([]);
  recommendationsLoading = signal(false);
  recommendationsError = signal('');

  addingToCart = signal(false);
  toastMessage = signal('');
  toastTitle = signal('');
  toastVisible = signal(false);

  private toastTimeout?: ReturnType<typeof setTimeout>;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));

      if (!Number.isInteger(id) || id <= 0) {
        this.product.set(null);
        this.error.set('Invalid product ID');
        return;
      }

      this.quantity.set(1);
      this.loadProduct(id);
    });
  }

  loadProduct(id: number) {
    this.loading.set(true);
    this.error.set('');
    this.product.set(null);
    this.recommendations.set([]);
    this.recommendationsError.set('');

    this.productService.getProductById(id).subscribe({
      next: (response) => {
        const result = response as ProductModel | { data: ProductModel };
        const item = 'data' in result ? result.data : result;

        this.product.set(item);
        this.loading.set(false);

        const categoryId = item.categoryId ?? item.category?.id;

        if (categoryId != null) {
          this.loadRecommendations(categoryId);
        }
      },
      error: () => {
        this.error.set('Failed to load product');
        this.loading.set(false);
      }
    });
  }

  loadRecommendations(categoryId: number) {
    this.recommendationsLoading.set(true);
    this.recommendationsError.set('');

    this.productService.getRelatedProducts(categoryId).subscribe({
      next: (response) => {
        this.recommendations.set(response.data.products);
        this.recommendationsLoading.set(false);
      },
      error: () => {
        this.recommendationsError.set('Failed to load recommendations');
        this.recommendationsLoading.set(false);
      }
    });
  }

  addToCart(productId: number, quantity: number = 1) {
    if (!this.authService.isLoggedIn()) {
      this.showToast(
        'Authentication Required',
        'You need to be logged in to perform this action.'
      );

      this.router.navigate(['/login']);
      return;
    }

    if (this.addingToCart()) {
      return;
    }

    this.addingToCart.set(true);

    this.cartService.addToCart(productId, quantity).subscribe({
      next: (response) => {
        this.addingToCart.set(false);

        if (response.isSuccess) {
          this.cartService.getCart();

          this.showToast(
            'Added to cart',
            'Product has been added to your cart'
          );
        } else {
          this.showToast(
            'Error',
            response.error?.message || 'Failed to add product'
          );
        }
      },
      error: () => {
        this.addingToCart.set(false);
        this.showToast('Error', 'Failed to add product');
      }
    });
  }

  showToast(title: string, message: string) {
    clearTimeout(this.toastTimeout);

    this.toastTitle.set(title);
    this.toastMessage.set(message);
    this.toastVisible.set(true);

    this.toastTimeout = setTimeout(() => {
      this.toastVisible.set(false);
    }, 3500);
  }

  closeToast() {
    clearTimeout(this.toastTimeout);
    this.toastVisible.set(false);
  }

  openProduct(id: number) {
    this.router.navigate(['/product', id]);
    window.scrollTo(0, 0);
  }

  increaseQuantity() {
    this.quantity.update(value => value + 1);
  }

  decreaseQuantity() {
    this.quantity.update(value => Math.max(1, value - 1));
  }

  ngOnDestroy() {
    clearTimeout(this.toastTimeout);
  }
}
