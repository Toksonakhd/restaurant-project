
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface UserProfile {
  id: number;
  createdAt?: string;
  updatedAt?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  picture: string | null;
  address: string | null;
  age: number | null;
}

export interface ProfileResponse {
  data: UserProfile;
}

export interface EditProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  picture: string | null;
  address: string | null;
  age: number | null;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserActionResponse {
  isSuccess: boolean;
  error?: {
    message: string;
    statusCode: number;
  } | null;
}

@Injectable({
  providedIn: 'root'
})
export class Users {
  private http = inject(HttpClient);
  private apiUrl = 'https://restaurantapi.stepacademy.ge/api/users';

  getMe() {
    return this.http.get<User>(`${this.apiUrl}/me`);
  }

  getProfile() {
    return this.http
      .get<ProfileResponse>(`${this.apiUrl}/profile`)
      .pipe(map(response => response.data));
  }

  editProfile(data: EditProfileRequest) {
    return this.http.put<UserActionResponse>(
      `${this.apiUrl}/edit`,
      data
    );
  }

  changePassword(data: ChangePasswordRequest) {
    return this.http.put<UserActionResponse>(
      `${this.apiUrl}/change-password`,
      data
    );
  }

  deleteAccount() {
    return this.http.delete<UserActionResponse>(
      `${this.apiUrl}/delete`
    );
  }
}
