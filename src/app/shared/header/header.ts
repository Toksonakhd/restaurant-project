
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from '../../features/auth/services/auth';
import { Users } from '../../features/profile/services/users';
import { Cart as CartService } from '../../features/cart/services/cart';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  private auth = inject(Auth);
  private users = inject(Users);
  private router = inject(Router);

  cartService = inject(CartService);

  isLoggedIn = signal(this.auth.isLoggedIn());
  showDropdown = signal(false);
  firstName = signal('');

  constructor() {
    this.loadUser();

    if (this.auth.isLoggedIn()) {
      this.cartService.getCart();
    }

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const loggedIn = this.auth.isLoggedIn();

        this.isLoggedIn.set(loggedIn);
        this.showDropdown.set(false);
        this.loadUser();

        if (loggedIn) {
          this.cartService.getCart();
        } else {
          this.cartService.items.set([]);
        }
      });
  }

  loadUser() {
    if (!this.auth.isLoggedIn()) {
      this.firstName.set('');
      return;
    }

    this.users.getMe().subscribe({
      next: (response) => {
        const result = response as {
          data?: { firstName: string };
          firstName?: string;
        };

        const name = result.data?.firstName ?? result.firstName ?? '';

        this.firstName.set(name);
      },
      error: () => {
        this.firstName.set('');
      }
    });
  }

  toggleDropdown() {
    this.showDropdown.update(value => !value);
  }

  logout() {
    this.auth.logout();
    this.cartService.items.set([]);
    this.isLoggedIn.set(false);
    this.firstName.set('');
    this.showDropdown.set(false);
    this.router.navigate(['/']);
  }
}
