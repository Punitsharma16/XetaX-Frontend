import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  template: `
    <div class="container p-4">
      <div class="card shadow-sm border-0" style="max-width: 560px;">
        <div class="card-body p-4">
          <div class="text-center mb-4">
            <div class="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white fw-bold mx-auto"
              style="width: 80px; height: 80px; font-size: 28px;">
              {{ initials }}
            </div>
            <h5 class="mt-3 mb-1">{{ name }}</h5>
            <p class="text-muted mb-0">{{ email }}</p>
          </div>
          <hr>
          <div class="d-flex justify-content-between py-2">
            <span class="text-muted">Phone</span>
            <span class="fw-medium">{{ phone || '—' }}</span>
          </div>
          <div class="d-flex justify-content-between py-2">
            <span class="text-muted">Company</span>
            <span class="fw-medium">{{ company || '—' }}</span>
          </div>
          <div class="d-flex justify-content-between py-2">
            <span class="text-muted">User ID</span>
            <span class="fw-medium text-truncate ms-3" style="max-width: 240px;">{{ id }}</span>
          </div>
          <hr>
          <button class="btn btn-outline-secondary w-100" (click)="goBack()">
            <i class="bi bi-arrow-left me-1"></i> Back
          </button>
        </div>
      </div>
    </div>
  `
})
export class Profile {
  name = '';
  email = '';
  phone = '';
  company = '';
  id = '';
  initials = '';

  constructor(private router: Router) {
    const raw = localStorage.getItem('user_info');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        this.name = user.name || user.email || '';
        this.email = user.email || '';
        this.phone = user.phone || '';
        this.company = user.company || '';
        this.id = user.id || '';
        const parts = this.name.split(' ').filter((s: string) => s.length > 0);
        if (parts.length >= 2) {
          this.initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else {
          this.initials = this.name.substring(0, 2).toUpperCase();
        }
      } catch {}
    }
  }

  goBack() {
    this.router.navigate(['/pages']);
  }
}
