# Zathura Web

[**Live Demo**](https://sebastiancordoba.github.io/web-pdf/)

Zathura Web is a minimalist, keyboard-driven PDF and EPUB reader for the browser, inspired by the popular Linux document viewer Zathura. It focuses on providing a distraction-free reading experience with powerful keyboard shortcuts for navigation and control.

## Features

- **Format Support:** Read both PDF and EPUB files directly in your browser.
- **Keyboard-Driven:** Navigate and control the app entirely using keyboard shortcuts (Vim-like bindings).
- **Minimalist UI:** A clean, distraction-free interface that puts your content first.
- **View Modes:** Toggle between single and double-page views.
- **Dark Mode:** Built-in dark mode (recolor) for comfortable reading in low-light environments.
- **Search:** Fast text search within documents.
- **Command Palette:** Execute commands quickly using the built-in command palette.
- **Map View:** A visual map view to quickly jump to different pages.
- **Fullscreen:** Immersive fullscreen reading mode.

## Keyboard Shortcuts

- `j` / `k`: Smooth Scroll Down / Up
- `h` / `l`: Turn Page Left / Right
- `gg` / `G`: Go to Start / End of document
- `+` / `=`: Zoom In
- `-`: Zoom Out
- `s`: Fit to Width
- `a`: Fit to Height
- `f` / `F11`: Toggle Fullscreen
- `b`: Toggle Book Mode (Double-page view)
- `m`: Toggle Map View
- `Tab`: Toggle Sidebar
- `:`: Open Command Palette
- `/`: Open Search

## Commands

Press `:` to open the command palette, then type one of the following commands:

- `export [format]` or `e [format]`: Export the current page (format: `png` or `jpg`).
- `delete [page]` or `d [page]`: Delete a specific page from the document.
- `dark` or `light`: Switch between dark and light themes.

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Vite
- PDF.js (for PDF rendering)
- epub.js (for EPUB rendering)

## Getting Started

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.
4. Open your browser and navigate to the provided local URL.
