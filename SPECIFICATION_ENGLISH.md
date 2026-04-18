# Ageha Editor Specification

**Product Name:** Ageha Editor  
**Version:** 0.3.x  
**Identifier:** com.ageha.app  
**Tech Stack:** Tauri v2 + Vue 3 + TypeScript (frontend) / Rust (backend)  
**Target OS:** Windows / macOS / Linux

---

## 1. Application Overview

Ageha Editor is a desktop Markdown editor built with the Tauri framework. In addition to real-time preview, PDF/HTML export, Mermaid diagrams, and KaTeX math rendering, it also provides authoring, viewing, and output for slide documents by placing `marp: true` in the frontmatter at the top of a document. The application UI supports both Japanese and English.

---

## 2. Project Structure

```text
Ageha-Editor/
├── src/                              # Vue 3 frontend
│   ├── App.vue                       # Root component
│   ├── Editor.vue                    # Main editor component (orchestrator)
│   ├── main.ts                       # Entry point
│   ├── interface.ts                  # TypeScript type definitions
│   ├── constants.ts                  # Constants (extensions, UI values)
│   ├── style.css                     # Global styles
│   ├── github.css                    # GitHub Flavored Markdown styles
│   ├── i18n.ts                       # Lightweight i18n utilities and dictionaries
│   ├── composables/                  # Vue Composition API hooks
│   │   ├── useAceEditor.ts           # Ace editor management
│   │   ├── useFileOperations.ts      # File operations
│   │   ├── useMarkdownPreview.ts     # Markdown/Slides preview rendering
│   │   ├── useExport.ts              # Print/HTML/viewer output
│   │   ├── useKeyboardShortcuts.ts   # Shortcut handling
│   │   ├── useScrollSync.ts          # Scroll sync for Markdown preview
│   │   └── useWindowSize.ts          # Window size management
│   ├── components/
│   │   ├── Help.vue                  # Help/documentation component
│   │   ├── HelpModal.vue             # Help modal wrapper
│   │   ├── ToolbarButtons.vue        # Toolbar buttons / document mode badge
│   │   ├── MarkdownTools.vue         # Markdown writing tools panel
│   │   └── MessageModal.vue          # Message modal
│   ├── stores/
│   │   ├── appInits.ts               # App initialization Pinia store
│   │   └── localStorages.ts          # Local settings Pinia store
│   └── utils/
│       ├── assetPaths.ts             # Shared resolution for relative image paths
│       ├── documentMode.ts           # Document mode detection from frontmatter
│       ├── markedSetup.ts            # Marked.js custom renderer
│       ├── htmlTemplate.ts           # HTML document template generation
│       ├── slideRenderer.ts          # Marp-based slide renderer
│       ├── slideTheme.ts             # Built-in Ageha slide theme
│       └── clipboard.ts              # Copy / tooltip utilities
│
├── src-tauri/                        # Rust backend
│   ├── src/
│   │   ├── main.rs                   # Application entry point
│   │   ├── lib.rs                    # Library root (Tauri setup)
│   │   ├── init.rs                   # Initialization
│   │   ├── config.rs                 # Config structure (Tauri State)
│   │   ├── schema.rs                 # Data structures
│   │   ├── utils.rs                  # Utilities
│   │   └── handler/
│   │       ├── mod.rs                # Handler module root
│   │       ├── file.rs               # File I/O commands
│   │       └── spawn_self.rs         # Process spawning
│   ├── Cargo.toml                    # Rust dependencies
│   ├── tauri.conf.json               # Tauri configuration
│   └── capabilities/
│       ├── default.json              # Security capabilities for main window
│       └── viewer.json               # Security capabilities for viewer/slideshow windows
│
├── public/                           # Static assets
│   ├── ageha.svg                     # App icon
│   ├── katex.css                     # KaTeX stylesheet
│   └── preview.js                    # Preview window script
│
├── README.md
├── README_ENGLISH.md
├── SPECIFICATION.md
├── SPECIFICATION_ENGLISH.md
├── index.html
├── package.json
└── vite.config.ts
```

---

## 3. Technical Dependencies

### 3.1 Frontend (`package.json`)

| Package | Version | Purpose |
| ------- | ------- | ------- |
| `vue` | ^3.5.13 | UI framework |
| `pinia` | ^2.1.7 | State management |
| `@marp-team/marp-core` | ^4.3.0 | Slide (Marp) rendering |
| `@tauri-apps/api` | ^2 | Tauri core API |
| `@tauri-apps/plugin-dialog` | ^2.3.0 | File dialogs |
| `@tauri-apps/plugin-fs` | ^2.4.0 | File system operations |
| `@tauri-apps/plugin-global-shortcut` | ^2.3.0 | Global shortcuts |
| `@tauri-apps/plugin-opener` | ^2 | File / URL opener |
| `@tauri-apps/plugin-store` | ^2.3.0 | Persistent storage |
| `ace-builds` | ^1.24.0 | Code editor |
| `marked` | ^13.0.3 | Markdown parser |
| `mermaid` | ^11.9.0 | Diagram rendering |
| `katex` | ^0.16.22 | Math rendering |
| `prismjs` | ^1.30.0 | Syntax highlighting |
| `xss` | ^1.0.14 | XSS sanitization |

### 3.2 Backend (`Cargo.toml`)

| Crate | Version | Purpose |
| ----- | ------- | ------- |
| `tauri` | ^2 | Application framework (`protocol-asset`, `devtools`) |
| `tauri-plugin-opener` | ^2 | File opening |
| `tauri-plugin-dialog` | ^2 | Dialogs |
| `tauri-plugin-store` | ^2 | Persistent storage |
| `serde` / `serde_json` | ^1 | Serialization / deserialization |
| `anyhow` | ^1.0 | Error handling |
| `base64` | ^0.22 | Local image to data URL conversion |
| `dirs` | ^5.0 | Home directory resolution |
| `once_cell` | ^1.20.3 | Lazy singleton initialization (currently unused) |
| `tracing` / `tracing-subscriber` | ^0.1 / ^0.3 | Logging |

### 3.3 Rust Edition / Build Optimization

- **Edition:** 2024
- **Release profile:** LTO enabled, strip enabled, `codegen-units=1`, `panic=abort`

---

## 4. Architecture

### 4.1 Overall Structure

```text
┌────────────────────────────────────────────────────────────┐
│                       Tauri Shell                          │
│  ┌──────────────────────────────┐   ┌───────────────────┐  │
│  │       Vue 3 Frontend         │   │  Rust Backend     │  │
│  │  App.vue                     │   │  main.rs          │  │
│  │   └─ Editor.vue              │◄─►|  lib.rs           │  │
│  │       ├─ ToolbarButtons.vue  │IPC│  handler/         │  │
│  │       ├─ MarkdownTools.vue   │   │   ├─ file.rs      │  │
│  │       ├─ HelpModal.vue       │   │   └─ spawn_self.rs│  │
│  │       └─ MessageModal.vue    │   │  config.rs        │  │
│  │  Composables                 │   │  schema.rs        │  │
│  │  Pinia Stores                │   │  utils.rs         │  │
│  │  i18n / Utils                │   │  init.rs          │  │
│  └──────────────────────────────┘   └───────────────────┘  │
│                                                            │
│  User settings (`~/.ageha/`)                               │
│  ├─ ageha.env.json      (app settings)                     │
│  ├─ ageha.css           (Markdown CSS)                     │
│  └─ ageha-slide.css     (Slides CSS)                       │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Startup Sequence

```text
1. main.rs: Create / verify the ~/.ageha/ directory
2. main.rs: Load or create ageha.env.json
3. main.rs: Generate default ageha.css / ageha-slide.css / ageha.env.json if missing
4. main.rs: Parse command-line arguments
5. main.rs: Initialize tracing logger
6. main.rs: Pass config paths (args_file_path, css_file_path, slide_css_file_path) into lib::run()
7. lib.rs: Register AppConfig as Tauri State and register plugins
8. main.ts: Initialize Pinia stores (appInits, then local settings)
9. main.ts: Apply Markdown CSS to the DOM; slide CSS is injected during preview/output generation
10. main.ts: Mount the Vue application
11. Editor.vue: Initialize composables, Ace editor, locale, and file data
```

### 4.3 Rendering Pipeline

- `markdown` mode:
  - Converts regular Markdown into HTML using `marked + XSS + Mermaid`.
  - Local images are embedded as `data:` URLs in advance to keep preview / export / print behavior consistent.
  - Preview is rendered directly into the app DOM with `v-html`.
  - Scroll sync from editor to preview is enabled only when the toolbar toggle is ON.
- `slides` mode:
  - Enabled only when `marp: true` is found in the document frontmatter.
  - Generates HTML/CSS with `@marp-team/marp-core`, while Mermaid is pre-rendered into SVG.
  - Local images are embedded as `data:` URLs so they survive `srcdoc`, separate windows, and printing.
  - Preview is isolated in an iframe so slide CSS does not leak into the main app.
  - Scroll sync is disabled.

### 4.4 IPC Commands (Tauri Commands)

| Command | Input | Output | Description |
| ------- | ----- | ------ | ----------- |
| `request_launch_args` | none | `LaunchRequestData` | Fetch startup arguments, CSS, and initial file data |
| `read_file` | `target_file: String` | `ReadFileData` | Read a file |
| `save_file` | `save_path: String, markdown_text_data: String` | `StatusCode` | Save a file |
| `save_temp_html` | `html: String` | `String` | Save HTML to `~/.ageha/viewer_<ms>.html` and return its path |
| `delete_file` | `path: String` | none | Delete a specific file (temporary file cleanup) |
| `read_binary_file_data_url` | `target_file: String` | `String` | Convert a local image to a Base64 data URL |
| `spawn_self` | `args: Vec<String>` | none | Launch a new application instance |

### 4.5 Data Structures (Rust)

```rust
AppConfig {
    args_file_path: String,       // Launch argument file path
    css_file_path: String,        // Markdown CSS path
    slide_css_file_path: String,  // Slides CSS path
}

ApplicationInitSetup {
    css_file_path: String,
    slide_css_file_path: String,
    rust_log: String,             // Log level
}

StatusCode {
    status_code: u16,             // 200: success, 500: error
    message: String,
}

LaunchRequestData {
    status: StatusCode,
    file_abs_path: String,
    text_data: String,
    css_data: String,
    slide_css_data: String,
}

ReadFileData {
    status: StatusCode,
    file_abs_path: String,
    text_data: String,
}
```

### 4.6 Frontend Type Definitions

```ts
type AppLocale = "ja" | "en";
type DocumentMode = "markdown" | "slides";

interface LocalStorageItem {
  isShowToolsFromLocalStorage: boolean | null;
  isPreviewFromLocalStorage: boolean | null;
  isVimModeFromLocalStorage: boolean | null;
  localeFromLocalStorage: AppLocale | null;
}

interface SlideRenderResult {
  mode: "slides";
  html: string;
  css: string;
  metadata: {
    slideCount: number;
  };
}
```

- `DocumentMode` is derived from the document content each time and is not persisted.
- `AppLocale` / `localeFromLocalStorage` represent the selected UI language.
- `SlideRenderResult` is shared by preview, HTML export, separate window display, and printing.

### 4.7 Frontend Composable Design

Editor.vue is organized by responsibility using Vue 3 Composition API composables.

| Composable | File | Responsibility |
| ---------- | ---- | -------------- |
| `useAceEditor` | `composables/useAceEditor.ts` | Ace editor init/dispose, Vim mode switching, cursor operations, change watching |
| `useFileOperations` | `composables/useFileOperations.ts` | Open/save files, unsaved confirmation, file path management, change tracking |
| `useMarkdownPreview` | `composables/useMarkdownPreview.ts` | Document mode detection, render branch for Markdown/Slides, Mermaid rendering |
| `useExport` | `composables/useExport.ts` | Print/PDF, HTML export, viewer/slideshow windows |
| `useKeyboardShortcuts` | `composables/useKeyboardShortcuts.ts` | Register / remove shortcuts and action mapping |
| `useScrollSync` | `composables/useScrollSync.ts` | Editor-to-preview scroll synchronization (`markdown` mode only) |
| `useWindowSize` | `composables/useWindowSize.ts` | Window resize handling and editor height calculation |

### 4.8 Frontend Subcomponents

| Component | File | Responsibility |
| --------- | ---- | -------------- |
| `ToolbarButtons` | `components/ToolbarButtons.vue` | Toolbar buttons, document mode badge, language toggle |
| `MarkdownTools` | `components/MarkdownTools.vue` | Floating panel for Markdown writing assistance |
| `HelpModal` | `components/HelpModal.vue` | Help modal overlay (`@click.self` to close) |
| `MessageModal` | `components/MessageModal.vue` | Generic message modal |
| `Help` | `components/Help.vue` | Help content for Markdown / Slides, localized in Japanese and English |

---

## 5. State Management (Pinia Stores)

### 5.1 `useRustArgsInitStore` (`appInits.ts`)

**Purpose:** Holds startup data from the Rust backend.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `rustArgsData.file_abs_path` | `string` | Absolute path of the file to open |
| `rustArgsData.text_data` | `string` | File contents |
| `rustArgsData.css_data` | `string` | Markdown CSS |
| `rustArgsData.slide_css_data` | `string` | Slides CSS |
| `rustArgsData.status` | `number` | Status code |

**Actions:**

- `init()` — calls `request_launch_args` and stores the startup data
- `clear()` — resets the store to its default state

### 5.2 `useLocalStorageStore` (`localStorages.ts`)

**Purpose:** Persist user settings via Tauri plugin-store.

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `isPreviewFromLocalStorage` | `boolean` | `true` | Preview visible / hidden |
| `isShowToolsFromLocalStorage` | `boolean` | `true` | Markdown tools visible / hidden |
| `isScrollSyncFromLocalStorage` | `boolean` | `true` | Scroll sync enabled / disabled |
| `isVimModeFromLocalStorage` | `boolean` | `false` | Vim mode enabled / disabled |
| `localeFromLocalStorage` | `"ja" \| "en"` | `"ja"` | UI language |

**Features:**

- Auto-save with a 150 ms debounce
- Cross-window synchronization via `BroadcastChannel`
- Fallback handling for broken JSON
- `DocumentMode` (`markdown` / `slides`) is intentionally not stored

---

## 6. Functional Specification

### 6.1 Editor Features

| Item | Specification |
| ---- | ------------- |
| Editor engine | Ace Editor |
| Syntax mode | Markdown |
| Font size | 16px |
| Word wrap | Enabled |
| Print margin | Hidden |
| Vim mode | Toggleable (`Ctrl+,`) |
| Vim custom commands | `:w` (save), `:wq` (save and close) |

### 6.2 File Operations

| Action | Shortcut | Description |
| ------ | -------- | ----------- |
| Open file | `Ctrl+O` | `.md` / `.txt` file selection dialog |
| Save file | `Ctrl+S` | Save As for new files, overwrite for existing files |
| Insert image | `Ctrl+R` | Select an image file and insert Markdown syntax |
| Drag and drop | — | Open dropped `.md` / `.txt` files, insert dropped images |

**File associations:** `.md`, `.txt`  
**Window title:** shows the file path, with `*` appended if unsaved  
**Exit confirmation:** shows a confirmation dialog when unsaved changes exist

### 6.3 Real-Time Preview

| Item | Specification |
| ---- | ------------- |
| Mode detection | Switches to `slides` mode when `marp: true` is found in frontmatter |
| Markdown rendering | Marked.js (with custom extensions) |
| Slides rendering | HTML/CSS generation by `@marp-team/marp-core` |
| XSS protection | FilterXSS in `markdown` mode |
| Image handling | Resolves absolute/relative paths and converts local images to `data:` URLs for preview-related outputs |
| Layout | Split view between editor and preview (`50/50`) |
| Slides isolation | Preview rendered in an iframe during `slides` mode |
| Scroll sync | Editor → preview sync only when in `markdown` mode and the `Sync` toggle is ON |
| Toggle | Toolbar `Sync` button |

### 6.4 Slide Document Features

| Item | Specification |
| ---- | ------------- |
| Activation condition | Frontmatter at the top of the document contains `marp: true` |
| Separator | `---` |
| Renderer | Marp-compatible rendering via `@marp-team/marp-core` |
| Default theme | `ageha-slide` |
| Default size | `16:9` |
| Default math | `katex` |
| Preview | Isolated rendering inside an iframe |
| User CSS | Applies `~/.ageha/ageha-slide.css` after the built-in theme |
| HTML export | Outputs Marp-generated `html + css` as a single HTML document |
| Print / PDF | Opens slide HTML in a separate window and prints via the browser print dialog |
| Separate viewer | Displays slide HTML as-is in a `WebviewWindow` without an address bar |
| Slideshow | Fullscreen presentation mode showing one slide at a time |
| Supported extras | Mermaid, KaTeX math, absolute/relative image resolution |
| Out of scope for v1 | Ageha-specific block syntax such as `note`, `warning`, `details`, YouTube, and video |

- `theme`, `size`, and `math` are automatically set to `ageha-slide`, `16:9`, and `katex` even if omitted in frontmatter.
- There is no manual mode switch; document content is the single source of truth.
- `---` alone does not activate slide mode.
- `ageha-slide.css` is applied consistently to preview, viewer, HTML export, and print.

### 6.5 Custom Tokens for Marked.js

Ageha registers the following custom Marked.js tokens:

| Token | Syntax | Rendered output |
| ----- | ------ | --------------- |
| Video | `?[text](url)` | `<video>` |
| YouTube | `@[youtube](url)` | YouTube iframe embed (`youtube-nocookie.com`) |
| Details | `:::details Title\ncontent\n:::` | `<details>` / `<summary>` |
| Note | `:::note Title\ncontent\n:::` | Styled note box |
| Warning | `:::warning Title\ncontent\n:::` | Styled warning box |
| Inline math | `$...$` | KaTeX inline math |
| Block math | `$$...$$` | KaTeX block math |
| Page break | `@@@` | `<div class="pagebreak">` for printing |

**Renderer customizations:**

- **Headings:** assigns classes according to depth (`head1` to `head6`)
- **Links:** external links open in a new tab with `rel="noopener noreferrer"`
- **Code blocks:** Mermaid becomes `<pre class="mermaid">`; regular code gets a copy button
- **Images:** supports absolute/relative path resolution, width hints (`![alt](path =200)`), and local image embedding as `data:` URLs

### 6.6 Mermaid Diagrams

| Item | Specification |
| ---- | ------------- |
| Library | Mermaid.js v11.9.0 |
| Supported charts | Flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt, and more |
| Error handling | Graceful fallback for syntax errors |
| Re-render | `Ctrl+M` |
| Export behavior | Pre-converted to SVG |
| Slides support | `code.language-mermaid` is converted to SVG for preview / export / print |

### 6.7 KaTeX Math Rendering

| Item | Specification |
| ---- | ------------- |
| Library | KaTeX v0.16.22 |
| Inline math | `$...$` |
| Block math | `$$...$$` |
| Alignment | Left-aligned (`slides` mode uses Marp's KaTeX output) |
| Error handling | Falls back to text if rendering fails |

### 6.8 Code Blocks

| Item | Specification |
| ---- | ------------- |
| Highlighting | Prism.js (80+ languages) |
| Copy button | Automatically added to each code block |
| Copy confirmation | Tooltip message shown after copy |

### 6.9 Markdown Writing Tools

Displayed as a floating panel near the editor. Toggle with `Ctrl+Alt+I`.

Supported writing-assistance buttons include:

- Headings
- Bold, bulleted lists, numbered lists
- Tables and code blocks
- Horizontal rules, links, inline code
- Math
- Email (`mailto:`) and telephone (`tel:`)
- Details, note, warning
- Slide document starter (`marp: true`)

### 6.10 Export Features

#### PDF / Print (`Ctrl+Alt+P`)

- Uses the browser print dialog
- In `markdown` mode, Mermaid diagrams are pre-converted to SVG
- In `slides` mode, the slide HTML is printed as-is and OS / browser PDF saving is used
- Applies custom CSS (`ageha.css` for Markdown, `ageha-slide.css` for Slides)

#### HTML Export (`Ctrl+Alt+F`)

- Outputs a standalone HTML file
- `markdown` mode inlines CSS, Mermaid, and local image data URLs
- `slides` mode inlines Marp-generated HTML/CSS and local image data URLs
- Save destination is chosen through the file-save dialog

#### Separate Window Viewer (`Ctrl+Alt+W`)

- Displays the current preview in a Tauri `WebviewWindow` without an address bar
- Saves HTML temporarily to `~/.ageha/viewer_<ms>.html`; automatically deletes it when the window closes
- `markdown` mode uses standalone HTML with CSS, Mermaid, and KaTeX all inlined
- `slides` mode shows the same slide HTML used for preview

#### Slideshow (`Ctrl+Alt+S`)

- Available only in `slides` mode
- Opens a fullscreen presentation window showing one slide at a time
- Keyboard: `→` / `↓` / `Space` = next, `←` / `↑` = previous, `Home` / `End` = first / last
- Mouse: right half = next, left half = previous
- Bottom navigation UI appears on hover
- Fits the slide into the window using `transform: scale()`

### 6.11 New Window (`Ctrl+Alt+N`)

- Spawns a new instance of the current executable
- On Windows, hides the console using the `CREATE_NO_WINDOW` flag

### 6.12 Localization

| Item | Specification |
| ---- | ------------- |
| Supported UI languages | Japanese (`ja`), English (`en`) |
| Switch method | Toolbar button in the top-right area |
| Persistence | Stored in `settings.json` through Tauri Store |
| Covered text | Toolbar, modals, help, viewer HTML, print overlay, copy notifications |
| Default language | Japanese |

---

## 7. Keyboard Shortcuts

| Shortcut | Function |
| -------- | -------- |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save file |
| `Ctrl+R` | Insert image |
| `Ctrl+Alt+P` | Print / PDF output |
| `Ctrl+Alt+F` | Export HTML |
| `Ctrl+Alt+/` | Toggle preview |
| `Ctrl+Alt+I` | Toggle Markdown tools |
| `Ctrl+Alt+H` | Show help |
| `Ctrl+Alt+W` | Open in separate window |
| `Ctrl+Alt+N` | New window |
| `Ctrl+Alt+S` | Slideshow (slide mode only) |
| `Ctrl+,` | Toggle Vim mode |
| `Ctrl+M` | Re-render Mermaid |

---

## 8. User Settings

### 8.1 Configuration Files

| File | Path | Description |
| ---- | ---- | ----------- |
| `ageha.env.json` | `~/.ageha/ageha.env.json` | Application settings |
| `ageha.css` | `~/.ageha/ageha.css` | Custom stylesheet for Markdown |
| `ageha-slide.css` | `~/.ageha/ageha-slide.css` | Custom stylesheet for Slides |
| `viewer_<ms>.html` | `~/.ageha/viewer_<ms>.html` | Temporary viewer / slideshow file |
| `settings.json` | OS-specific data directory | User preferences persisted by Tauri Store |

### 8.2 `ageha.env.json`

```json
{
  "css_file_path": "~/.ageha/ageha.css",
  "slide_css_file_path": "~/.ageha/ageha-slide.css",
  "rust_log": "ageha=error"
}
```

| Property | Type | Description |
| -------- | ---- | ----------- |
| `css_file_path` | `string` | Path to the Markdown CSS file |
| `slide_css_file_path` | `string` | Path to the Slides CSS file |
| `rust_log` | `string` | Log level for `tracing` |

### 8.3 `ageha.css`

Custom stylesheet applied to Markdown preview and export. By default it includes:

- A4 paper sizing for printing
- GitHub Flavored Markdown styling
- Heading styles with borders
- Code block, table, and blockquote styling
- Mermaid error suppression
- Left-aligned KaTeX output

### 8.4 `ageha-slide.css`

Custom stylesheet dedicated to slide documents. A commented sample is generated by default so users can override selectors such as `section`, `section.lead`, `h1`, `img`, and `.mermaid-slide`.

---

## 9. Tauri Configuration

### 9.1 Window

| Item | Value |
| ---- | ----- |
| Title | `Ageha` |
| Initial size | `800 x 600 px` |

### 9.2 Security (CSP)

```text
script-src: 'self' 'unsafe-inline'
style-src:  'self' 'unsafe-inline'
img-src:    'self' data: blob: https: http:
font-src:   'self' data:
```

- Asset protocol: enabled with scope limited to `$HOME/**`

### 9.3 Bundle

| Item | Value |
| ---- | ----- |
| Installer | NSIS (Windows) |
| File associations | `.md`, `.txt` |
| Icons | `32x32`, `128x128`, `128x128@2x`, `.ico` |

---

## 10. Security

| Measure | Implementation |
| ------- | -------------- |
| XSS filtering | FilterXSS custom whitelist |
| CSP header | Restricted script/style/img/font sources |
| YouTube embed validation | URL pattern validation + 11-character video ID validation |
| Asset protocol | Scoped to the user home directory |
| File path resolution | Absolute path conversion and traversal prevention |
| Tauri sandbox | Enabled by default |

---

## 11. Build and Development

### 11.1 Development Commands

```bash
npm install         # Install dependencies
npm run dev         # Start Vite dev server (localhost:1420)
npm run tauri dev   # Start Tauri development mode
npm run build       # Production build (TypeScript check + Vite)
npm run tauri build # Create bundled application
npm run format      # Format code with Prettier
```

### 11.2 Vite Configuration

| Item | Value |
| ---- | ----- |
| Entry point | `./src/main.ts` |
| Alias | `@` → `./src` |
| Dev server port | `1420` |
| HMR port | `1421` |
| Global constant | `__APP_VERSION__` (from `package.json`) |

### 11.3 Coding Conventions

| Tool | Configuration |
| ---- | ------------- |
| TypeScript | `strict` mode, errors for unused variables / arguments |
| ESLint | Vue 3 essential + TypeScript support |
| Prettier | width 100, 2 spaces, semicolons enabled, double quotes |

---

## 12. UI Layout

```text
┌──────────────────────────────────────────────────────────┐
│ Header: "Ageha Editor" (double-click to show version)    │
├──────────────────────────────────────────────────────────┤
│ Toolbar: [Open][Save][Image][Print][HTML]                │
│          [Preview][Tools][Vim][Help][New]                │
│                                 [Mode Badge][JA/EN]      │
├──────────────────┬───────────────────────────────────────┤
│ Markdown tools   │                                       │
│ (toggleable)     │                                       │
├──────────────────┤                                       │
│                  │                                       │
│  Ace editor      │  Preview panel                        │
│                  │  (Markdown: direct HTML render /      │
│                  │   Slides: iframe render)              │
│      50%         │              50%                      │
└──────────────────┴───────────────────────────────────────┘
```

- When preview is hidden, the editor expands to full width.
- Markdown tools appear as a floating panel.
- The current document mode badge is fixed in the top-right area.
- The language button sits beside the mode badge / toolbar controls.

### Theme Colors

| Element | Color code |
| ------- | ---------- |
| Background | `#2e2e2e` |
| Header text | `#f0f0f0` |
| Button background | `#5f5f5f` |
| Accent | `#396cd8` |
| Link | `#1431af` |

---

## 13. Release History (Major Milestones)

| Version | Description |
| ------- | ----------- |
| v0.3.0 | English UI support, persisted locale setting, localized help and output text, and a scroll sync toggle |
| v0.1.0 | Release preparation and Marp-compatible slide authoring |
| v0.0.27 | YouTube embed fixes and new input buttons |
| v0.0.24 | YouTube embed, HTML export, CSS customization |
| v0.0.23 | Copy button for code blocks |
| v0.0.20 | PDF print output |
| v0.0.17 | Tauri Store plugin and viewer window |
| v0.0.8 | KaTeX math support |
| v0.0.7 | Mermaid diagram support |
| v0.0.1 | Initial release |
