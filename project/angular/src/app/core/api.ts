import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const API = `${environment.apiUrl}/api`;

// Stored image paths look like "uploads/<file>"
export const imageUrl = (path?: string | null) => (path ? `${environment.apiUrl}/${path}` : '');

// Build multipart data for create/update requests that may include an image
export function toFormData(values: object, file: File | null, fileField: string): FormData {
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });
  if (file) fd.append(fileField, file);
  return fd;
}

export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the API server. Is it running?';
    return err.error?.message || err.message;
  }
  return String(err);
}
