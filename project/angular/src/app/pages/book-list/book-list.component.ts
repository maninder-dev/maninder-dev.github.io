import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { BookService } from '../../core/book.service';
import { errorMessage, imageUrl } from '../../core/api';
import { Book } from '../../core/models';

@Component({
  selector: 'app-book-list',
  imports: [FormsModule, RouterLink],
  templateUrl: './book-list.component.html',
})
export class BookListComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly books = inject(BookService);
  private readonly destroyRef = inject(DestroyRef);
  readonly imageUrl = imageUrl;

  readonly list = signal<Book[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search$ = new Subject<string>();
  q = '';

  ngOnInit() {
    this.search$
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) =>
          this.books.list(q).pipe(
            catchError((err) => {
              this.error.set(errorMessage(err));
              return of([] as Book[]);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((books) => {
        this.list.set(books);
        this.loading.set(false);
      });
  }

  remove(book: Book) {
    if (!confirm(`Delete "${book.title}"?`)) return;
    this.books.remove(book._id).subscribe({
      next: () => this.list.update((l) => l.filter((b) => b._id !== book._id)),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
