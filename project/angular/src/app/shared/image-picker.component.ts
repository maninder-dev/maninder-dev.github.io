import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';

// File input with a live preview; `current` is the already-saved image URL (if any)
@Component({
  selector: 'app-image-picker',
  template: `
    <div class="field">
      <label>{{ label() }}</label>
      <div class="image-picker">
        @if (src()) {
          <img [src]="src()" alt="preview" />
        }
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" (change)="onChange($event)" />
      </div>
      <small class="muted">JPG, PNG, GIF or WEBP, max 2 MB</small>
    </div>
  `,
})
export class ImagePickerComponent implements OnDestroy {
  readonly label = input('Image');
  readonly current = input('');
  readonly fileChange = output<File | null>();

  private readonly preview = signal('');
  readonly src = computed(() => this.preview() || this.current());

  onChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.revoke();
    this.preview.set(file ? URL.createObjectURL(file) : '');
    this.fileChange.emit(file);
  }

  ngOnDestroy() {
    this.revoke();
  }

  private revoke() {
    if (this.preview()) URL.revokeObjectURL(this.preview());
  }
}
