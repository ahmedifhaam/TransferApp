import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService, Vacancy, PreferenceItem, Doctor, VacancyFilters, CoupleInfo } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { VacancyFiltersComponent } from '../vacancy-filters/vacancy-filters.component';
import { CoupleApplicationModalComponent } from '../couple-application-modal/couple-application-modal.component';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CdkDropList, CdkDrag, VacancyFiltersComponent, CoupleApplicationModalComponent],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss'
})
export class PreferencesComponent implements OnInit {
  meritRank: number = 1;
  doctor?: Doctor;
  doctorError = '';
  currentPosition: any = null;
  assignedVacancy: any = null;
  availableDoctorIds: number[] = [];
  allVacancies: Vacancy[] = [];
  vacancies: Vacancy[] = [];
  filteredVacancies: Vacancy[] = [];
  preferences: PreferenceItem[] = [];
  loading = false;
  saving = false;
  selectedVacancyId?: number;
  currentFilters: VacancyFilters = {};
  coupleInfo: CoupleInfo | null = null;
  showCoupleModal = false;
  isMeritRankReadonly: boolean = false;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is logged in
    if (!this.authService.state) {
      this.router.navigate(['/login']);
      return;
    }

    // If logged in as doctor, use their merit rank
    if (this.authService.isDoctor()) {
      const authState = this.authService.state;
      this.meritRank = authState.meritRank || 1;
      console.log('Logged in doctor merit rank:', this.meritRank);
      // Disable merit rank input for logged-in doctors
      this.isMeritRankReadonly = true;
    } else if (this.authService.isAdmin()) {
      // Admin can view preferences for any doctor, keep merit rank input enabled
      console.log('Admin user - can select any doctor');
      this.isMeritRankReadonly = false;
    } else {
      this.router.navigate(['/login']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['vacancyId']) {
        this.selectedVacancyId = +params['vacancyId'];
      }
    });
    
    this.loadAllVacancies();
    this.loadAvailableDoctorIds();
    this.onMeritRankChange();
  }

  loadAvailableDoctorIds(): void {
    this.apiService.getAvailableDoctorIds().subscribe({
      next: (data: any) => {
        this.availableDoctorIds = data.doctors?.map((d: any) => d.meritRank) || [];
      },
      error: () => {
        this.availableDoctorIds = [];
      }
    });
  }

  onMeritRankChange(): void {
    this.doctor = undefined;
    this.currentPosition = null;
    this.assignedVacancy = null;
    this.doctorError = '';
    this.coupleInfo = null;
    
    if (this.meritRank && this.meritRank > 0) {
      this.loadPreferences();
      this.loadDoctorDetails();
      this.loadAssignedVacancy();
      this.loadCoupleInfo();
    }
  }

  loadCoupleInfo(): void {
    this.apiService.getCoupleInfo(this.meritRank).subscribe({
      next: (info) => {
        this.coupleInfo = info;
      },
      error: () => {
        this.coupleInfo = null;
      }
    });
  }

  openCoupleModal(): void {
    this.showCoupleModal = true;
  }

  closeCoupleModal(): void {
    this.showCoupleModal = false;
  }

  onCoupleApplicationCreated(): void {
    this.loadCoupleInfo();
    this.loadAssignedVacancy(); // Refresh assignment with new effective rank
  }

  getEffectiveMeritRank(): number {
    return this.coupleInfo?.effectiveMeritRank || this.meritRank;
  }

  getEffectiveRankText(): string {
    if (this.coupleInfo?.isInCouple) {
      return `Effective Merit Rank: ${this.coupleInfo.effectiveMeritRank}`;
    }
    return `Merit Rank: ${this.meritRank}`;
  }

  loadDoctorDetails(): void {
    this.apiService.getDoctorByMeritRank(this.meritRank).subscribe({
      next: (doc) => {
        this.doctor = doc;
        this.doctorError = '';
      },
      error: (error) => {
        this.doctor = undefined;
        this.doctorError = 'Doctor not found. Please check if data has been imported.';
      }
    });
  }

  loadAssignedVacancy(): void {
    this.apiService.getAssignedVacancy(this.meritRank).subscribe({
      next: (assignment) => this.assignedVacancy = assignment,
      error: () => this.assignedVacancy = null
    });
  }

  loadCurrentPosition(): void {
    this.apiService.getCurrentPosition(this.meritRank).subscribe({
      next: (position) => this.currentPosition = position,
      error: () => this.currentPosition = null
    });
  }

  loadVacancies(): void {
    this.loadFilteredVacancies();
  }

  loadPreferences(): void {
    this.apiService.getPreferences(this.meritRank).subscribe({
      next: (data) => {
        this.preferences = data.map((item: any) => ({
          vacancyId: item.vacancyId,
          orderIndex: item.orderIndex
        }));
        this.sortPreferences();
      },
      error: (error) => {
        console.error('Error loading preferences:', error);
      }
    });
  }

  addToPreferences(vacancyId: number): void {
    if (this.preferences.some(p => p.vacancyId === vacancyId)) {
      return;
    }

    const newPreference: PreferenceItem = {
      vacancyId,
      orderIndex: this.preferences.length
    };
    this.preferences.push(newPreference);
  }

  removeFromPreferences(vacancyId: number): void {
    this.preferences = this.preferences.filter(p => p.vacancyId !== vacancyId);
    this.updateOrderIndexes();
  }

  onDrop(event: CdkDragDrop<PreferenceItem[]>): void {
    moveItemInArray(this.preferences, event.previousIndex, event.currentIndex);
    this.updateOrderIndexes();
  }

  updateOrderIndexes(): void {
    this.preferences.forEach((pref, index) => {
      pref.orderIndex = index;
    });
  }

  sortPreferences(): void {
    this.preferences.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  getVacancyById(vacancyId: number): Vacancy | undefined {
    return this.allVacancies.find(v => v.id === vacancyId);
  }

  isInPreferences(vacancyId: number): boolean {
    return this.preferences.some(p => p.vacancyId === vacancyId);
  }

  savePreferences(): void {
    if (this.preferences.length === 0) {
      return;
    }

    this.saving = true;
    this.apiService.savePreferences(this.meritRank, this.preferences).subscribe({
      next: () => {
        this.saving = false;
        alert('Preferences saved successfully!');
      },
      error: (error) => {
        console.error('Error saving preferences:', error);
        this.saving = false;
        alert('Error saving preferences. Please try again.');
      }
    });
  }

  clearPreferences(): void {
    if (confirm('Are you sure you want to clear all preferences?')) {
      this.preferences = [];
    }
  }

  onFiltersChanged(filters: VacancyFilters): void {
    this.currentFilters = filters;
    this.loadFilteredVacancies();
  }

  loadFilteredVacancies(): void {
    this.loading = true;
    this.apiService.getVacancies(this.currentFilters).subscribe({
      next: (data) => {
        this.vacancies = data;
        this.filteredVacancies = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading filtered vacancies:', error);
        this.loading = false;
      }
    });
  }

  getAvailableVacanciesForDisplay(): Vacancy[] {
    if (!this.preferences || this.preferences.length === 0) {
      return this.filteredVacancies;
    }
    
    const preferenceVacancyIds = this.preferences.map(p => p.vacancyId);
    return this.filteredVacancies.filter(v => !preferenceVacancyIds.includes(v.id));
  }

  loadAllVacancies(): void {
    this.loading = true;
    console.log('Loading all vacancies...');
    this.apiService.getVacancies().subscribe({
      next: (data) => {
        console.log('All vacancies loaded:', data.length, 'vacancies');
        this.allVacancies = data;
        this.filteredVacancies = data; // Also populate filtered vacancies for initial display
        this.vacancies = data; // Also populate vacancies array
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading all vacancies:', error);
        this.loading = false;
      }
    });
  }

  async exportToPDF(): Promise<void> {
    if (!this.doctor || this.preferences.length === 0) {
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Doctor Transfer Preferences Report', 20, 20);
      
      // Add doctor information
      doc.setFontSize(12);
      doc.text(`Doctor Name: ${this.doctor.fullName}`, 20, 40);
      doc.text(`Merit Rank: ${this.doctor.meritRank}`, 20, 50);
      doc.text(`Effective Merit Rank: ${this.getEffectiveRankText()}`, 20, 60);
      
      if (this.coupleInfo?.isInCouple) {
        doc.text(`Couple Application: Active`, 20, 70);
        if (this.coupleInfo.partner) {
          doc.text(`Partner: ${this.coupleInfo.partner.fullName} (Rank: ${this.coupleInfo.partner.meritRank})`, 20, 80);
        }
      }
      
      // Add assignment status
      if (this.assignedVacancy) {
        doc.text(`Assignment Status: ${this.assignedVacancy.assigned ? 'Assigned' : 'Unassigned'}`, 20, 90);
        if (this.assignedVacancy.vacancy) {
          doc.text(`Assigned Vacancy: ${this.assignedVacancy.vacancy.designation} - ${this.assignedVacancy.vacancy.institution}`, 20, 100);
        }
      }
      
      // Add preferences table
      const tableData = this.preferences.map((pref, index) => {
        const vacancy = this.getVacancyById(pref.vacancyId);
        return [
          (index + 1).toString(),
          vacancy?.designation || 'Unknown',
          vacancy?.institution || 'Unknown',
          vacancy?.district || 'Unknown',
          vacancy?.count?.toString() || '0',
          vacancy?.isDifficultStation ? 'Yes' : 'No'
        ];
      });

      autoTable(doc, {
        head: [['Rank', 'Designation', 'Institution', 'District', 'Positions', 'Difficult Station']],
        body: tableData,
        startY: 120,
        styles: {
          fontSize: 10,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      // Add summary
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text(`Total Preferences: ${this.preferences.length}`, 20, finalY);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, finalY + 10);
      
      // Save the PDF
      const fileName = `preferences_${this.doctor.fullName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  }
}
