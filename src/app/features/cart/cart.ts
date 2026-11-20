
import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Cart as CartService, CartItem } from './services/cart';
import { Auth } from '../auth/services/auth';

@Component({
  selector: 'app-cart',
  imports: [RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class Cart implements OnInit {
  private router = inject(Router);
  private auth = inject(Auth);

  cartService = inject(CartService);

  successMessage = signal(false);
  actionError = signal('');

  subtotal = computed(() => this.cartService.totalPrice());
  tax = computed(() => this.subtotal() * 0.1);
  total = computed(() => this.subtotal() + this.tax());

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.cartService.getCart();
  }

  increaseQuantity(item: CartItem) {
    this.changeQuantity(item, item.quantity + 1);
  }

  decreaseQuantity(item: CartItem) {
    if (item.quantity <= 1) {
      return;
    }

    this.changeQuantity(item, item.quantity - 1);
  }

  changeQuantity(item: CartItem, quantity: number) {
    if (this.cartService.updating()) {
      return;
    }

    const previousItems = this.cartService.items();

    this.cartService.updating.set(true);
    this.actionError.set('');

    this.cartService.items.update(items =>
      items.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity }
          : cartItem
      )
    );

    this.cartService.editQuantity(item.id, quantity).subscribe({
      next: (response) => {
        this.cartService.updating.set(false);

        if (response.isSuccess === false) {
          this.cartService.items.set(previousItems);
          this.actionError.set(
            response.error?.message || 'Failed to update quantity'
          );
        }
      },
      error: () => {
        this.cartService.items.set(previousItems);
        this.cartService.updating.set(false);
        this.actionError.set('Failed to update quantity');
      }
    });
  }

  removeItem(item: CartItem) {
    if (this.cartService.updating()) {
      return;
    }

    this.cartService.updating.set(true);
    this.actionError.set('');

    this.cartService.removeFromCart(item.id).subscribe({
      next: (response) => {
        this.cartService.updating.set(false);

        if (response.isSuccess === false) {
          this.actionError.set(
            response.error?.message || 'Failed to remove product'
          );
          return;
        }

        this.cartService.items.update(items =>
          items.filter(cartItem => cartItem.id !== item.id)
        );
      },
      error: () => {
        this.cartService.updating.set(false);
        this.actionError.set('Failed to remove product');
      }
    });
  }

  checkout() {
    if (
      this.cartService.updating() ||
      this.cartService.items().length === 0
    ) {
      return;
    }

    this.cartService.updating.set(true);
    this.actionError.set('');

    this.cartService.checkout().subscribe({
      next: (response) => {
        this.cartService.updating.set(false);

        if (response.isSuccess === false) {
          this.actionError.set(
            response.error?.message || 'Checkout failed'
          );
          return;
        }

        this.cartService.items.set([]);
        this.successMessage.set(true);
      },
      error: () => {
        this.cartService.updating.set(false);
        this.actionError.set('Checkout failed. Please try again.');
      }
    });
  }

  closeSuccessMessage() {
    this.successMessage.set(false);
  }
}
