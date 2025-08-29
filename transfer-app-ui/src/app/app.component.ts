import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'transfer-app-ui';
  constructor(public authService: AuthService, private router: Router) {}
  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
