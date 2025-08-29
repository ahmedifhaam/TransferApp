import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-csv-import',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './csv-import.component.html',
  styleUrl: './csv-import.component.scss'
})
export class CsvImportComponent {
  uploading = false;
  uploadStatus = '';

  constructor(private apiService: ApiService) {}

  onClearAll(): void {
    if (!confirm('This will delete all data (vacancies, doctors, institutions, districts, preferences). Continue?')) return;
    this.uploading = true;
    this.uploadStatus = 'Clearing all data...';
    this.apiService.clearAll().subscribe({
      next: () => {
        this.uploading = false;
        this.uploadStatus = 'All data cleared successfully.';
      },
      error: (err) => {
        console.error('Error clearing data', err);
        this.uploading = false;
        this.uploadStatus = 'Error clearing data. Please try again.';
      }
    });
  }

  onFileSelected(event: any, type: string): void {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file.');
      return;
    }

    this.uploadFile(file, type);
  }

  uploadFile(file: File, type: string): void {
    this.uploading = true;
    this.uploadStatus = `Uploading ${type}...`;

    let uploadObservable;
    switch (type) {
      case 'vacancies':
        uploadObservable = this.apiService.importVacancies(file);
        break;
      case 'difficult-stations':
        uploadObservable = this.apiService.importDifficultStations(file);
        break;
      case 'doctors':
        uploadObservable = this.apiService.importDoctors(file);
        break;
      default:
        this.uploadStatus = 'Invalid upload type';
        this.uploading = false;
        return;
    }

    uploadObservable.subscribe({
      next: () => {
        this.uploadStatus = `${type} uploaded successfully!`;
        this.uploading = false;
        // Reset file input
        const fileInput = document.getElementById(`${type}-file`) as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (error) => {
        console.error(`Error uploading ${type}:`, error);
        this.uploadStatus = `Error uploading ${type}. Please try again.`;
        this.uploading = false;
      }
    });
  }

  getFileDescription(type: string): string {
    switch (type) {
      case 'vacancies':
        return 'Upload the vacancy list CSV containing hospital positions and counts';
      case 'difficult-stations':
        return 'Upload the difficult stations list CSV to mark challenging locations';
      case 'doctors':
        return 'Upload the doctors list CSV with names and merit rankings';
      default:
        return '';
    }
  }
}
