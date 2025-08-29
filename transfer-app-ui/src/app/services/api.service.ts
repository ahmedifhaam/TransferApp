import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG, buildApiUrl } from '../config/api.config';

export interface Vacancy {
  id: number;
  designation: string;
  count: number;
  isDifficultStation: boolean;
  institution: string;
  district: string;
}

export interface VacancyFilters {
  search?: string;
  district?: string;
  institution?: string;
  designation?: string;
  isDifficultStation?: boolean;
  minCount?: number;
  maxCount?: number;
}

export interface FilterOptions {
  districts: string[];
  institutions: string[];
  designations: string[];
  countRange: {
    minCount: number;
    maxCount: number;
  };
}

export interface PreferenceItem {
  vacancyId: number;
  orderIndex: number;
}

export interface Doctor {
  id: number;
  fullName: string;
  meritRank: number;
  partnerDoctorId?: number;
}

export interface CoupleApplication {
  id: number;
  doctor1: {
    id: number;
    meritRank: number;
    fullName: string;
  };
  doctor2: {
    id: number;
    meritRank: number;
    fullName: string;
  };
  effectiveMeritRank: number;
  createdAt: string;
}

export interface CoupleInfo {
  isInCouple: boolean;
  effectiveMeritRank: number;
  coupleApplicationId?: number;
  partner?: {
    id: number;
    meritRank: number;
    fullName: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = API_CONFIG.BASE_URL;

  constructor(private http: HttpClient) { }

  getVacancies(filters?: VacancyFilters): Observable<Vacancy[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.district) params = params.set('district', filters.district);
      if (filters.institution) params = params.set('institution', filters.institution);
      if (filters.designation) params = params.set('designation', filters.designation);
      if (filters.isDifficultStation !== undefined) params = params.set('isDifficultStation', filters.isDifficultStation.toString());
      if (filters.minCount) params = params.set('minCount', filters.minCount.toString());
      if (filters.maxCount) params = params.set('maxCount', filters.maxCount.toString());
    }
    
    return this.http.get<Vacancy[]>(`${this.baseUrl}/vacancies`, { params });
  }

  getFilterOptions(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(`${this.baseUrl}/vacancies/filters`);
  }

  getPreferences(meritRank: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/preferences/rank/${meritRank}`);
  }

  savePreferences(meritRank: number, preferences: PreferenceItem[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/preferences/rank/${meritRank}`, preferences);
  }

  importVacancies(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/import/vacancies`, formData);
  }

  importDifficultStations(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/import/difficult-stations`, formData);
  }

  importDoctors(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/import/doctors`, formData);
  }

  clearAll(): Observable<any> {
    return this.http.post(`${this.baseUrl}/import/clear`, {});
  }

  getDoctor(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/doctors/${id}`);
  }

  getDoctorByMeritRank(meritRank: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/doctors/rank/${meritRank}`);
  }

  getDoctorDetails(meritRank: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/doctors/rank/${meritRank}`);
  }

  getCurrentPosition(meritRank: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/preferences/position/rank/${meritRank}`);
  }

  getAssignedVacancy(meritRank: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/preferences/assignment/rank/${meritRank}`);
  }

  getAvailableDoctorIds(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/doctors`);
  }

  // Couple application methods
  applyAsCouple(doctor1MeritRank: number, doctor2MeritRank: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/couple/apply`, {
      doctor1MeritRank,
      doctor2MeritRank
    });
  }

  getCoupleInfo(meritRank: number): Observable<CoupleInfo> {
    return this.http.get<CoupleInfo>(`${this.baseUrl}/couple/doctor/${meritRank}`);
  }

  removeCoupleApplication(coupleApplicationId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/couple/${coupleApplicationId}`);
  }

  getAllCoupleApplications(): Observable<CoupleApplication[]> {
    return this.http.get<CoupleApplication[]>(`${this.baseUrl}/couple/all`);
  }

  // Reports API methods
  getReportsSummary(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/summary`);
  }

  getDoctorsReport(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/doctors`);
  }

  getVacanciesReport(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/vacancies`);
  }

  getCouplesReport(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/couples`);
  }

  // PDF Preferences API methods
  extractPdfPreferences(pdfFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('pdfFile', pdfFile);
    return this.http.post(`${this.baseUrl}/PdfPreferences/extract-preferences`, formData);
  }

  confirmPdfPreferences(doctorId: number, preferences: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/PdfPreferences/confirm-preferences`, {
      doctorId,
      preferences
    });
  }

  // Generic HTTP methods for flexibility
  get<T>(url: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${url}`);
  }

  post<T>(url: string, data: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${url}`, data);
  }
}
