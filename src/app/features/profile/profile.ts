
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Users, UserProfile, EditProfileRequest } from './services/users';
import { Auth } from '../auth/services/auth';

type ProfileTab = 'personal' | 'password' | 'account';
type ToastType = 'success' | 'error';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit, OnDestroy {
  private users = inject(Users);
  private auth = inject(Auth);
  private router = inject(Router);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  activeTab = signal<ProfileTab>('personal');
  loading = signal(true);
  saving = signal(false);
  changingPassword = signal(false);
  deleting = signal(false);
  confirmDelete = signal(false);

  toast = signal<{
    title: string;
    message: string;
    type: ToastType;
  } | null>(null);

  profile = signal<UserProfile | null>(null);

  firstName = signal('');
  lastName = signal('');
  email = signal('');
  phoneNumber = signal('');
  picture = signal('');
  address = signal('');
  age = signal<number | null>(null);

  oldPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  showOldPassword = signal(false);
  showNewPassword = signal(false);

  passwordRules = computed(() => ({
    length: this.newPassword().length >= 8,
    letters: /[a-z]/.test(this.newPassword()) && /[A-Z]/.test(this.newPassword()),
    number: /\d/.test(this.newPassword())
  }));

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadProfile();
  }

  ngOnDestroy() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  showToast(title: string, message: string, type: ToastType = 'success') {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast.set({ title, message, type });

    this.toastTimer = setTimeout(() => {
      this.closeToast();
    }, 4000);
  }

  closeToast() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    this.toast.set(null);
  }

  setTab(tab: ProfileTab) {
    this.activeTab.set(tab);
    this.confirmDelete.set(false);
  }

  loadProfile() {
    this.loading.set(true);

    this.users.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.firstName.set(data.firstName ?? '');
        this.lastName.set(data.lastName ?? '');
        this.email.set(data.email ?? '');
        this.phoneNumber.set(data.phoneNumber ?? '');
        this.picture.set(data.picture ?? '');
        this.address.set(data.address ?? '');
        this.age.set(data.age ?? null);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.showToast('Error', this.getErrorMessage(error), 'error');
      }
    });
  }

  saveProfile() {
    if (this.saving() || this.loading() || !this.profile()) return;

    const firstName = this.firstName().trim();
    const lastName = this.lastName().trim();

    if (!firstName || !lastName) {
      this.showToast(
        'Error',
        'First name and last name are required.',
        'error'
      );
      return;
    }

    const ageValue = this.age();
    let age: number | null = null;

    if (
      ageValue !== null &&
      ageValue !== undefined &&
      String(ageValue).trim() !== ''
    ) {
      age = Number(ageValue);

      if (!Number.isInteger(age) || age < 1 || age > 120) {
        this.showToast('Error', 'Please enter a valid age.', 'error');
        return;
      }
    }

    const data: EditProfileRequest = {
      firstName,
      lastName,
      phoneNumber: this.phoneNumber().trim() || null,
      picture: this.picture().trim() || null,
      address: this.address().trim() || null,
      age
    };

    this.saving.set(true);

    this.users.editProfile(data).subscribe({
      next: (response) => {
        this.saving.set(false);

        if (response?.isSuccess === false) {
          this.showToast(
            'Error',
            response.error?.message ?? 'Failed to update profile.',
            'error'
          );
          return;
        }

        this.profile.update(current =>
          current ? { ...current, ...data } : current
        );

        this.showToast(
          'Profile updated',
          'Your profile has been updated successfully'
        );
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.showToast('Error', this.getErrorMessage(error), 'error');
      }
    });
  }

  updatePassword() {
    if (this.changingPassword()) return;

    if (!this.oldPassword() || !this.newPassword() || !this.confirmPassword()) {
      this.showToast('Error', 'Please fill in all password fields.', 'error');
      return;
    }

    const rules = this.passwordRules();

    if (!rules.length || !rules.letters || !rules.number) {
      this.showToast(
        'Error',
        'Your password does not meet the requirements.',
        'error'
      );
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.showToast('Error', 'New passwords do not match.', 'error');
      return;
    }

    this.changingPassword.set(true);

    this.users.changePassword({
      oldPassword: this.oldPassword(),
      newPassword: this.newPassword(),
      confirmPassword: this.confirmPassword()
    }).subscribe({
      next: (response) => {
        this.changingPassword.set(false);

        if (response?.isSuccess === false) {
          this.showToast(
            'Error',
            response.error?.message ?? 'Failed to change password.',
            'error'
          );
          return;
        }

        this.oldPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');

        this.showToast(
          'Password updated',
          'Your password has been changed successfully'
        );
      },
      error: (error: HttpErrorResponse) => {
        this.changingPassword.set(false);
        this.showToast('Error', this.getErrorMessage(error), 'error');
      }
    });
  }

  deleteAccount() {
    if (!this.confirmDelete() || this.deleting()) return;

    this.deleting.set(true);

    this.users.deleteAccount().subscribe({
      next: (response) => {
        this.deleting.set(false);

        if (response?.isSuccess === false) {
          this.showToast(
            'Error',
            response.error?.message ?? 'Failed to delete account.',
            'error'
          );
          return;
        }

        this.auth.logout();
        this.router.navigate(['/']);
      },
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);
        this.showToast('Error', this.getErrorMessage(error), 'error');
      }
    });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 401) {
      return 'Unauthorized. Please log in again.';
    }

    if (error.status === 400 && error.error?.errors) {
      const errors = Object.values(error.error.errors).flat();

      if (errors.length > 0) {
        return errors.map(message => String(message)).join(' ');
      }
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    return error.error?.error?.message
      ?? error.error?.message
      ?? 'Something went wrong. Please try again.';
  }
}
