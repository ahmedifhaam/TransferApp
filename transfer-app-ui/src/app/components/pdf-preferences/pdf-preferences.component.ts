import { Component, OnInit, OnDestroy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Router, NavigationStart } from '@angular/router';
import { ApiService, Vacancy } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PdfPreferencesService, ExtractedPreference, MappedPreference } from '../../services/pdf-preferences.service';

@Component({
  selector: 'app-pdf-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule],
  templateUrl: './pdf-preferences.component.html'
})
export class PdfPreferencesComponent implements OnInit, OnDestroy, AfterViewInit {
  selectedFile: File | null = null;
  extractedPreferences: ExtractedPreference[] = [];
  availableVacancies: Vacancy[] = [];
  mappedPreferences: MappedPreference[] = [];
  isLoading = false;
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  doctorId: number = 0;

  // Virtual scrolling properties
  itemSize = 80; // Height of each preference item in pixels (increased for better accuracy)
  maxBufferPx = 400; // Buffer size for smooth scrolling (reduced to prevent skipping)
  minBufferPx = 200; // Minimum buffer size (reduced to prevent skipping)
  
  // Statistics properties
  statistics = {
    total: 0,
    matched: 0,
    unmatched: 0,
    duplicates: 0
  };
  
  // Duplicate details for popup
  duplicateDetails: { vacancyId: number; vacancyName: string; count: number }[] = [];
  showDuplicatePopup = false;
  
  // Search functionality for dropdowns
  searchTerms: string[] = [];
  filteredVacancies: Vacancy[][] = [];
  
  // Virtual scrolling error handling
  private mutationObserver: MutationObserver | null = null;
  private virtualScrollHealthInterval: any = null;
  
  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private pdfPreferencesService: PdfPreferencesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAvailableVacancies();
    this.doctorId = this.authService.state?.meritRank || 0;
    
    // Check if we have persisted data from the service
    if (this.pdfPreferencesService.hasPersistedData()) {
      console.log('Found persisted data, restoring...');
      this.restoreFromService();
    } else {
      console.log('No persisted data found, initializing...');
      // Initialize search arrays to empty
      this.searchTerms = [];
      this.filteredVacancies = [];
      
      // Close duplicate popup if open
      this.showDuplicatePopup = false;
      
      // Initialize statistics to zero
      this.resetStatistics();
    }
    
    // Add click outside handler to close dropdowns
    document.addEventListener('click', this.handleClickOutside.bind(this));
    
    // Add page refresh listener to clear service data
    window.addEventListener('beforeunload', this.handlePageRefresh.bind(this));
    
    // Add visibility change listener to handle tab switches
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Add focus listener to handle when tab becomes active again
    window.addEventListener('focus', this.handleWindowFocus.bind(this));
    
    // Subscribe to router events to save data before navigation
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // Save current state before navigating away
        this.saveToService();
      }
    });
    
    // Also check for data restoration when component becomes active
    // This handles cases where the component is recreated after navigation
    setTimeout(() => {
      this.checkAndRestoreData();
    }, 50);
    
    // Add error handling for virtual scrolling
    this.setupVirtualScrollErrorHandling();
  }

  ngAfterViewInit(): void {
    // Check if we need to restore data after view is initialized
    // This handles cases where the component is recreated but the view wasn't ready
    if (this.pdfPreferencesService.hasPersistedData() && this.mappedPreferences.length === 0) {
      console.log('Restoring data in ngAfterViewInit...');
      this.restoreFromService();
      this.cdr.detectChanges();
    }
    
    // Set up a periodic check to restore data if needed
    // This handles cases where the component is recreated after tab switches
    setTimeout(() => {
      this.checkAndRestoreData();
    }, 100);
    
    // Additional check after a longer delay to catch edge cases
    setTimeout(() => {
      this.checkAndRestoreData();
    }, 500);
    
    // Recalculate item size after view is initialized
    setTimeout(() => {
      this.recalculateItemSize();
    }, 200);
  }

  private checkAndRestoreData(): void {
    // Check if we have data in service but not in component
    if (this.pdfPreferencesService.hasPersistedData() && 
        (this.mappedPreferences.length === 0 || this.extractedPreferences.length === 0)) {
      console.log('Restoring data from service...');
      this.restoreFromService();
      this.cdr.detectChanges();
    }
  }

  // Public method that can be called from outside to force data restoration
  public restoreDataIfNeeded(): void {
    this.checkAndRestoreData();
  }

  // Method to recalculate item size for virtual scrolling
  private recalculateItemSize(): void {
    // Calculate item size based on content
    const baseHeight = 80; // Base height for preference items
    const hasContent = this.mappedPreferences.length > 0;
    
    if (hasContent) {
      // Adjust item size based on content complexity
      const avgContentLength = this.mappedPreferences.reduce((sum, item) => {
        const contentLength = (item.extracted.vacancyName?.length || 0) + 
                             (item.extracted.institute?.length || 0) + 
                             (item.extracted.postDesignation?.length || 0);
        return sum + contentLength;
      }, 0) / this.mappedPreferences.length;
      
      // Adjust size based on content length
      if (avgContentLength > 100) {
        this.itemSize = 100; // Larger items for complex content
      } else if (avgContentLength > 50) {
        this.itemSize = 90; // Medium items for moderate content
      } else {
        this.itemSize = 80; // Standard size for simple content
      }
    } else {
      this.itemSize = 80; // Default size
    }
    
    // Ensure item size is within reasonable bounds
    this.itemSize = Math.max(70, Math.min(120, this.itemSize));
    
    // Force change detection to update virtual scrolling
    this.cdr.detectChanges();
    
    console.log(`Item size recalculated to: ${this.itemSize}px`);
  }

  // Method to handle virtual scrolling errors
  private handleVirtualScrollError(): void {
    console.warn('Virtual scrolling error detected, recalculating item size...');
    this.recalculateItemSize();
    
    // Force a complete re-render of the virtual scroll viewport
    setTimeout(() => {
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }, 100);
  }

  // Method to handle scroll events for error detection
  private handleScrollEvent(event: Event): void {
    // Check if scrolling is working properly
    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // If scroll position seems incorrect, recalculate item size
    if (scrollHeight > 0 && scrollTop + clientHeight > scrollHeight + 100) {
      console.warn('Scroll position anomaly detected, recalculating item size...');
      this.recalculateItemSize();
    }
  }

  // Method to check virtual scrolling health
  private checkVirtualScrollHealth(): void {
    const viewport = document.querySelector('.virtual-scroll-viewport');
    if (!viewport) return;
    
    const scrollHeight = viewport.scrollHeight;
    const clientHeight = viewport.clientHeight;
    const expectedHeight = this.mappedPreferences.length * this.itemSize;
    
    // Check if the scroll height matches expected height
    const heightDifference = Math.abs(scrollHeight - expectedHeight);
    if (heightDifference > 50) { // Allow 50px tolerance
      console.warn(`Virtual scroll height mismatch detected. Expected: ${expectedHeight}px, Actual: ${scrollHeight}px`);
      this.recalculateItemSize();
    }
    
    // Check if there are any visible preference items
    const visibleItems = viewport.querySelectorAll('.preference-item');
    if (visibleItems.length === 0 && this.mappedPreferences.length > 0) {
      console.warn('No visible preference items found, recalculating item size...');
      this.recalculateItemSize();
    }
    
    // Check if scrolling is working properly
    if (this.mappedPreferences.length > 0 && scrollHeight <= clientHeight) {
      console.warn('Virtual scroll height is too small, recalculating item size...');
      this.recalculateItemSize();
    }
  }

  // Setup error handling for virtual scrolling
  private setupVirtualScrollErrorHandling(): void {
    // Add error event listener to handle virtual scrolling issues
    const viewport = document.querySelector('.virtual-scroll-viewport');
    if (viewport) {
      viewport.addEventListener('error', (event) => {
        console.warn('Virtual scroll viewport error:', event);
        this.handleVirtualScrollError();
      });
      
      // Add scroll event listener to detect scrolling issues
      viewport.addEventListener('scroll', this.handleScrollEvent.bind(this));
    }
    
    // Add mutation observer to detect DOM changes that might affect virtual scrolling
    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if preference items were added/removed
          const hasPreferenceChanges = Array.from(mutation.addedNodes).some(node => 
            node instanceof HTMLElement && node.classList.contains('preference-item')
          );
          
          if (hasPreferenceChanges) {
            // Recalculate item size when preference items change
            setTimeout(() => {
              this.recalculateItemSize();
            }, 100);
          }
        }
      });
    });
    
    // Start observing the virtual scroll viewport
    if (viewport) {
      this.mutationObserver.observe(viewport, {
        childList: true,
        subtree: true
      });
    }
    
    // Add periodic check for virtual scrolling health
    this.virtualScrollHealthInterval = setInterval(() => {
      this.checkVirtualScrollHealth();
    }, 5000); // Check every 5 seconds
  }

  private restoreFromService(): void {
    const state = this.pdfPreferencesService.getState();
    this.selectedFile = state.selectedFile;
    this.extractedPreferences = state.extractedPreferences;
    this.mappedPreferences = state.mappedPreferences;
    this.statistics = state.statistics;
    this.duplicateDetails = state.duplicateDetails;
    this.showDuplicatePopup = state.showDuplicatePopup;
    this.searchTerms = state.searchTerms;
    this.filteredVacancies = state.filteredVacancies;
    this.message = state.message;
    this.messageType = state.messageType;
    this.isLoading = state.isLoading;
    
    // Log restoration for debugging
    console.log('Data restored from service:', {
      extractedCount: this.extractedPreferences.length,
      mappedCount: this.mappedPreferences.length,
      hasFile: !!this.selectedFile
    });
  }

  private saveToService(): void {
    this.pdfPreferencesService.updateState({
      selectedFile: this.selectedFile,
      extractedPreferences: this.extractedPreferences,
      mappedPreferences: this.mappedPreferences,
      statistics: this.statistics,
      duplicateDetails: this.duplicateDetails,
      showDuplicatePopup: this.showDuplicatePopup,
      searchTerms: this.searchTerms,
      filteredVacancies: this.filteredVacancies,
      message: this.message,
      messageType: this.messageType,
      isLoading: this.isLoading
    });
    
    // Log saving for debugging
    console.log('Data saved to service:', {
      extractedCount: this.extractedPreferences.length,
      mappedCount: this.mappedPreferences.length,
      hasFile: !!this.selectedFile
    });
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    document.removeEventListener('click', this.handleClickOutside.bind(this));
    window.removeEventListener('beforeunload', this.handlePageRefresh.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('focus', this.handleWindowFocus.bind(this));
    
    // Clean up mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    // Clean up scroll event listeners
    const viewport = document.querySelector('.virtual-scroll-viewport');
    if (viewport) {
      viewport.removeEventListener('error', this.handleVirtualScrollError.bind(this));
      viewport.removeEventListener('scroll', this.handleScrollEvent.bind(this));
    }
    
    // Clear any intervals
    if (this.virtualScrollHealthInterval) {
      clearInterval(this.virtualScrollHealthInterval);
    }
    
    // Save current state to service before destroying component
    this.saveToService();
  }

  private handlePageRefresh(): void {
    // Clear service data on page refresh
    console.log('Page refresh detected, clearing service data...');
    this.pdfPreferencesService.clearState();
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      // Tab became visible again, check if we need to restore data
      console.log('Tab became visible, checking for data restoration...');
      if (this.pdfPreferencesService.hasPersistedData() && this.mappedPreferences.length === 0) {
        this.restoreFromService();
        this.cdr.detectChanges();
      }
    }
  }

  private handleWindowFocus(): void {
    // Window/tab became focused, check if we need to restore data
    console.log('Window focused, checking for data restoration...');
    if (this.pdfPreferencesService.hasPersistedData() && this.mappedPreferences.length === 0) {
      this.restoreFromService();
      this.cdr.detectChanges();
    }
  }
  
  private handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.searchable-dropdown')) {
      this.mappedPreferences.forEach(item => {
        item.showDropdown = false;
      });
      // Recalculate statistics when dropdowns are closed
      this.calculateStatistics();
      
      // Save to service
      this.saveToService();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.message = '';
      
      // Reset search arrays when new file is selected
      this.searchTerms = [];
      this.filteredVacancies = [];
      
      // Close duplicate popup if open
      this.showDuplicatePopup = false;
      
      // Reset statistics when new file is selected
      this.resetStatistics();
      
      // Save to service
      this.saveToService();
    } else {
      this.message = 'Please select a valid PDF file';
      this.messageType = 'error';
    }
  }

  async extractPreferences(): Promise<void> {
    if (!this.selectedFile) {
      this.message = 'Please select a PDF file first';
      this.messageType = 'error';
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      // Ensure vacancies are loaded first
      await this.loadAvailableVacancies();
      
      const response = await this.apiService.extractPdfPreferences(this.selectedFile).toPromise();
      
      if (response.success) {
        this.extractedPreferences = response.preferences;
        this.mapPreferencesToVacancies();
        this.message = 'Preferences extracted successfully! Please review and map to available vacancies.';
        this.messageType = 'success';
        
        // Close duplicate popup when new preferences are extracted
        this.showDuplicatePopup = false;
        
        // Save to service
        this.saveToService();
      } else {
        this.message = response.message || 'Failed to extract preferences';
        this.messageType = 'error';
      }
    } catch (error) {
      this.message = 'Error processing PDF: ' + (error as Error).message;
      this.messageType = 'error';
    } finally {
      this.isLoading = false;
    }
  }

  private async loadAvailableVacancies(): Promise<void> {
    try {
      const response = await this.apiService.getVacancies().toPromise();
      this.availableVacancies = response || [];
      
      // Save to service after loading vacancies
      this.saveToService();
    } catch (error) {
      this.message = 'Error loading available vacancies: ' + (error as Error).message;
      this.messageType = 'error';
    }
  }

  private mapPreferencesToVacancies(): void {
    this.mappedPreferences = this.extractedPreferences.map(extracted => {
      // Try to find a matching vacancy based name similarity
      const bestMatch = this.findBestVacancyMatch(extracted);
      
      // Debug logging
      if (extracted.isMatched && extracted.matchedVacancyId) {
        console.log(`Preference ${extracted.institute} - ${extracted.postDesignation}:`, {
          isMatched: extracted.isMatched,
          matchedVacancyId: extracted.matchedVacancyId,
          foundVacancy: bestMatch,
          availableVacanciesCount: this.availableVacancies.length
        });
      }
      
      return {
        extracted,
        vacancy: bestMatch
      };
    });
    
    // Initialize search arrays
    this.initializeSearchArrays();
    
    // Calculate statistics
    this.calculateStatistics();
    
    // Close duplicate popup when preferences are mapped
    this.showDuplicatePopup = false;
    
    // Recalculate item size for virtual scrolling
    this.recalculateItemSize();
    
    // Trigger change detection for virtual scrolling
    this.cdr.detectChanges();
    
    // Save to service
    this.saveToService();
  }

  calculateStatistics(): void {
    const total = this.mappedPreferences.length;
    // Count preferences that have been mapped to a vacancy by the user
    const matched = this.mappedPreferences.filter(mp => mp.vacancy !== null).length;
    const unmatched = total - matched;
    
    // Check for duplicates in the mapped preferences
    const vacancyIds = this.mappedPreferences
      .filter(mp => mp.vacancy !== null)
      .map(mp => mp.vacancy!.id);
    
    // Count actual duplicates (vacancy IDs that appear more than once)
    const idCounts = new Map<number, number>();
    vacancyIds.forEach(id => {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    });
    
    const duplicates = Array.from(idCounts.values()).filter(count => count > 1).length;
    
    // Populate duplicate details for popup
    this.duplicateDetails = Array.from(idCounts.entries())
      .filter(([id, count]) => count > 1)
      .map(([id, count]) => {
        const vacancy = this.availableVacancies.find(v => v.id === id);
        return {
          vacancyId: id,
          vacancyName: vacancy ? `${vacancy.designation} - ${vacancy.institution} (${vacancy.district})` : `Vacancy ID: ${id}`,
          count: count
        };
      });
    
    this.statistics = {
      total,
      matched,
      unmatched,
      duplicates
    };
    
    // Close duplicate popup if no duplicates found
    if (duplicates === 0) {
      this.showDuplicatePopup = false;
    }
    
    // Debug logging for real-time updates
    console.log('Statistics updated:', this.statistics);
    
    // Save to service after updating statistics
    this.saveToService();
  }

  private findBestVacancyMatch(extracted: ExtractedPreference): Vacancy | null {
    // If the backend already matched this preference, use that match
    if (extracted.isMatched && extracted.matchedVacancyId) {
      const matchedVacancy = this.availableVacancies.find(v => v.id === extracted.matchedVacancyId);
      if (matchedVacancy) {
        console.log(`Backend matched: ${extracted.institute} - ${extracted.postDesignation} -> Vacancy ID: ${matchedVacancy.id}`);
        return matchedVacancy;
      } else {
        console.warn(`Backend matched vacancy ID ${extracted.matchedVacancyId} not found in available vacancies`);
      }
    }

    // Try to find a matching vacancy based on name similarity
    const exactMatch = this.availableVacancies.find(v => 
      v.designation.toLowerCase().includes(extracted.postDesignation.toLowerCase()) &&
      v.institution.toLowerCase().includes(extracted.institute.toLowerCase()) &&
      v.district.toLowerCase().includes(extracted.institute.toLowerCase())
    );

    if (exactMatch) {
      console.log(`Fuzzy matched: ${extracted.institute} - ${extracted.postDesignation} -> Vacancy ID: ${exactMatch.id}`);
      return exactMatch;
    }

    // Fallback: return null if no match found (don't auto-select first vacancy)
    console.log(`No match found for: ${extracted.institute} - ${extracted.postDesignation}`);
    return null;
  }
  
  // Method to manually update a preference mapping and recalculate statistics
  updatePreferenceMapping(index: number, vacancy: Vacancy | null): void {
    if (this.mappedPreferences[index]) {
      this.mappedPreferences[index].vacancy = vacancy;
      
      // Close dropdown if clearing selection
      if (!vacancy) {
        this.mappedPreferences[index].showDropdown = false;
      }
      
      // Recalculate statistics immediately
      this.calculateStatistics();
      
      // Trigger change detection for real-time updates
      this.cdr.detectChanges();
      
      // Save to service
      this.saveToService();
    }
  }

  onVacancyChange(index: number, event: any): void {
    const vacancyId = parseInt(event.target.value);
    const vacancy = this.availableVacancies.find(v => v.id === vacancyId);
    this.updatePreferenceMapping(index, vacancy || null);
  }
  
  clearVacancySelection(index: number): void {
    this.updatePreferenceMapping(index, null);
  }

  async confirmPreferences(): Promise<void> {
    const validPreferences = this.mappedPreferences
      .filter(mp => mp.vacancy !== null)
      .map(mp => mp.vacancy!.id);

    if (validPreferences.length === 0) {
      this.message = 'Please map at least one preference to a vacancy';
      this.messageType = 'error';
      return;
    }

    // Check for duplicates before sending to API
    const idCounts = new Map<number, number>();
    validPreferences.forEach(id => {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    });
    
    const duplicateIds = Array.from(idCounts.entries()).filter(([id, count]) => count > 1);
    if (duplicateIds.length > 0) {
      const duplicateCount = duplicateIds.reduce((sum, [id, count]) => sum + count - 1, 0);
      this.message = `Cannot save preferences: Found ${duplicateCount} duplicate(s) for ${duplicateIds.length} vacancy(ies). Please remove duplicates before saving.`;
      this.messageType = 'error';
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      const response = await this.apiService.confirmPdfPreferences(this.doctorId, validPreferences).toPromise();

      if (response.success) {
        this.message = 'Preferences confirmed and saved successfully!';
        this.messageType = 'success';
        this.resetForm();
        
        // Save to service
        this.saveToService();
      } else {
        this.message = response.message || 'Failed to save preferences';
        this.messageType = 'error';
      }
    } catch (error: any) {
      // Handle specific error responses
      if (error.status === 400 && error.error?.duplicateCount) {
        this.message = `Cannot save preferences: Found ${error.error.duplicateCount} duplicate(s). Please remove duplicates before saving.`;
      } else {
        this.message = 'Error saving preferences: ' + (error.message || 'Unknown error');
      }
      this.messageType = 'error';
    } finally {
      this.isLoading = false;
    }
  }

  private resetForm(): void {
    this.selectedFile = null;
    this.extractedPreferences = [];
    this.mappedPreferences = [];
    this.message = '';
    
    // Reset search arrays
    this.searchTerms = [];
    this.filteredVacancies = [];
    
    // Close duplicate popup if open
    this.showDuplicatePopup = false;
    
    // Reset statistics when form is reset
    this.resetStatistics();
    
    // Clear service state
    this.pdfPreferencesService.clearState();
    
    console.log('Form reset and service data cleared');
  }

  clearMessage(): void {
    this.message = '';
    this.saveToService();
  }
  
  showDuplicatesPopup(): void {
    if (this.statistics.duplicates > 0) {
      this.showDuplicatePopup = true;
      
      // Save to service after showing duplicate popup
      this.saveToService();
    }
  }
  
  closeDuplicatePopup(): void {
    this.showDuplicatePopup = false;
    this.saveToService();
  }
  
  // Search functionality methods
  onSearchChange(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value;
    this.searchTerms[index] = searchTerm;
    this.filterVacancies(index, searchTerm);
    
    // Ensure statistics are up-to-date during search
    this.calculateStatistics();
    
    // Save to service
    this.saveToService();
  }
  
  // Method to clear search and reset filtered vacancies
  clearSearch(index: number): void {
    this.searchTerms[index] = '';
    this.filteredVacancies[index] = this.availableVacancies;
    
    // Ensure statistics are up-to-date
    this.calculateStatistics();
    
    // Save to service
    this.saveToService();
  }
  
  // Method to handle search input focus
  onSearchFocus(index: number): void {
    // Ensure statistics are up-to-date when search is focused
    this.calculateStatistics();
    this.saveToService();
  }
  
  // Method to handle search input blur
  onSearchBlur(index: number): void {
    // Ensure statistics are up-to-date when search loses focus
    this.calculateStatistics();
    this.saveToService();
  }
  
  // Method to reset statistics to initial state
  resetStatistics(): void {
    this.statistics = {
      total: 0,
      matched: 0,
      unmatched: 0,
      duplicates: 0
    };
    this.duplicateDetails = [];
    
    // Close duplicate popup when statistics are reset
    this.showDuplicatePopup = false;
    
    // Save to service after resetting statistics
    this.saveToService();
  }
  
  private filterVacancies(index: number, searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredVacancies[index] = this.availableVacancies;
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    this.filteredVacancies[index] = this.availableVacancies.filter(vacancy => 
      vacancy.designation.toLowerCase().includes(term) ||
      vacancy.institution.toLowerCase().includes(term) ||
      vacancy.district.toLowerCase().includes(term)
    );
    
    // Save to service after filtering vacancies
    this.saveToService();
  }
  
  getFilteredVacancies(index: number): Vacancy[] {
    if (!this.filteredVacancies[index] || this.filteredVacancies[index].length === 0) {
      return this.availableVacancies;
    }
    return this.filteredVacancies[index];
  }
  
  toggleDropdown(index: number): void {
    if (this.mappedPreferences[index]) {
      this.mappedPreferences[index].showDropdown = !this.mappedPreferences[index].showDropdown;
      
      // Close other dropdowns
      this.mappedPreferences.forEach((item, i) => {
        if (i !== index) {
          item.showDropdown = false;
        }
      });
      
      // Recalculate statistics when dropdown is toggled
      this.calculateStatistics();
      
      // Save to service
      this.saveToService();
    }
  }
  
  initializeSearchArrays(): void {
    this.searchTerms = new Array(this.mappedPreferences.length).fill('');
    this.filteredVacancies = new Array(this.mappedPreferences.length).fill(this.availableVacancies);
    
    // Save to service after initializing search arrays
    this.saveToService();
  }
}

