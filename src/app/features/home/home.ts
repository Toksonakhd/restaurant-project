
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Product } from '../menu/services/product';
import { Cart as CartService } from '../cart/services/cart';
import { Auth } from '../auth/services/auth';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  productService = inject(Product);
  cartService = inject(CartService);

  private router = inject(Router);
  private auth = inject(Auth);

  showWelcome = signal(false);
  showAdded = signal(false);
  addingProductId = signal<number | null>(null);

  ngOnInit() {
    this.productService.getProducts();

    if (history.state.loginSuccess) {
      this.showWelcome.set(true);

      history.replaceState(
        { ...history.state, loginSuccess: false },
        ''
      );
    }
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

    if (this.addingProductId() !== null) {
      return;
    }

    this.addingProductId.set(id);
    this.showAdded.set(false);

    this.cartService.addToCart(id, 1).subscribe({
      next: (response) => {
        this.addingProductId.set(null);

        if (response.isSuccess === false) {
          return;
        }

        this.cartService.getCart();
        this.showAdded.set(true);
      },
      error: () => {
        this.addingProductId.set(null);
      }
    });
  }

  closeWelcome() {
    this.showWelcome.set(false);
  }

  closeAdded() {
    this.showAdded.set(false);
  }
}
