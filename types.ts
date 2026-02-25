export interface PDFState {
  file: File | null;
  fileType: 'pdf' | 'epub' | null;
  numPages: number;
  currentPage: number;
  zoom: number;
  rotation: number;
  isDarkMode: boolean;
  isSidebarOpen: boolean;
  isMapViewOpen: boolean;
  isBookMode: boolean;
  isFullscreen: boolean;
  fileName: string;
  searchQuery: string;
  currentSearchResultIndex: number;
  searchResults: SearchResult[];
  viewMode: 'single' | 'double';
  isControlsVisible: boolean;
}

export interface SearchResult {
  page: number;
  occurrenceIndexOnPage: number;
}

export interface CommandResponse {
  message: string;
  type: 'info' | 'error' | 'success';
}