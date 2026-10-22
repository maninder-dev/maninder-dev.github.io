import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BookService } from '../../core/book.service';
import { errorMessage, imageUrl } from '../../core/api';
import { Book } from '../../core/models';

@Component({
  selector: 'app-book-detail',
  imports: [RouterLink],
  templateUrl: './book-detail.component.html',
})
export class BookDetailComponent implements OnInit {
  readonly id = input.required<string>(); // bound from the :id route param
  readonly auth = inject(AuthService);
  private readonly books = inject(BookService);
  private readonly router = inject(Router);
  readonly imageUrl = imageUrl;

  readonly book = signal<Book | null>(null);
  readonly error = signal('');

  ngOnInit() {
    this.books.get(this.id()).subscribe({
      next: (b) => this.book.set(b),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  remove(book: Book) {
    if (!confirm(`Delete "${book.title}"?`)) return;
    this.books.remove(book._id).subscribe({
      next: () => this.router.navigate(['/books']),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
