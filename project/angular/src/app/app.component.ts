import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { AvatarComponent } from './shared/avatar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvatarComponent],
  template: `
    <nav class="navbar">
      <a routerLink="/books" class="brand">📚 Student Library</a>
      @if (auth.user(); as user) {
        <a routerLink="/books" routerLinkActive="active">Books</a>
        @if (auth.isAdmin()) {
          <a routerLink="/users" routerLinkActive="active">Users</a>
        }
        <span class="spacer"></span>
        <a routerLink="/profile" class="who">
          <app-avatar [user]="user" />
          {{ user.name }} <span class="badge {{ user.role }}">{{ user.role }}</span>
        </a>
        <button class="btn-sm" (click)="logout()">Logout</button>
      } @else {
        <span class="spacer"></span>
        <a routerLink="/login" routerLinkActive="active">Login</a>
        <a routerLink="/register" routerLinkActive="active">Register</a>
      }
    </nav>
    <main class="container">
      <router-outlet />
    </main>
  `,
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
