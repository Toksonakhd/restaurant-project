
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    isVerified: boolean;
  };
}

export interface RefreshResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    isVerified: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private apiUrl = 'https://restaurantapi.stepacademy.ge/api/auth';

  constructor(private http: HttpClient) {}

  register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  verifyEmail(email: string, code: string) {
    return this.http.put(
      `${this.apiUrl}/verify-email`,
      { email, code },
      { responseType: 'text' }
    );
  }

  resendCode(email: string) {
    return this.http.post(
      `${this.apiUrl}/resend-email-verification/${encodeURIComponent(email)}`,
      {},
      { responseType: 'text' }
    );
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { email, password }
    );
  }

  forgotPassword(email: string) {
    return this.http.post(
      `${this.apiUrl}/forgot-password/${encodeURIComponent(email)}`,
      {},
      { responseType: 'text' }
    );
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.put(
      `${this.apiUrl}/reset-password`,
      { token, newPassword },
      { responseType: 'text' }
    );
  }

  refreshAccessToken() {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    return this.http.post<RefreshResponse>(
      `${this.apiUrl}/refresh-access-token/${encodeURIComponent(refreshToken)}`,
      {}
    );
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken') ||
      sessionStorage.getItem('refreshToken');
  }

  updateTokens(response: RefreshResponse) {
    const storage = localStorage.getItem('refreshToken')
      ? localStorage
      : sessionStorage;

    storage.setItem('accessToken', response.data.accessToken);
    storage.setItem('refreshToken', response.data.refreshToken);
  }

  saveSession(response: LoginResponse, rememberMe: boolean) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');

    const storage = rememberMe ? localStorage : sessionStorage;

    storage.setItem('accessToken', response.data.accessToken);
    storage.setItem('refreshToken', response.data.refreshToken);
  }

  getToken() {
    return localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken');
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  }
}
