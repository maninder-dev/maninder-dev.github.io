import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'books' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },

  // Books: everyone logged in can read, only admins can create / edit
  {
    path: 'books',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/book-list/book-list.component').then((m) => m.BookListComponent),
  },
  {
    path: 'books/new',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/book-form/book-form.component').then((m) => m.BookFormComponent),
  },
  {
    path: 'books/:id/edit',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/book-form/book-form.component').then((m) => m.BookFormComponent),
  },
  {
    path: 'books/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/book-detail/book-detail.component').then((m) => m.BookDetailComponent),
  },

  // Users: admin only
  {
    path: 'users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/user-list/user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: 'users/new',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/user-form/user-form.component').then((m) => m.UserFormComponent),
  },
  {
    path: 'users/:id/edit',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/user-form/user-form.component').then((m) => m.UserFormComponent),
  },

  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
  },
  { path: '**', redirectTo: 'books' },
];
