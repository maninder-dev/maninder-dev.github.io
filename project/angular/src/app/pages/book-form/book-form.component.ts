import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BookService } from '../../core/book.service';
import { errorMessage, imageUrl, toFormData } from '../../core/api';
import { ImagePickerComponent } from '../../shared/image-picker.component';

@Component({
  selector: 'app-book-form',
  imports: [FormsModule, RouterLink, ImagePickerComponent],
  templateUrl: './book-form.component.html',
})
export class BookFormComponent implements OnInit {
  readonly id = input<string>(); // present on /books/:id/edit
  private readonly books = inject(BookService);
  private readonly router = inject(Router);

  form = {
    title: '',
    author: '',
    isbn: '',
    category: 'General',
    publishedYear: '' as number | string,
    copies: 1 as number | string,
    description: '',
  };
  cover: File | null = null;
  readonly currentCover = signal('');
  readonly error = signal('');
  readonly busy = signal(false);

  get isEdit() {
    return !!this.id();
  }

  ngOnInit() {
    const id = this.id();
    if (!id) return;
    this.books.get(id).subscribe({
      next: (b) => {
        this.form = {
          title: b.title,
          author: b.author,
          isbn: b.isbn ?? '',
          category: b.category ?? '',
          publishedYear: b.publishedYear ?? '',
          copies: b.copies,
          description: b.description ?? '',
        };
        this.currentCover.set(imageUrl(b.coverImage));
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  submit() {
    this.error.set('');
    this.busy.set(true);
    const data = toFormData(this.form, this.cover, 'coverImage');
    const id = this.id();
    const request = id ? this.books.update(id, data) : this.books.create(data);
    request.subscribe({
      next: () => this.router.navigate(['/books']),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      },
    });
  }
}
