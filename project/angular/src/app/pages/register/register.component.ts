import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage, toFormData } from '../../core/api';
import { ImagePickerComponent } from '../../shared/image-picker.component';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, ImagePickerComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  form = { name: '', email: '', password: '', rollNo: '', course: '', phone: '' };
  avatar: File | null = null;
  readonly error = signal('');
  readonly busy = signal(false);

  submit() {
    this.error.set('');
    this.busy.set(true);
    this.auth.register(toFormData(this.form, this.avatar, 'avatar')).subscribe({
      next: () => this.router.navigate(['/books']),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      },
    });
  }
}
