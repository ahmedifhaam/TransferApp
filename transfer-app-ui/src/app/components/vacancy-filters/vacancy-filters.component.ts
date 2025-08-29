import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, VacancyFilters, FilterOptions } from '../../services/api.service';

@Component({
  selector: 'app-vacancy-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vacancy-filters.component.html',
  styleUrl: './vacancy-filters.component.scss'
})
export class VacancyFiltersComponent implements OnInit {
  @Output() filtersChanged = new EventEmitter<VacancyFilters>();

  filters: VacancyFilters = {};
  filterOptions: FilterOptions | null = null;
  loading = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    this.loading = true;
    console.log('Loading filter options...');
    this.apiService.getFilterOptions().subscribe({
      next: (options) => {
        console.log('Filter options loaded:', options);
        this.filterOptions = options;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading filter options:', error);
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.filtersChanged.emit(this.filters);
  }

  clearFilters(): void {
    this.filters = {};
    this.onFilterChange();
  }

  hasActiveFilters(): boolean {
    return Object.values(this.filters).some(value => 
      value !== undefined && value !== null && value !== ''
    );
  }
}
