
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

import { Header } from './shared/header/header';
import { Footer } from './shared/footer/footer';
import { Chatbot } from './features/chatbot/chatbot';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Chatbot],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private router = inject(Router);

  currentUrl = signal(this.router.url);

  hideLayout = computed(() =>
    [
      '/login',
      '/register',
      '/verify-email',
      '/forgot-password',
      '/reset-password'
    ].includes(
      this.currentUrl().split('?')[0].split('#')[0]
    )
  );

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }
}
