# Zathura Web 📚

> A minimalist, keyboard-driven PDF and EPUB reader inspired by the legendary Linux document viewer, Zathura. 

Zathura Web gives you a distraction-free reading experience with powerful Vim-like keyboard navigation, available both as a **Live Web App** and a lightning-fast **Native macOS Application**.

![Zathura Web Demo](https://img.shields.io/badge/Status-Active-success)
![Platform macOS](https://img.shields.io/badge/Platform-macOS%20Desktop-lightgrey)
![Platform Web](https://img.shields.io/badge/Platform-Web-blue)

---

## 🌍 Web Version
Don't want to install anything? You can use the web version instantly from anywhere:

👉 [**Launch Zathura Web Live Demo**](https://sebastiancordoba.github.io/web-pdf/)

---

## 💻 Desktop Version (macOS)
For the true Zathura experience, you can install the native macOS desktop application. It opens instantly from your terminal and connects directly to your local file system using the incredibly lightweight Tauri engine.

### Installation via Homebrew (Recommended)

You can easily install the app directly from your terminal using Homebrew:

```bash
# 1. Tap the custom repository
brew tap sebastiancordoba/web-pdf

# 2. Install the application
brew install zathura-web
```

Once installed, simply type `web-pdf` followed by any document path:
```bash
web-pdf ~/Documents/my_book.pdf
```

### Manual Installation
Alternatively, you can compile it yourself from the source:
1. Ensure Rust and Node.js are installed.
2. Clone the repository: `git clone https://github.com/sebastiancordoba/web-pdf.git`
3. Install dependencies: `npm install`
4. Build the native application: `npm run tauri build`
5. You'll find the `.app` bundle in `src-tauri/target/release/bundle/macos/`.

---

## ✨ Features

- **Blazing Fast:** Built with React, Vite, and Tauri (for the desktop app).
- **Format Support:** Native rendering for `.pdf` and `.epub` files.
- **Keyboard-Driven:** Navigate explicitly without touching your mouse (Vim bindings).
- **Zero Distractions:** A clean, minimalist UI focusing solely on the content.
- **Dark Mode:** Built-in intelligent dark mode that recolors documents for late-night reading.
- **Global Search:** Fast text indexing and search functionality.

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `j` / `k` | Smooth Scroll Down / Up |
| `h` / `l` | Turn Page Left / Right |
| `gg` / `G` | Go to Start / End of document |
| `+` / `-` | Zoom In / Out |
| `s` / `a` | Fit to Width / Height |
| `f` / `F11` | Toggle Fullscreen |
| `b` | Toggle Book Mode (Double-page layout) |
| `m` | Toggle Map View |
| `Tab` | Toggle Sidebar / Table of Contents |
| `:` | Open Command Palette |
| `/` | Open Search |

## 🚀 Commands
Press `:` to open the command palette, then type:
- `export [format]`: Export the current page (`png` or `jpg`).
- `delete [page]`: Delete a specific page from the PDF.
- `rot [degrees]`: Rotate the document.
- `q`: Reload/Quit.
