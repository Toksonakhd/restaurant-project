
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-verify-email',
  imports: [FormsModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmail {
  email = '';
  code = '';

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth
  ) {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  get validCode() {
    return /^\d{6}$/.test(this.code);
  }

  verify() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.email) {
      this.errorMessage.set('Email address is missing');
      return;
    }

    if (!this.validCode) {
      this.errorMessage.set('Please enter a valid 6-digit code');
      return;
    }

    this.loading.set(true);

    this.auth.verifyEmail(this.email, this.code).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('Email verified successfully!');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          error.error?.detail || 'Verification failed. Please try again.'
        );
      }
    });
  }

  resendCode() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.email) {
      this.errorMessage.set('Email address is missing');
      return;
    }

    this.loading.set(true);

    this.auth.resendCode(this.email).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('Verification code sent successfully!');
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          error.error?.detail || 'Failed to resend verification code.'
        );
      }
    });
  }
}
