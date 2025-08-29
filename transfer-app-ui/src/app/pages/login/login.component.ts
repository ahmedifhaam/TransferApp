import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService, Doctor } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  adminUsername = '';
  adminPassword = '';
  adminError = '';

  meritRank?: number;
  doctor?: Doctor;
  doctorError = '';

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  loginAdmin(): void {
    this.adminError = '';
    this.auth.loginAdmin(this.adminUsername, this.adminPassword).subscribe({
      next: () => this.router.navigateByUrl('/import'),
      error: () => this.adminError = 'Invalid admin credentials'
    });
  }

  lookupDoctor(): void {
    this.doctorError = '';
    if (!this.meritRank || this.meritRank <= 0) {
      this.doctorError = 'Enter a valid Merit Rank';
      return;
    }

    this.api.getDoctorByMeritRank(this.meritRank).subscribe({
      next: (doc) => this.doctor = doc,
      error: () => this.doctorError = 'Doctor not found'
    });
  }

  confirmDoctor(): void {
    if (!this.doctor || !this.meritRank) return;
    this.auth.loginDoctor(this.meritRank).subscribe({
      next: () => this.router.navigateByUrl('/preferences'),
      error: () => this.doctorError = 'Failed to save login state'
    });
  }
}
