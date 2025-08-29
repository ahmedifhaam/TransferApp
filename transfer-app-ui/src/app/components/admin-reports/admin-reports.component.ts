import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface DoctorApplication {
  doctor: any;
  preferencesCount: number;
  assignedVacancy: any;
  isAssigned: boolean;
}

interface VacancyApplication {
  vacancy: any;
  preferenceCount: number;
  assignedDoctors: any[];
  isFullyAssigned: boolean;
}

interface CoupleApplication {
  doctor1: any;
  doctor2: any;
  effectiveMeritRank: number;
  createdAt: string;
}

interface AssignmentSummary {
  totalDoctors: number;
  assignedCount: number;
  unassignedCount: number;
  assignmentRate: string;
}

interface Statistics {
  totalDoctors: number;
  totalVacancies: number;
  totalPositions: number;
  difficultStations: number;
  totalCouples: number;
  averagePreferencesPerDoctor: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.component.html',
  styleUrl: './admin-reports.component.scss'
})
export class ReportsComponent implements OnInit {
  loading = false;
  searchTerm = '';
  selectedFilter = 'all';
  autoRefresh = false;
  refreshInterval: any;
  lastUpdated: Date | null = null;
  reports = {
    doctorApplications: [] as DoctorApplication[],
    vacancyApplications: [] as VacancyApplication[],
    coupleApplications: [] as CoupleApplication[],
    assignmentSummary: {} as AssignmentSummary,
    statistics: {} as Statistics
  };

  // Filtered data for display
  filteredDoctorApplications: DoctorApplication[] = [];
  filteredVacancyApplications: VacancyApplication[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadReports();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.refreshInterval = setInterval(() => {
        this.loadReports();
      }, 30000); // Refresh every 30 seconds
    } else if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // Filter and search methods
  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    if (this.selectedFilter === 'doctors') {
      this.filteredDoctorApplications = this.reports.doctorApplications.filter(app =>
        app.doctor.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.doctor.meritRank.toString().includes(this.searchTerm)
      );
      this.filteredVacancyApplications = [];
    } else if (this.selectedFilter === 'vacancies') {
      this.filteredVacancyApplications = this.reports.vacancyApplications.filter(app =>
        app.vacancy.designation.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.vacancy.institution.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.vacancy.district.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
      this.filteredDoctorApplications = [];
    } else {
      // Show all data
      this.filteredDoctorApplications = this.reports.doctorApplications.filter(app =>
        app.doctor.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.doctor.meritRank.toString().includes(this.searchTerm)
      );
      this.filteredVacancyApplications = this.reports.vacancyApplications.filter(app =>
        app.vacancy.designation.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.vacancy.institution.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        app.vacancy.district.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  loadReports(): void {
    this.loading = true;
    
    // Use the new optimized API to get all data in one call
    this.apiService.getReportsSummary().subscribe({
      next: (data) => {
        console.log('Reports summary loaded:', data);
        
        // Map the data to our reports structure
        this.reports.doctorApplications = data.doctors.map((d: any) => ({
          doctor: {
            id: d.id,
            meritRank: d.meritRank,
            fullName: d.fullName
          },
          preferencesCount: d.preferencesCount,
          assignedVacancy: d.assignedVacancy,
          isAssigned: d.assignedVacancy != null
        }));

        this.reports.vacancyApplications = data.vacancyApplications.map((v: any) => ({
          vacancy: {
            id: v.id,
            designation: v.designation,
            count: v.count,
            isDifficultStation: v.isDifficultStation,
            institution: v.institution,
            district: v.district
          },
          preferenceCount: v.preferenceCount,
          assignedDoctors: v.assignedDoctors,
          isFullyAssigned: v.isFullyAssigned
        }));

        this.reports.coupleApplications = data.couples;
        this.reports.statistics = data.statistics;
        this.reports.assignmentSummary = data.assignmentSummary;
        
        // Initialize filtered arrays
        this.applyFilters();
        
        this.lastUpdated = new Date();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reports summary:', error);
        this.loading = false;
        // Fallback to individual API calls if the summary fails
        this.loadReportsFallback();
      }
    });
  }

  private loadReportsFallback(): void {
    // Fallback method using the old individual API calls
    Promise.all([
      this.loadDoctorApplications(),
      this.loadVacancyApplications(),
      this.loadCoupleApplications(),
      this.loadAssignmentSummary(),
      this.loadStatistics()
    ]).finally(() => {
      this.loading = false;
    });
  }

  private async loadDoctorApplications(): Promise<void> {
    try {
      const doctors = await this.apiService.getAvailableDoctorIds().toPromise();
      const applications: DoctorApplication[] = [];
      
      for (const doctor of doctors.doctors || []) {
        try {
          const preferences = await this.apiService.getPreferences(doctor.meritRank).toPromise();
          const assignment = await this.apiService.getAssignedVacancy(doctor.meritRank).toPromise();
          
          applications.push({
            doctor: doctor,
            preferencesCount: preferences?.length || 0,
            assignedVacancy: assignment?.assigned ? assignment.vacancy : null,
            isAssigned: assignment?.assigned || false
          });
        } catch (error) {
          console.error(`Error loading data for doctor ${doctor.meritRank}:`, error);
        }
      }
      
      this.reports.doctorApplications = applications.sort((a, b) => a.doctor.meritRank - b.doctor.meritRank);
    } catch (error) {
      console.error('Error loading doctor applications:', error);
    }
  }

  private async loadVacancyApplications(): Promise<void> {
    try {
      const vacancies = await this.apiService.getVacancies().toPromise();
      const vacancyApplications: VacancyApplication[] = [];
      
      for (const vacancy of vacancies || []) {
        // Count how many doctors have this vacancy in their preferences
        let preferenceCount = 0;
        let assignedDoctors: any[] = [];
        
        for (const doctorApp of this.reports.doctorApplications) {
          try {
            const preferences = await this.apiService.getPreferences(doctorApp.doctor.meritRank).toPromise();
            const hasPreference = preferences?.some(p => p.vacancyId === vacancy.id);
            if (hasPreference) {
              preferenceCount++;
            }
            
            if (doctorApp.assignedVacancy?.id === vacancy.id) {
              assignedDoctors.push(doctorApp.doctor);
            }
          } catch (error) {
            console.error(`Error checking preferences for doctor ${doctorApp.doctor.meritRank}:`, error);
          }
        }
        
        vacancyApplications.push({
          vacancy: vacancy,
          preferenceCount: preferenceCount,
          assignedDoctors: assignedDoctors,
          isFullyAssigned: assignedDoctors.length >= vacancy.count
        });
      }
      
      this.reports.vacancyApplications = vacancyApplications.sort((a, b) => b.preferenceCount - a.preferenceCount);
    } catch (error) {
      console.error('Error loading vacancy applications:', error);
    }
  }

  private async loadCoupleApplications(): Promise<void> {
    try {
      const couples = await this.apiService.getAllCoupleApplications().toPromise();
      this.reports.coupleApplications = couples || [];
    } catch (error) {
      console.error('Error loading couple applications:', error);
    }
  }

  private async loadAssignmentSummary(): Promise<void> {
    try {
      const assignedCount = this.reports.doctorApplications.filter(d => d.isAssigned).length;
      const totalDoctors = this.reports.doctorApplications.length;
      const unassignedCount = totalDoctors - assignedCount;
      
      this.reports.assignmentSummary = {
        totalDoctors,
        assignedCount,
        unassignedCount,
        assignmentRate: totalDoctors > 0 ? ((assignedCount / totalDoctors) * 100).toFixed(1) : '0'
      };
    } catch (error) {
      console.error('Error loading assignment summary:', error);
    }
  }

  private async loadStatistics(): Promise<void> {
    try {
      const totalVacancies = this.reports.vacancyApplications.length;
      const totalPositions = this.reports.vacancyApplications.reduce((sum, v) => sum + v.vacancy.count, 0);
      const difficultStations = this.reports.vacancyApplications.filter(v => v.vacancy.isDifficultStation).length;
      const totalCouples = this.reports.coupleApplications.length;
      
      this.reports.statistics = {
        totalDoctors: this.reports.doctorApplications.length,
        totalVacancies,
        totalPositions,
        difficultStations,
        totalCouples,
        averagePreferencesPerDoctor: this.reports.doctorApplications.length > 0 
          ? (this.reports.doctorApplications.reduce((sum, d) => sum + d.preferencesCount, 0) / this.reports.doctorApplications.length).toFixed(1)
          : '0'
      };
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }

  refreshReports(): void {
    this.loadReports();
  }

  exportToCSV(): void {
    try {
      // Create CSV content for doctors report
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Doctors CSV
      csvContent += 'Merit Rank,Doctor Name,Preferences Count,Assigned Vacancy,Status\n';
      this.reports.doctorApplications.forEach(app => {
        const assignedVacancy = app.assignedVacancy 
          ? `${app.assignedVacancy.designation} - ${app.assignedVacancy.institution}`
          : 'Not assigned';
        const status = app.isAssigned ? 'Assigned' : 'Unassigned';
        csvContent += `${app.doctor.meritRank},"${app.doctor.fullName}",${app.preferencesCount},"${assignedVacancy}",${status}\n`;
      });
      
      // Add vacancy applications
      csvContent += '\nVacancy Applications\n';
      csvContent += 'Vacancy,Institution,District,Positions,Preference Count,Status\n';
      this.reports.vacancyApplications.forEach(app => {
        const status = app.isFullyAssigned ? 'Fully Assigned' : 'Available';
        csvContent += `"${app.vacancy.designation}","${app.vacancy.institution}","${app.vacancy.district}",${app.vacancy.count},${app.preferenceCount},${status}\n`;
      });
      
      // Add couple applications if any
      if (this.reports.coupleApplications.length > 0) {
        csvContent += '\nCouple Applications\n';
        csvContent += 'Doctor 1,Doctor 2,Effective Merit Rank,Created\n';
        this.reports.coupleApplications.forEach(couple => {
          csvContent += `"${couple.doctor1.fullName} (${couple.doctor1.meritRank})","${couple.doctor2.fullName} (${couple.doctor2.meritRank})",${couple.effectiveMeritRank},"${couple.createdAt}"\n`;
        });
      }
      
      // Add summary statistics
      csvContent += '\nSummary Statistics\n';
      csvContent += `Total Doctors,${this.reports.statistics.totalDoctors}\n`;
      csvContent += `Total Vacancies,${this.reports.statistics.totalVacancies}\n`;
      csvContent += `Total Positions,${this.reports.statistics.totalPositions}\n`;
      csvContent += `Difficult Stations,${this.reports.statistics.difficultStations}\n`;
      csvContent += `Total Couples,${this.reports.statistics.totalCouples}\n`;
      csvContent += `Average Preferences/Doctor,${this.reports.statistics.averagePreferencesPerDoctor}\n`;
      csvContent += `Assignment Rate,${this.reports.assignmentSummary.assignmentRate}%\n`;
      
      // Create and download the file
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `transfer-reports-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('CSV export completed successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV. Please try again.');
    }
  }

  async exportToPDF(): Promise<void> {
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Transfer Reports & Analytics', 20, 20);
      
      // Add summary statistics
      doc.setFontSize(14);
      doc.text('Summary Statistics', 20, 40);
      doc.setFontSize(10);
      doc.text(`Total Doctors: ${this.reports.statistics.totalDoctors || 0}`, 20, 55);
      doc.text(`Total Vacancies: ${this.reports.statistics.totalVacancies || 0}`, 20, 65);
      doc.text(`Total Positions: ${this.reports.statistics.totalPositions || 0}`, 20, 75);
      doc.text(`Difficult Stations: ${this.reports.statistics.difficultStations || 0}`, 20, 85);
      doc.text(`Total Couples: ${this.reports.statistics.totalCouples || 0}`, 20, 95);
      doc.text(`Assignment Rate: ${this.reports.assignmentSummary.assignmentRate || '0'}%`, 20, 105);
      
      // Add doctor applications table
      if (this.reports.doctorApplications.length > 0) {
        const doctorData = this.reports.doctorApplications.slice(0, 50).map(app => [
          app.doctor.meritRank.toString(),
          app.doctor.fullName,
          app.preferencesCount.toString(),
          app.assignedVacancy ? `${app.assignedVacancy.designation} - ${app.assignedVacancy.institution}` : 'Not assigned',
          app.isAssigned ? 'Assigned' : 'Unassigned'
        ]);

        autoTable(doc, {
          head: [['Merit Rank', 'Doctor Name', 'Preferences', 'Assigned Vacancy', 'Status']],
          body: doctorData,
          startY: 125,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        if (this.reports.doctorApplications.length > 50) {
          const finalY = (doc as any).lastAutoTable.finalY + 5;
          doc.text(`... and ${this.reports.doctorApplications.length - 50} more doctors`, 20, finalY);
        }
      }
      
      // Add vacancy applications table
      if (this.reports.vacancyApplications.length > 0) {
        const vacancyData = this.reports.vacancyApplications.slice(0, 30).map(app => [
          app.vacancy.designation,
          app.vacancy.institution,
          app.vacancy.district,
          app.vacancy.count.toString(),
          app.preferenceCount.toString(),
          app.isFullyAssigned ? 'Fully Assigned' : 'Available'
        ]);

        const startY = this.reports.doctorApplications.length > 0 ? (doc as any).lastAutoTable.finalY + 20 : 125;
        
        autoTable(doc, {
          head: [['Vacancy', 'Institution', 'District', 'Positions', 'Preferences', 'Status']],
          body: vacancyData,
          startY: startY,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [39, 174, 96], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        if (this.reports.vacancyApplications.length > 30) {
          const finalY = (doc as any).lastAutoTable.finalY + 5;
          doc.text(`... and ${this.reports.vacancyApplications.length - 30} more vacancies`, 20, finalY);
        }
      }
      
      // Add couple applications if any
      if (this.reports.coupleApplications.length > 0) {
        const coupleData = this.reports.coupleApplications.map(couple => [
          `${couple.doctor1.fullName} (${couple.doctor1.meritRank})`,
          `${couple.doctor2.fullName} (${couple.doctor2.meritRank})`,
          couple.effectiveMeritRank.toString(),
          new Date(couple.createdAt).toLocaleDateString()
        ]);

        const startY = this.reports.vacancyApplications.length > 0 ? (doc as any).lastAutoTable.finalY + 20 : 125;
        
        autoTable(doc, {
          head: [['Doctor 1', 'Doctor 2', 'Effective Rank', 'Created']],
          body: coupleData,
          startY: startY,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [155, 89, 182], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] }
        });
      }
      
      // Add footer
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 200;
      doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 20, finalY);
      doc.text(`Total records: ${this.reports.doctorApplications.length} doctors, ${this.reports.vacancyApplications.length} vacancies`, 20, finalY + 10);
      
      // Save the PDF
      const fileName = `transfer-reports-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  }

  async exportDoctorPreferencesToPDF(): Promise<void> {
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Individual Doctor Preferences Report', 20, 20);
      
      // Add summary
      doc.setFontSize(12);
      doc.text(`Total Doctors: ${this.filteredDoctorApplications.length}`, 20, 40);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 50);
      
      // Add doctor preferences table
      if (this.filteredDoctorApplications.length > 0) {
        const doctorData = this.filteredDoctorApplications.map(app => [
          app.doctor.meritRank.toString(),
          app.doctor.fullName,
          app.preferencesCount.toString(),
          app.assignedVacancy ? `${app.assignedVacancy.designation} - ${app.assignedVacancy.institution}` : 'Not assigned',
          app.isAssigned ? 'Assigned' : 'Unassigned'
        ]);

        autoTable(doc, {
          head: [['Merit Rank', 'Doctor Name', 'Preferences', 'Assigned Vacancy', 'Status']],
          body: doctorData,
          startY: 70,
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] }
        });
      }
      
      // Add footer
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 200;
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, finalY);
      doc.text(`Filtered results: ${this.filteredDoctorApplications.length} doctors`, 20, finalY + 10);
      
      // Save the PDF
      const fileName = `doctor-preferences-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating doctor preferences PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  }

  getMostPopularVacancy(): string {
    if (!this.reports.vacancyApplications || this.reports.vacancyApplications.length === 0) {
      return 'N/A';
    }
    const mostPopular = this.reports.vacancyApplications.reduce((prev, current) => 
      (prev.preferenceCount > current.preferenceCount) ? prev : current
    );
    return `${mostPopular.vacancy.designation} (${mostPopular.preferenceCount} preferences)`;
  }

  getLeastPopularVacancy(): string {
    if (!this.reports.vacancyApplications || this.reports.vacancyApplications.length === 0) {
      return 'N/A';
    }
    const leastPopular = this.reports.vacancyApplications.reduce((prev, current) => 
      (prev.preferenceCount < current.preferenceCount) ? prev : current
    );
    return `${leastPopular.vacancy.designation} (${leastPopular.preferenceCount} preferences)`;
  }

  getTopPriorityDoctor(): string {
    if (!this.reports.doctorApplications || this.reports.doctorApplications.length === 0) {
      return 'N/A';
    }
    const topPriority = this.reports.doctorApplications[0]; // Already sorted by merit rank
    return `Rank ${topPriority.doctor.meritRank}: ${topPriority.doctor.fullName}`;
  }

  getMostCompetitiveVacancy(): string {
    if (!this.reports.vacancyApplications || this.reports.vacancyApplications.length === 0) {
      return 'N/A';
    }
    const mostCompetitive = this.reports.vacancyApplications.reduce((prev, current) => 
      (prev.preferenceCount > current.preferenceCount) ? prev : current
    );
    return `${mostCompetitive.vacancy.designation} (${mostCompetitive.preferenceCount} doctors)`;
  }

  getEasiestVacancyToFill(): string {
    if (!this.reports.vacancyApplications || this.reports.vacancyApplications.length === 0) {
      return 'N/A';
    }
    const easiest = this.reports.vacancyApplications.reduce((prev, current) => 
      (prev.preferenceCount < current.preferenceCount) ? prev : current
    );
    return `${easiest.vacancy.designation} (${easiest.preferenceCount} doctors)`;
  }

  getCoupleImpact(): string {
    if (!this.reports.coupleApplications || this.reports.coupleApplications.length === 0) {
      return 'No couples';
    }
    const totalCouples = this.reports.coupleApplications.length;
    const totalDoctors = this.reports.statistics.totalDoctors || 0;
    const percentage = totalDoctors > 0 ? Math.round((totalCouples * 2 / totalDoctors) * 100) : 0;
    return `${totalCouples} couples (${percentage}% of doctors)`;
  }
}
