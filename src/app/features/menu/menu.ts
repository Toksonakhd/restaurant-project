
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, forkJoin, finalize, takeUntil } from 'rxjs';
import { ProductModel } from './models/product.model';
import { Cart } from '../cart/services/cart';
import { Auth } from '../auth/services/auth';

interface Category {
  id: number;
  name: string;
}

interface MenuResponse {
  data: {
    products: ProductModel[];
    hasMore: boolean;
  };
}

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class Menu implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(Auth);
  private cart = inject(Cart);
  private destroy$ = new Subject<void>();

  private apiUrl = 'https://restaurantapi.stepacademy.ge/api';
  private requestId = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;

  products = signal<ProductModel[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  error = signal('');
  actionError = signal('');
  addingProductId = signal<number | null>(null);
  addedMessage = signal(false);

  search = signal('');
  selectedCategories = signal<number[]>([]);
  vegetarianOnly = signal(false);
  spiciness = signal(0);
  rating = signal(0);
  minPrice = signal(0);
  maxPrice = signal(500);

  page = signal(1);
  take = 10;
  hasMore = signal(false);
  totalCount = signal<number | null>(null);
  mobileFiltersOpen = signal(false);

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories() {
    this.http.get<unknown>(`${this.apiUrl}/categories`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const result = response as
            | Category[]
            | { data?: Category[] | { categories?: Category[] } };

          let categories: Category[] = [];

          if (Array.isArray(result)) {
            categories = result;
          } else if (Array.isArray(result.data)) {
            categories = result.data;
          } else if (
            result.data &&
            'categories' in result.data &&
            Array.isArray(result.data.categories)
          ) {
            categories = result.data.categories;
          }

          this.categories.set(categories);
        },
        error: () => this.categories.set([])
      });
  }

  private buildParams(page: number, take: number) {
    let params = new HttpParams()
      .set('Take', take)
      .set('Page', page);

    if (this.search().trim()) {
      params = params.set('Query', this.search().trim());
    }

    if (this.vegetarianOnly()) {
      params = params.set('Vegetarian', true);
    }

    if (this.spiciness() > 0) {
      params = params.set('Spiciness', this.spiciness());
    }

    if (this.rating() > 0) {
      params = params.set('Rate', this.rating());
    }

    if (this.minPrice() > 0) {
      params = params.set('MinPrice', this.minPrice());
    }

    if (this.maxPrice() < 500) {
      params = params.set('MaxPrice', this.maxPrice());
    }

    return params;
  }

  loadProducts() {
    const currentRequest = ++this.requestId;
    const selected = this.selectedCategories();

    this.loading.set(true);
    this.error.set('');

    if (selected.length <= 1) {
      let params = this.buildParams(this.page(), this.take);

      if (selected.length === 1) {
        params = params.set('CategoryId', selected[0]);
      }

      this.http.get<MenuResponse>(
        `${this.apiUrl}/products/filter`,
        { params }
      ).pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (currentRequest === this.requestId) {
            this.loading.set(false);
          }
        })
      ).subscribe({
        next: response => {
          if (currentRequest !== this.requestId) return;

          this.products.set(response.data.products ?? []);
          this.hasMore.set(response.data.hasMore);
          this.totalCount.set(null);
        },
        error: () => {
          if (currentRequest !== this.requestId) return;

          this.products.set([]);
          this.hasMore.set(false);
          this.totalCount.set(null);
          this.error.set('Failed to load products');
        }
      });

      return;
    }

    this.loadMultipleCategories(currentRequest, selected);
  }

  private loadMultipleCategories(
    currentRequest: number,
    categoryIds: number[]
  ) {
    const requestedCount = this.page() * this.take + 1;

    const requests = categoryIds.map(categoryId => {
      const params = this.buildParams(1, requestedCount)
        .set('CategoryId', categoryId);

      return this.http.get<MenuResponse>(
        `${this.apiUrl}/products/filter`,
        { params }
      );
    });

    forkJoin(requests).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        if (currentRequest === this.requestId) {
          this.loading.set(false);
        }
      })
    ).subscribe({
      next: responses => {
        if (currentRequest !== this.requestId) return;

        const uniqueProducts = new Map<number, ProductModel>();

        for (const response of responses) {
          for (const product of response.data.products ?? []) {
            uniqueProducts.set(product.id, product);
          }
        }

        const allProducts = [...uniqueProducts.values()];
        const start = (this.page() - 1) * this.take;
        const end = start + this.take;

        this.products.set(allProducts.slice(start, end));

        this.hasMore.set(
          allProducts.length > end ||
          responses.some(response => response.data.hasMore)
        );

        this.totalCount.set(null);
      },
      error: () => {
        if (currentRequest !== this.requestId) return;

        this.products.set([]);
        this.hasMore.set(false);
        this.totalCount.set(null);
        this.error.set('Failed to filter products');
      }
    });
  }

  showingCount() {
    return this.totalCount() ?? this.products().length;
  }

  onSearch(value: string) {
    this.search.set(value);
    clearTimeout(this.searchTimer);

    this.searchTimer = setTimeout(() => {
      this.applyFilters();
    }, 400);
  }

  toggleCategory(id: number) {
    this.selectedCategories.update(current =>
      current.includes(id)
        ? current.filter(value => value !== id)
        : [...current, id]
    );

    this.applyFilters();
  }

  isCategorySelected(id: number) {
    return this.selectedCategories().includes(id);
  }

  toggleVegetarian() {
    this.vegetarianOnly.update(value => !value);
    this.applyFilters();
  }

  setSpiciness(value: number) {
    this.spiciness.set(value);
    this.applyFilters();
  }

  setRating(value: number) {
    this.rating.set(value);
    this.applyFilters();
  }

  setMinPrice(value: number) {
    this.minPrice.set(Math.min(value, this.maxPrice()));
    this.applyFilters();
  }

  setMaxPrice(value: number) {
    this.maxPrice.set(Math.max(value, this.minPrice()));
    this.applyFilters();
  }

  applyFilters() {
    this.page.set(1);
    this.loadProducts();
  }

  resetFilters() {
    clearTimeout(this.searchTimer);

    this.search.set('');
    this.selectedCategories.set([]);
    this.vegetarianOnly.set(false);
    this.spiciness.set(0);
    this.rating.set(0);
    this.minPrice.set(0);
    this.maxPrice.set(500);
    this.page.set(1);

    this.loadProducts();
  }

  nextPage() {
    if (this.loading() || !this.hasMore()) return;

    this.page.update(value => value + 1);
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  previousPage() {
    if (this.loading() || this.page() <= 1) return;

    this.page.update(value => value - 1);
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openProduct(id: number) {
    this.router.navigate(['/product', id]);
  }

  addToCart(id: number, event: Event) {
    event.stopPropagation();

    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.addingProductId() !== null) return;

    this.addingProductId.set(id);
    this.addedMessage.set(false);
    this.actionError.set('');

    this.cart.addToCart(id, 1).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.addingProductId.set(null))
    ).subscribe({
      next: response => {
        if (response.isSuccess === false) {
          this.actionError.set(
            response.error?.message ?? 'Failed to add product'
          );
          return;
        }

        this.cart.getCart();
        this.addedMessage.set(true);
      },
      error: () => {
        this.actionError.set('Failed to add product');
      }
    });
  }

  closeAddedMessage() {
    this.addedMessage.set(false);
  }

  toggleMobileFilters() {
    this.mobileFiltersOpen.update(value => !value);
  }

  ngOnDestroy() {
    clearTimeout(this.searchTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
