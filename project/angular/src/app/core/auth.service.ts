import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, tap } from 'rxjs';
import { API } from './api';
import { AuthResponse, User } from './models';

const TOKEN_KEY = 'token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API}/auth`;

  readonly user = signal<User | null>(null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  async restore(): Promise<void> {
    if (!this.token) return;
    try {
      this.user.set(await firstValueFrom(this.http.get<User>(`${this.base}/me`)));
    } catch {
      this.logout();
    }
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${this.base}/login`, { email, password }).pipe(tap((r) => this.save(r)));
  }

  register(data: FormData) {
    return this.http.post<AuthResponse>(`${this.base}/register`, data).pipe(tap((r) => this.save(r)));
  }

  updateProfile(data: FormData) {
    return this.http.put<User>(`${this.base}/me`, data).pipe(tap((u) => this.user.set(u)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.user.set(null);
  }

  private save({ token, user }: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, token);
    this.user.set(user);
  }
}
