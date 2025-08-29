import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_CONFIG, buildApiUrl } from '../config/api.config';

export interface AuthState {
  role: 'admin' | 'doctor';
  name?: string;
  meritRank?: number;
  id?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = buildApiUrl(API_CONFIG.AUTH.ADMIN_LOGIN).replace('/admin/login', '');
  private storageKey = 'transferApp.auth';

  constructor(private http: HttpClient) {}

  get state(): AuthState | null {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : null;
  }

  isAdmin(): boolean { return this.state?.role === 'admin'; }
  isDoctor(): boolean { return this.state?.role === 'doctor'; }
  getCurrentDoctorId(): number | null { return this.state?.id || null; }

  loginAdmin(username: string, password: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/login`, { username, password }).pipe(
      tap((resp: any) => {
        localStorage.setItem(this.storageKey, JSON.stringify({ role: 'admin', name: resp.name } as AuthState));
      })
    );
  }

  loginDoctor(meritRank: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/doctor/login/rank/${meritRank}`, {}).pipe(
      tap((resp: any) => {
        localStorage.setItem(this.storageKey, JSON.stringify({ 
          role: 'doctor', 
          id: resp.id,
          meritRank: resp.meritRank, 
          name: resp.fullName 
        } as AuthState));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
  }
}
