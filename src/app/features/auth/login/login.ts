
import { Component, signal } from '@angular/core';
import {
  form,
  FormField,
  required,
  email
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  loginModel = signal({
    email: '',
    password: '',
    rememberMe: false
  });

  loginForm = form(this.loginModel, path => {
    required(path.email);
    email(path.email);
    required(path.password);
  });

  showPassword = signal(false);
  submitted = signal(false);
  loading = signal(false);
  errorMessage = signal('');

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword.update(value => !value);
  }

  closeToast() {
    this.errorMessage.set('');
  }

  login(event: Event) {
    event.preventDefault();

    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.loginForm().invalid() || this.loading()) {
      return;
    }

    const { email, password, rememberMe } = this.loginModel();
    const userEmail = email.trim();

    if (!userEmail) {
      return;
    }

    this.loading.set(true);

    this.auth.login(userEmail, password).subscribe({
      next: response => {
        this.loading.set(false);

        if (!response.data.isVerified) {
          this.router.navigate(['/verify-email'], {
            queryParams: { email: userEmail }
          });
          return;
        }

        this.auth.saveSession(response, rememberMe);

        this.router.navigate(['/'], {
          state: { loginSuccess: true }
        });
      },
      error: error => {
        this.loading.set(false);

        this.errorMessage.set(
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Password or email is incorrect! Try again.'
        );
      }
    });
  }
}
