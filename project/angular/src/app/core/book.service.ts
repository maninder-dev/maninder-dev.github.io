import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API } from './api';
import { Book } from './models';

@Injectable({ providedIn: 'root' })
export class BookService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API}/books`;

  list(q = '') {
    return this.http.get<Book[]>(this.base, { params: q ? { q } : {} });
  }

  get(id: string) {
    return this.http.get<Book>(`${this.base}/${id}`);
  }

  create(data: FormData) {
    return this.http.post<Book>(this.base, data);
  }

  update(id: string, data: FormData) {
    return this.http.put<Book>(`${this.base}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
