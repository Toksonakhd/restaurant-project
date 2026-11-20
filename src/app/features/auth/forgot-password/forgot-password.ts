
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
  email = '';
  loading = signal(false);
  submitted = signal(false);
  success = signal('');
  error = signal('');

  constructor(private auth: Auth) {}

  sendResetLink() {
    this.submitted.set(true);
    this.success.set('');
    this.error.set('');

    if (!this.email.trim()) {
      return;
    }

    const email = this.email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return;
    }

    this.loading.set(true);

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Password reset link has been sent to your email.');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to send reset link. Please try again.');
      }
    });
  }
}
