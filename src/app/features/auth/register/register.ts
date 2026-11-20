
import { Component, signal } from '@angular/core';
import {
  form,
  FormField,
  required,
  email,
  minLength,
  pattern
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  registerModel = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  registerForm = form(this.registerModel, path => {
    required(path.firstName);
    required(path.lastName);

    required(path.email);
    email(path.email);

    required(path.password);
    minLength(path.password, 8);
    pattern(
      path.password,
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
    );
  });

  showPassword = signal(false);
  submitted = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  loading = signal(false);

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword.update(value => !value);
  }

  get validPassword() {
    const password = this.registerModel().password;

    return password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
  }

  register(event: Event) {
    event.preventDefault();

    this.submitted.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.registerForm().invalid() || this.loading()) {
      return;
    }

    const { firstName, lastName, email, password } =
      this.registerModel();

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !this.validPassword
    ) {
      return;
    }

    this.loading.set(true);

    const userEmail = email.trim();

    this.auth.register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: userEmail,
      password
    }).subscribe({
      next: () => {
        this.loading.set(false);

        this.router.navigate(['/verify-email'], {
          queryParams: { email: userEmail }
        });
      },
      error: error => {
        this.loading.set(false);

        this.errorMessage.set(
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Registration failed. Please try again.'
        );

        this.loading.set(false);
      }
    });
  }
}
