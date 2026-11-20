
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword {
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);

  token = this.route.snapshot.queryParamMap.get('token') || '';
  newPassword = '';
  confirmPassword = '';

  showPassword = signal(false);
  submitted = signal(false);
  loading = signal(false);
  success = signal('');
  error = signal('');

  hasUppercase() {
    return /[A-Z]/.test(this.newPassword);
  }

  hasLowercase() {
    return /[a-z]/.test(this.newPassword);
  }

  hasNumber() {
    return /[0-9]/.test(this.newPassword);
  }

  hasSpecial() {
    return /[^A-Za-z0-9]/.test(this.newPassword);
  }

  resetPassword() {
    this.submitted.set(true);
    this.error.set('');
    this.success.set('');

    if (!this.token) {
      this.error.set('Invalid or missing reset token.');
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      return;
    }

    const validPassword =
      this.newPassword.length >= 8 &&
      this.hasUppercase() &&
      this.hasLowercase() &&
      this.hasNumber() &&
      this.hasSpecial();

    if (!validPassword) {
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      return;
    }

    this.loading.set(true);

    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Password successfully reset!');
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Reset failed. Your link may be invalid or expired.');
      }
    });
  }
}
