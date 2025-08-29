export const API_CONFIG = {
  // Base API URL - change this in one place to update all endpoints
  BASE_URL: 'http://localhost:5000/api',
  
  // Auth endpoints
  AUTH: {
    ADMIN_LOGIN: '/auth/admin/login',
    DOCTOR_LOGIN: '/auth/doctor/login/rank',
  },
  
  // Vacancy endpoints
  VACANCIES: {
    LIST: '/vacancies',
    FILTERS: '/vacancies/filters',
  },
  
  // Import endpoints
  IMPORT: {
    VACANCIES: '/import/vacancies',
    DIFFICULT_STATIONS: '/import/difficult-stations',
    DOCTORS: '/import/doctors',
    CLEAR_ALL: '/import/clear',
  },
  
  // Doctor endpoints
  DOCTORS: {
    BY_ID: '/doctors',
    BY_MERIT_RANK: '/doctors/rank',
  },
  
  // Preference endpoints
  PREFERENCES: {
    BY_MERIT_RANK: '/preferences/rank',
    CURRENT_POSITION: '/preferences/position/rank',
    ASSIGNED_VACANCY: '/preferences/assignment/rank',
  },
  
  // Couple application endpoints
  COUPLE: {
    APPLY: '/couple/apply',
    DOCTOR_INFO: '/couple/doctor',
    REMOVE: '/couple',
    ALL: '/couple/all',
  },
  
  // Reports endpoints
  REPORTS: {
    SUMMARY: '/reports/summary',
    DOCTORS: '/reports/doctors',
    VACANCIES: '/reports/vacancies',
    COUPLES: '/reports/couples',
  },
  
  // PDF Preferences endpoints
  PDF_PREFERENCES: {
    EXTRACT: '/PdfPreferences/extract-preferences',
    CONFIRM: '/PdfPreferences/confirm-preferences',
  },
  
  // Health check
  HEALTH: '/health',
} as const;

// Helper function to build full URLs
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Environment-specific configurations
export const ENVIRONMENT_CONFIG = {
  development: {
    BASE_URL: 'http://localhost:5000/api',
  },
  production: {
    BASE_URL: '/api', // Relative path for production
  },
} as const;
