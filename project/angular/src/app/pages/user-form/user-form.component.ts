import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';
import { errorMessage, imageUrl, toFormData } from '../../core/api';
import { Role } from '../../core/models';
import { ImagePickerComponent } from '../../shared/image-picker.component';

@Component({
  selector: 'app-user-form',
  imports: [FormsModule, RouterLink, ImagePickerComponent],
  templateUrl: './user-form.component.html',
})
export class UserFormComponent implements OnInit {
  readonly id = input<string>(); // present on /users/:id/edit
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly router = inject(Router);

  form = { name: '', email: '', password: '', role: 'student' as Role, rollNo: '', course: '', phone: '' };
  avatar: File | null = null;
  readonly currentAvatar = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly isEdit = computed(() => !!this.id());
  readonly isSelf = computed(() => !!this.id() && this.id() === this.auth.user()?._id);

  ngOnInit() {
    const id = this.id();
    if (!id) return;
    this.users.get(id).subscribe({
      next: (u) => {
        this.form = {
          name: u.name,
          email: u.email,
          password: '',
          role: u.role,
          rollNo: u.rollNo ?? '',
          course: u.course ?? '',
          phone: u.phone ?? '',
        };
        this.currentAvatar.set(imageUrl(u.avatar));
      },
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  submit() {
    this.error.set('');
    this.busy.set(true);
    const data = toFormData(this.form, this.avatar, 'avatar');
    const id = this.id();
    const request = id ? this.users.update(id, data) : this.users.create(data);
    request.subscribe({
      next: (saved) => {
        if (this.isSelf()) this.auth.user.set(saved);
        this.router.navigate(['/users']);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.busy.set(false);
      },
    });
  }
}
