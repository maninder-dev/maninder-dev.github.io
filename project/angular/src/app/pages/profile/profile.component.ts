import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { errorMessage, imageUrl, toFormData } from '../../core/api';
import { ImagePickerComponent } from '../../shared/image-picker.component';

@Component({
  selector: 'app-profile',
  imports: [FormsModule, ImagePickerComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  readonly imageUrl = imageUrl;
  private readonly user = this.auth.user()!; // route is protected by authGuard

  form = {
    name: this.user.name,
    email: this.user.email,
    password: '',
    rollNo: this.user.rollNo ?? '',
    course: this.user.course ?? '',
    phone: this.user.phone ?? '',
  };
  avatar: File | null = null;
  readonly message = signal<{ type: 'success' | 'error'; text: string } | null>(null);
  readonly busy = signal(false);

  submit() {
    this.busy.set(true);
    this.message.set(null);
    this.auth.updateProfile(toFormData(this.form, this.avatar, 'avatar')).subscribe({
      next: () => {
        this.form.password = '';
        this.message.set({ type: 'success', text: 'Profile updated' });
        this.busy.set(false);
      },
      error: (err) => {
        this.message.set({ type: 'error', text: errorMessage(err) });
        this.busy.set(false);
      },
    });
  }
}
