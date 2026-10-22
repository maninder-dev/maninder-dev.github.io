import { Component, computed, input } from '@angular/core';
import { imageUrl } from '../core/api';
import { User } from '../core/models';

@Component({
  selector: 'app-avatar',
  template: `
    @if (src()) {
      <img [class]="cls()" [src]="src()" [alt]="user()?.name" />
    } @else {
      <span [class]="cls() + ' placeholder'">{{ initial() }}</span>
    }
  `,
})
export class AvatarComponent {
  readonly user = input<User | null>(null);
  readonly large = input(false);

  readonly src = computed(() => imageUrl(this.user()?.avatar));
  readonly initial = computed(() => this.user()?.name?.[0]?.toUpperCase() || '?');
  readonly cls = computed(() => (this.large() ? 'avatar avatar-lg' : 'avatar'));
}
