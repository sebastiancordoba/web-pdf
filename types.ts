export interface PDFState {
  file: File | null;
  fileType: 'pdf' | 'epub' | null;
  numPages: number;
  currentPage: number;
  zoom: number;
  rotation: number;
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  fileName: string;
  searchQuery: string;
  currentSearchResultIndex: number;
  searchResults: SearchResult[];
  viewMode: 'single' | 'double';
}

export interface SearchResult {
  page: number;
  occurrenceIndexOnPage: number;
}

export interface CommandResponse {
  message: string;
  type: 'info' | 'error' | 'success';
}