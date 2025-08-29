import { Injectable } from '@angular/core';
import { Vacancy } from './api.service';

export interface ExtractedPreference {
  vacancyName: string;
  institute: string;
  postDesignation: string;
  rawLine: string;
  matchedVacancyId?: number;
  matchedVacancyName?: string;
  isMatched: boolean;
}

export interface MappedPreference {
  extracted: ExtractedPreference;
  vacancy: Vacancy | null;
  showDropdown?: boolean;
}

export interface PdfPreferencesState {
  selectedFile: File | null;
  extractedPreferences: ExtractedPreference[];
  mappedPreferences: MappedPreference[];
  statistics: {
    total: number;
    matched: number;
    unmatched: number;
    duplicates: number;
  };
  duplicateDetails: { vacancyId: number; vacancyName: string; count: number }[];
  showDuplicatePopup: boolean;
  searchTerms: string[];
  filteredVacancies: Vacancy[][];
  message: string;
  messageType: 'success' | 'error' | 'info';
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PdfPreferencesService {
  private state: PdfPreferencesState = {
    selectedFile: null,
    extractedPreferences: [],
    mappedPreferences: [],
    statistics: {
      total: 0,
      matched: 0,
      unmatched: 0,
      duplicates: 0
    },
    duplicateDetails: [],
    showDuplicatePopup: false,
    searchTerms: [],
    filteredVacancies: [],
    message: '',
    messageType: 'info',
    isLoading: false
  };

  private hasData = false;

  constructor() {}

  // Check if there's any persisted data
  hasPersistedData(): boolean {
    return this.hasData;
  }

  // Get the current state
  getState(): PdfPreferencesState {
    return { ...this.state };
  }

  // Update the entire state
  updateState(newState: Partial<PdfPreferencesState>): void {
    this.state = { ...this.state, ...newState };
    this.hasData = true;
  }

  // Update specific parts of the state
  updateSelectedFile(file: File | null): void {
    this.state.selectedFile = file;
    this.hasData = true;
  }

  updateExtractedPreferences(preferences: ExtractedPreference[]): void {
    this.state.extractedPreferences = preferences;
    this.hasData = true;
  }

  updateMappedPreferences(preferences: MappedPreference[]): void {
    this.state.mappedPreferences = preferences;
    this.hasData = true;
  }

  updateStatistics(statistics: PdfPreferencesState['statistics']): void {
    this.state.statistics = statistics;
    this.hasData = true;
  }

  updateDuplicateDetails(details: PdfPreferencesState['duplicateDetails']): void {
    this.state.duplicateDetails = details;
    this.hasData = true;
  }

  updateShowDuplicatePopup(show: boolean): void {
    this.state.showDuplicatePopup = show;
    this.hasData = true;
  }

  updateSearchTerms(terms: string[]): void {
    this.state.searchTerms = terms;
    this.hasData = true;
  }

  updateFilteredVacancies(vacancies: Vacancy[][]): void {
    this.state.filteredVacancies = vacancies;
    this.hasData = true;
  }

  updateMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.state.message = message;
    this.state.messageType = type;
    this.hasData = true;
  }

  updateLoading(loading: boolean): void {
    this.state.isLoading = loading;
    this.hasData = true;
  }

  // Clear all data (called on page refresh or explicit reset)
  clearState(): void {
    this.state = {
      selectedFile: null,
      extractedPreferences: [],
      mappedPreferences: [],
      statistics: {
        total: 0,
        matched: 0,
        unmatched: 0,
        duplicates: 0
      },
      duplicateDetails: [],
      showDuplicatePopup: false,
      searchTerms: [],
      filteredVacancies: [],
      message: '',
      messageType: 'info',
      isLoading: false
    };
    this.hasData = false;
  }

  // Reset form data but keep file
  resetFormData(): void {
    this.state.extractedPreferences = [];
    this.state.mappedPreferences = [];
    this.state.statistics = {
      total: 0,
      matched: 0,
      unmatched: 0,
      duplicates: 0
    };
    this.state.duplicateDetails = [];
    this.state.showDuplicatePopup = false;
    this.state.searchTerms = [];
    this.state.filteredVacancies = [];
    this.state.message = '';
    this.state.messageType = 'info';
    this.state.isLoading = false;
    // Keep the selected file
    this.hasData = this.state.selectedFile !== null;
  }
}
