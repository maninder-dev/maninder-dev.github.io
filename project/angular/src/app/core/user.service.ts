import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API } from './api';
import { User } from './models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API}/users`;

  list(q = '', role = '') {
    const params: Record<string, string> = {};
    if (q) params['q'] = q;
    if (role) params['role'] = role;
    return this.http.get<User[]>(this.base, { params });
  }

  get(id: string) {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  create(data: FormData) {
    return this.http.post<User>(this.base, data);
  }

  update(id: string, data: FormData) {
    return this.http.put<User>(`${this.base}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
