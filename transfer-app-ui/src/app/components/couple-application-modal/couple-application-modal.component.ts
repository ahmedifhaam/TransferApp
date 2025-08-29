import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, CoupleInfo } from '../../services/api.service';

@Component({
  selector: 'app-couple-application-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './couple-application-modal.component.html',
  styleUrl: './couple-application-modal.component.scss'
})
export class CoupleApplicationModalComponent {
  @Input() isOpen = false;
  @Input() currentDoctorMeritRank = 0;
  @Input() currentDoctorName = '';
  @Output() modalClosed = new EventEmitter<void>();
  @Output() coupleApplicationCreated = new EventEmitter<any>();

  partnerMeritRank = 0;
  loading = false;
  error = '';
  success = '';
  coupleInfo: CoupleInfo | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    if (this.currentDoctorMeritRank > 0) {
      this.loadCoupleInfo();
    }
  }

  loadCoupleInfo(): void {
    this.apiService.getCoupleInfo(this.currentDoctorMeritRank).subscribe({
      next: (info) => {
        this.coupleInfo = info;
      },
      error: () => {
        this.coupleInfo = null;
      }
    });
  }

  applyAsCouple(): void {
    if (!this.partnerMeritRank || this.partnerMeritRank <= 0) {
      this.error = 'Please enter a valid partner merit rank';
      return;
    }

    if (this.partnerMeritRank === this.currentDoctorMeritRank) {
      this.error = 'Cannot apply as couple with yourself';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.apiService.applyAsCouple(this.currentDoctorMeritRank, this.partnerMeritRank).subscribe({
      next: (response) => {
        this.success = 'Couple application created successfully!';
        this.loading = false;
        this.partnerMeritRank = 0;
        this.loadCoupleInfo();
        this.coupleApplicationCreated.emit(response);
      },
      error: (error) => {
        this.error = error.error || 'Failed to create couple application';
        this.loading = false;
      }
    });
  }

  removeCoupleApplication(): void {
    if (!this.coupleInfo?.coupleApplicationId) return;

    if (confirm('Are you sure you want to remove this couple application?')) {
      this.loading = true;
      this.apiService.removeCoupleApplication(this.coupleInfo.coupleApplicationId).subscribe({
        next: () => {
          this.success = 'Couple application removed successfully!';
          this.loading = false;
          this.loadCoupleInfo();
        },
        error: () => {
          this.error = 'Failed to remove couple application';
          this.loading = false;
        }
      });
    }
  }

  closeModal(): void {
    this.isOpen = false;
    this.error = '';
    this.success = '';
    this.partnerMeritRank = 0;
    this.modalClosed.emit();
  }

  getEffectiveRankText(): string {
    if (this.coupleInfo?.isInCouple) {
      return `Effective Merit Rank: ${this.coupleInfo.effectiveMeritRank}`;
    }
    return `Merit Rank: ${this.currentDoctorMeritRank}`;
  }

  getPartnerInfo(): { fullName: string; meritRank: number } | null {
    if (this.coupleInfo?.isInCouple && this.coupleInfo.partner) {
      return {
        fullName: this.coupleInfo.partner.fullName,
        meritRank: this.coupleInfo.partner.meritRank
      };
    }
    return null;
  }
}
