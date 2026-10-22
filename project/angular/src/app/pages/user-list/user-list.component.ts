import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';
import { errorMessage } from '../../core/api';
import { User } from '../../core/models';
import { AvatarComponent } from '../../shared/avatar.component';

@Component({
  selector: 'app-user-list',
  imports: [FormsModule, RouterLink, AvatarComponent],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly users = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly list = signal<User[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filter$ = new Subject<void>();
  q = '';
  role = '';

  ngOnInit() {
    this.filter$
      .pipe(
        startWith(undefined),
        debounceTime(300),
        switchMap(() =>
          this.users.list(this.q, this.role).pipe(
            catchError((err) => {
              this.error.set(errorMessage(err));
              return of([] as User[]);
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((users) => {
        this.list.set(users);
        this.loading.set(false);
      });
  }

  remove(user: User) {
    if (!confirm(`Delete ${user.name}?`)) return;
    this.users.remove(user._id).subscribe({
      next: () => this.list.update((l) => l.filter((u) => u._id !== user._id)),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
