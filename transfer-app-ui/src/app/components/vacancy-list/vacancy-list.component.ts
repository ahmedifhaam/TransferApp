import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, Vacancy, VacancyFilters } from '../../services/api.service';
import { VacancyFiltersComponent } from '../vacancy-filters/vacancy-filters.component';

@Component({
  selector: 'app-vacancy-list',
  standalone: true,
  imports: [CommonModule, RouterModule, VacancyFiltersComponent],
  templateUrl: './vacancy-list.component.html',
  styleUrl: './vacancy-list.component.scss'
})
export class VacancyListComponent implements OnInit {
  vacancies: Vacancy[] = [];
  filteredVacancies: Vacancy[] = [];
  loading = false;
  currentFilters: VacancyFilters = {};

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadVacancies();
  }

  loadVacancies(): void {
    this.loading = true;
    this.apiService.getVacancies(this.currentFilters).subscribe({
      next: (data) => {
        this.vacancies = data;
        this.filteredVacancies = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading vacancies:', error);
        this.loading = false;
      }
    });
  }

  onFiltersChanged(filters: VacancyFilters): void {
    this.currentFilters = filters;
    this.loadVacancies();
  }

  getTotalVacancies(): number {
    return this.vacancies.reduce((total, vacancy) => total + vacancy.count, 0);
  }

  getDifficultStationsCount(): number {
    return this.vacancies.filter(v => v.isDifficultStation).length;
  }
}
