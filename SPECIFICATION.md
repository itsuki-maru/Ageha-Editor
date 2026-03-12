# Ageha Editor 仕様書

**プロダクト名:** Ageha Editor
**バージョン:** 0.1.0
**識別子:** com.ageha.app
**技術スタック:** Tauri v2 + Vue 3 + TypeScript (フロントエンド) / Rust (バックエンド)
**対象OS:** Windows / macOS / Linux

---

## 1. アプリケーション概要

Ageha Editor は、Tauri フレームワークを用いて構築されたデスクトップ向けマークダウンエディタである。リアルタイムプレビュー、PDF/HTML エクスポート、Mermaid ダイアグラム、KaTeX 数式レンダリングに加え、文書先頭の frontmatter に `marp: true` を記述したスライド文書の作成・表示・出力機能を備える。

---

## 2. プロジェクト構成

```
Ageha-Editor/
├── src/                              # Vue3 フロントエンド
│   ├── App.vue                       # ルートコンポーネント
│   ├── Editor.vue                    # メインエディタコンポーネント (オーケストレータ)
│   ├── main.ts                       # エントリポイント
│   ├── interface.ts                  # TypeScript 型定義
│   ├── constants.ts                  # 定数定義 (拡張子、UI設定値)
│   ├── style.css                     # グローバルスタイル
│   ├── github.css                    # GitHub Flavored Markdown スタイル
│   ├── composables/                  # Vue Composition API フック
│   │   ├── useAceEditor.ts          # Ace エディタ管理
│   │   ├── useFileOperations.ts     # ファイル操作
│   │   ├── useMarkdownPreview.ts    # Markdown/Slides プレビュー描画
│   │   ├── useExport.ts             # 印刷/HTML/ビューア出力
│   │   ├── useKeyboardShortcuts.ts  # ショートカット管理
│   │   ├── useScrollSync.ts         # Markdown プレビューのスクロール同期
│   │   └── useWindowSize.ts         # ウィンドウサイズ管理
│   ├── components/
│   │   ├── Help.vue                  # ヘルプ・ドキュメントコンポーネント
│   │   ├── HelpModal.vue            # ヘルプモーダルラッパー
│   │   ├── ToolbarButtons.vue       # ツールバーボタン群 / 文書モード表示
│   │   ├── MarkdownTools.vue        # マークダウン入力支援パネル
│   │   └── MessageModal.vue         # メッセージモーダル
│   ├── stores/
│   │   ├── appInits.ts              # アプリ初期化 Pinia ストア
│   │   └── localStorages.ts         # ローカルストレージ Pinia ストア
│   └── utils/
│       ├── assetPaths.ts            # 相対パス画像の共通解決
│       ├── documentMode.ts          # frontmatter による文書モード判定
│       ├── markedSetup.ts           # Marked.js カスタムレンダラ
│       ├── htmlTemplate.ts          # HTMLテンプレート生成
│       ├── slideRenderer.ts         # Marp ベースのスライドレンダラ
│       ├── slideTheme.ts            # Ageha 固定スライドテーマ
│       └── clipboard.ts            # コピー・ツールチップユーティリティ
│
├── src-tauri/                        # Rust バックエンド
│   ├── src/
│   │   ├── main.rs                  # アプリケーションエントリポイント
│   │   ├── lib.rs                   # ライブラリルート (Tauri セットアップ)
│   │   ├── init.rs                  # 初期化処理
│   │   ├── config.rs                # 設定構造体 (Tauri State)
│   │   ├── schema.rs                # データ構造体定義
│   │   ├── utils.rs                 # ユーティリティ関数
│   │   └── handler/
│   │       ├── mod.rs               # ハンドラモジュールルート
│   │       ├── file.rs              # ファイル I/O コマンド
│   │       └── spawn_self.rs        # プロセス生成
│   ├── Cargo.toml                   # Rust 依存関係
│   ├── tauri.conf.json              # Tauri 設定
│   └── capabilities/
│       └── default.json             # セキュリティ権限設定
│
├── public/                           # 静的アセット
│   ├── ageha.svg                    # アプリアイコン
│   ├── katex.css                    # KaTeX スタイルシート
│   └── preview.js                   # プレビューウィンドウスクリプト
│
├── index.html                        # HTML エントリポイント
├── package.json                      # NPM 依存関係
└── vite.config.ts                    # Vite 設定
```

---

## 3. 技術依存関係

### 3.1 フロントエンド (package.json)

| パッケージ                           | バージョン | 用途                         |
| ------------------------------------ | ---------- | ---------------------------- |
| `vue`                                | ^3.5.13    | UI フレームワーク            |
| `pinia`                              | ^2.1.7     | 状態管理                     |
| `@marp-team/marp-core`               | ^4.3.0     | スライド (Marp) レンダリング |
| `@tauri-apps/api`                    | ^2         | Tauri コア API               |
| `@tauri-apps/plugin-dialog`          | ^2.3.0     | ファイルダイアログ           |
| `@tauri-apps/plugin-fs`              | ^2.4.0     | ファイルシステム操作         |
| `@tauri-apps/plugin-global-shortcut` | ^2.3.0     | グローバルショートカット     |
| `@tauri-apps/plugin-opener`          | ^2         | ファイル/URLオープナー       |
| `@tauri-apps/plugin-store`           | ^2.3.0     | 永続ストレージ               |
| `ace-builds`                         | ^1.24.0    | コードエディタ               |
| `marked`                             | ^13.0.3    | Markdown パーサ              |
| `mermaid`                            | ^11.9.0    | ダイアグラムレンダリング     |
| `katex`                              | ^0.16.22   | 数式レンダリング             |
| `prismjs`                            | ^1.30.0    | コードシンタックスハイライト |
| `xss`                                | ^1.0.14    | XSS サニタイズ               |

### 3.2 バックエンド (Cargo.toml)

| クレート                         | バージョン  | 用途                                                      |
| -------------------------------- | ----------- | --------------------------------------------------------- |
| `tauri`                          | ^2          | アプリケーションフレームワーク (protocol-asset, devtools) |
| `tauri-plugin-opener`            | ^2          | ファイルオープン                                          |
| `tauri-plugin-dialog`            | ^2          | ダイアログ                                                |
| `tauri-plugin-store`             | ^2          | 永続ストレージ                                            |
| `serde` / `serde_json`           | ^1          | シリアライズ / デシリアライズ                             |
| `anyhow`                         | ^1.0        | エラーハンドリング                                        |
| `dirs`                           | ^5.0        | ホームディレクトリ解決                                    |
| `once_cell`                      | ^1.20.3     | 遅延初期化シングルトン (現在未使用、将来削除候補)         |
| `tracing` / `tracing-subscriber` | ^0.1 / ^0.3 | ロギング                                                  |

### 3.3 Rust Edition / ビルド最適化

- **Edition:** 2024
- **リリースプロファイル:** LTO 有効、strip 有効、codegen-units=1、panic=abort

---

## 4. アーキテクチャ

### 4.1 全体構成

```
┌──────────────────────────────────────────────────────────┐
│                       Tauri Shell                         │
│  ┌──────────────────────────────┐  ┌──────────────────┐  │
│  │     Vue3 フロントエンド         │  │  Rust バックエンド  │  │
│  │                              │  │                  │  │
│  │  App.vue                     │  │  main.rs         │  │
│  │   └─ Editor.vue              │◄─►  lib.rs          │  │
│  │       ├─ ToolbarButtons.vue  │IPC│  handler/        │  │
│  │       ├─ MarkdownTools.vue   │  │   ├─ file.rs     │  │
│  │       ├─ HelpModal.vue       │  │   └─ spawn.rs    │  │
│  │       └─ MessageModal.vue    │  │  config.rs       │  │
│  │                              │  │  schema.rs       │  │
│  │  Composables                 │  │  utils.rs        │  │
│  │   ├─ useAceEditor.ts        │  │  init.rs         │  │
│  │   ├─ useFileOperations.ts   │  │                  │  │
│  │   ├─ useMarkdownPreview.ts  │  └──────────────────┘  │
│  │   ├─ useExport.ts          │                         │
│  │   ├─ useKeyboardShortcuts.ts│                         │
│  │   ├─ useScrollSync.ts      │                         │
│  │   └─ useWindowSize.ts      │                         │
│  │                              │                         │
│  │  Pinia Stores                │                         │
│  │   ├─ appInits.ts            │                         │
│  │   └─ localStorages.ts       │                         │
│  │                              │                         │
│  │  Utils                       │                         │
│  │   ├─ assetPaths.ts          │                         │
│  │   ├─ documentMode.ts        │                         │
│  │   ├─ markedSetup.ts         │                         │
│  │   ├─ htmlTemplate.ts        │                         │
│  │   ├─ slideRenderer.ts       │                         │
│  │   ├─ slideTheme.ts          │                         │
│  │   └─ clipboard.ts           │                         │
│  └──────────────────────────────┘                         │
│                                                           │
│  ┌──────────────────────────────────────────┐             │
│  │           ユーザー設定 (~/.ageha/)          │             │
│  │  ├─ ageha.env.json   (アプリ設定)          │             │
│  │  └─ ageha.css        (カスタムCSS)         │             │
│  └──────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────┘
```

### 4.2 起動シーケンス

```
1. main.rs: ~/.ageha/ ディレクトリ作成/確認
2. main.rs: ageha.env.json 読込/作成
3. main.rs: ageha.css が存在しない場合はデフォルト生成
4. main.rs: コマンドライン引数解析
5. main.rs: tracing ロガー初期化
6. main.rs: lib::run() に設定パス (args_file_path, css_file_path) を直接渡す
7. lib.rs: AppConfig を Tauri State として登録、プラグイン登録
8. main.ts: Pinia ストア初期化 (appInits → Rust から起動引数取得)
9. main.ts: CSS データを DOM に適用
10. main.ts: Vue アプリケーションマウント
11. Editor.vue: Composable 群初期化、Ace エディタ初期化、ファイルデータ反映
```

### 4.3 描画パイプライン

- `markdown` モード:
  - `marked + XSS + Mermaid` により通常のマークダウン文書を HTML 化する。
  - プレビューはアプリ DOM 上に `v-html` で直接描画する。
  - エディタからプレビューへのスクロール同期が有効である。
- `slides` モード:
  - 文書先頭 frontmatter の `marp: true` を検出した場合のみ有効化する。
  - `@marp-team/marp-core` により HTML/CSS を生成し、Mermaid は SVG へ事前変換する。
  - プレビューは iframe に分離して描画し、スライド用 CSS がアプリ本体へ漏れないようにする。
  - スクロール同期は無効化する。

### 4.4 IPC コマンド (Tauri Commands)

| コマンド名            | 入力                                            | 出力                | 説明                                |
| --------------------- | ----------------------------------------------- | ------------------- | ----------------------------------- |
| `request_launch_args` | なし (内部で `AppConfig` State を参照)          | `LaunchRequestData` | 起動時引数・CSS・ファイルデータ取得 |
| `read_file`           | `target_file: String`                           | `ReadFileData`      | ファイル読込                        |
| `save_file`           | `save_path: String, markdown_text_data: String` | `StatusCode`        | ファイル保存                        |
| `spawn_self`          | `args: Vec<String>`                             | なし                | 新規インスタンス起動                |

### 4.5 データ構造体 (Rust)

```rust
AppConfig {                    // Tauri State として管理
    args_file_path: String,    // 起動引数のファイルパス
    css_file_path: String,     // CSS ファイルパス
}

ApplicationInitSetup {
    css_file_path: String,     // CSS ファイルパス
    rust_log: String,          // ログレベル設定
}

StatusCode {
    status_code: u16,          // 200: 成功, 500: エラー
    message: String,           // メッセージ
    // ヘルパー: ok(msg), error(msg)
}

LaunchRequestData {
    status: StatusCode,        // ステータス
    file_abs_path: String,     // ファイル絶対パス
    text_data: String,         // ファイル内容
    css_data: String,          // CSS データ
    // ヘルパー: error(msg, css_data)
}

ReadFileData {
    status: StatusCode,        // ステータス
    file_abs_path: String,     // 絶対パス
    text_data: String,         // ファイル内容
    // ヘルパー: error(msg)
}
```

### 4.6 フロントエンド型定義

```ts
type DocumentMode = "markdown" | "slides";

interface SlideRenderResult {
  mode: "slides";
  html: string;
  css: string;
  metadata: {
    slideCount: number;
  };
}
```

- `DocumentMode` は文書内容から毎回導出される表示モードであり、ローカルストレージへ永続化しない。
- `SlideRenderResult` はスライド描画結果を表し、プレビュー・HTML 出力・別ウィンドウ表示・印刷で共通利用する。

### 4.7 フロントエンド Composable 設計

Editor.vue は Vue 3 Composition API の Composable パターンにより責務分割されている。

| Composable             | ファイル                              | 責務                                                                  |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `useAceEditor`         | `composables/useAceEditor.ts`         | Ace エディタの初期化・破棄、Vim モード切替、カーソル操作、変更監視    |
| `useFileOperations`    | `composables/useFileOperations.ts`    | ファイル開く/保存、未保存確認、ファイルパス管理、変更追跡             |
| `useMarkdownPreview`   | `composables/useMarkdownPreview.ts`   | 文書モード判定、Markdown/Slides の描画分岐、Mermaid 描画             |
| `useExport`            | `composables/useExport.ts`            | 印刷/PDF出力、HTMLエクスポート、ビューアウィンドウ起動                |
| `useKeyboardShortcuts` | `composables/useKeyboardShortcuts.ts` | キーボードショートカットの登録・解除・アクションマッピング            |
| `useScrollSync`        | `composables/useScrollSync.ts`        | エディタ→プレビュー方向のスクロール同期 (`markdown` モード時のみ)     |
| `useWindowSize`        | `composables/useWindowSize.ts`        | ウィンドウリサイズ監視、エディタ高さ算出                              |

### 4.8 フロントエンド サブコンポーネント

| コンポーネント   | ファイル                        | 責務                                                      |
| ---------------- | ------------------------------- | --------------------------------------------------------- |
| `ToolbarButtons` | `components/ToolbarButtons.vue` | ファイル操作・プレビュー切替等のツールバーボタン群、文書モードバッジ |
| `MarkdownTools`  | `components/MarkdownTools.vue`  | マークダウン記号入力支援フローティングパネル              |
| `HelpModal`      | `components/HelpModal.vue`      | ヘルプモーダルのオーバーレイ表示 (`@click.self` で閉じる) |
| `MessageModal`   | `components/MessageModal.vue`   | 汎用メッセージモーダル                                    |
| `Help`           | `components/Help.vue`           | ヘルプコンテンツ本体 (Markdown / Slides 記法の解説)       |

---

## 5. 状態管理 (Pinia Stores)

### 5.1 useRustArgsInitStore (appInits.ts)

**目的:** Rust バックエンドからの起動データを保持する。

| プロパティ                   | 型       | 説明                   |
| ---------------------------- | -------- | ---------------------- |
| `rustArgsData.file_abs_path` | `string` | 開くファイルの絶対パス |
| `rustArgsData.text_data`     | `string` | ファイルの内容         |
| `rustArgsData.css_data`      | `string` | カスタム CSS           |
| `rustArgsData.status`        | `number` | ステータスコード       |

**アクション:**

- `init()` — `request_launch_args` コマンドを呼び出し、起動データを取得
- `clear()` — ストアを初期状態にリセット

### 5.2 useLocalStorageStore (localStorages.ts)

**目的:** ユーザー設定の永続化 (Tauri plugin-store 経由)。

| プロパティ                    | 型        | デフォルト | 説明                          |
| ----------------------------- | --------- | ---------- | ----------------------------- |
| `isPreviewFromLocalStorage`   | `boolean` | `true`     | プレビュー表示/非表示         |
| `isShowToolsFromLocalStorage` | `boolean` | `true`     | マークダウンツール表示/非表示 |
| `isVimModeFromLocalStorage`   | `boolean` | `false`    | Vim モード有効/無効           |

**機能:**

- 150ms デバウンスによる自動保存
- `BroadcastChannel` によるウィンドウ間同期
- JSON 破損時のフォールバック処理
- 文書モード (`markdown` / `slides`) は保存しない

---

## 6. 機能仕様

### 6.1 エディタ機能

| 項目                 | 仕様                                |
| -------------------- | ----------------------------------- |
| エディタエンジン     | Ace Editor                          |
| シンタックスモード   | Markdown                            |
| フォントサイズ       | 16px                                |
| 折り返し             | 有効                                |
| 印刷マージン         | 非表示                              |
| Vim モード           | トグル可 (Ctrl+,)                   |
| Vim カスタムコマンド | `:w` (保存), `:wq` (保存して閉じる) |

### 6.2 ファイル操作

| 操作              | ショートカット | 説明                                                    |
| ----------------- | -------------- | ------------------------------------------------------- |
| ファイルを開く    | `Ctrl+O`       | .md / .txt ファイル選択ダイアログ                       |
| ファイル保存      | `Ctrl+S`       | 新規時は名前を付けて保存、既存時は上書き                |
| 画像挿入          | `Ctrl+R`       | 画像ファイル選択 → マークダウン記法挿入                 |
| ドラッグ&ドロップ | —              | .md/.txt ファイルのドロップで開く、画像のドロップで挿入 |

**ファイル関連付け:** `.md`, `.txt`

**ウィンドウタイトル:** ファイルパスを表示、未保存時は `*` を付加

**終了確認:** 未保存変更がある場合、確認ダイアログを表示

### 6.3 リアルタイムプレビュー

| 項目           | 仕様                                                                  |
| -------------- | --------------------------------------------------------------------- |
| モード判定     | 文書先頭 frontmatter の `marp: true` により `slides` モードへ切替     |
| Markdown 描画  | Marked.js (カスタム拡張あり)                                          |
| Slides 描画    | `@marp-team/marp-core` による HTML/CSS 生成                           |
| XSS 対策       | `markdown` モード時に FilterXSS ライブラリを適用                      |
| レイアウト     | エディタとプレビューの分割表示 (50/50)                                |
| Slides 分離    | `slides` モード時は iframe にプレビューを分離                         |
| スクロール同期 | エディタ → プレビュー方向の同期 (`markdown` モード時のみ)             |
| トグル         | `Ctrl+Alt+/`                                                          |

### 6.4 スライド文書機能

| 項目             | 仕様                                                                           |
| ---------------- | ------------------------------------------------------------------------------ |
| 起動条件         | 文書先頭 frontmatter に `marp: true` を含むこと                                |
| 区切り           | `---`                                                                          |
| レンダラ         | Marp 互換描画 (`@marp-team/marp-core`)                                         |
| 既定テーマ       | `ageha-slide`                                                                  |
| 既定サイズ       | `16:9`                                                                         |
| math 設定        | `katex` に固定                                                                 |
| プレビュー       | iframe 内に独立描画                                                            |
| HTML 出力        | Marp の `html + css` を単一 HTML として出力                                    |
| 印刷 / PDF       | スライド用 HTML を別ウィンドウで開き、ブラウザ印刷ダイアログ経由で出力         |
| 別ウィンドウ表示 | スライド用 HTML をそのまま表示                                                 |
| 対応する追加機能 | Mermaid、KaTeX 数式、相対画像パス解決                                          |
| v1 の対象外      | Ageha 独自 block 記法 (`note` / `warning` / `details` / YouTube / video など) |

- `theme`、`size`、`math` は frontmatter 内に未指定でも `ageha-slide` / `16:9` / `katex` を適用する。
- 手動のモード切替は提供しない。モードは文書内容を唯一の真実とする。
- `---` のみではスライドモードに移行しない。

### 6.5 Marked.js カスタムトークン

Marked.js に以下のカスタムトークンを拡張登録している。

| トークン          | 記法                             | レンダリング結果                           |
| ----------------- | -------------------------------- | ------------------------------------------ |
| 動画              | `?[text](url)`                   | `<video>` タグ                             |
| YouTube           | `@[youtube](url)`                | YouTube iframe 埋込 (youtube-nocookie.com) |
| 折りたたみ        | `:::details タイトル\n内容\n:::` | `<details>` / `<summary>`                  |
| ノート            | `:::note タイトル\n内容\n:::`    | スタイル付きノートボックス                 |
| 警告              | `:::warning タイトル\n内容\n:::` | スタイル付き警告ボックス                   |
| 数式 (インライン) | `$...$`                          | KaTeX インライン数式                       |
| 数式 (ブロック)   | `$$...$$`                        | KaTeX ブロック数式                         |
| 改ページ          | `@@@`                            | `<div class="pagebreak">` (印刷用)         |

**レンダラカスタマイズ:**

- **見出し:** 深さに応じたクラス付与 (head1〜head6)
- **リンク:** 外部リンクは新規タブで開く (`rel="noopener noreferrer"`)
- **コードブロック:** Mermaid は `<pre class="mermaid">`、通常コードはコピーボタン付き
- **画像:** 相対パスの絶対パス変換、幅指定サポート (`![alt](path =200)`)

注記:

- 本節の拡張は `markdown` モード向けである。
- `slides` モードでは Marp ベースの標準 Markdown 記法を優先し、Ageha 独自 block 記法は v1 対象外とする。

### 6.6 Mermaid ダイアグラム

| 項目           | 仕様                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| ライブラリ     | Mermaid.js v11.9.0                                                          |
| 対応チャート   | フローチャート、シーケンス図、クラス図、状態遷移図、ER図、ガントチャート 他 |
| エラー処理     | シンタックスエラー時のグレースフルフォールバック                            |
| 再描画         | `Ctrl+M`                                                                    |
| エクスポート時 | SVG に事前変換                                                              |
| Slides 対応    | `code.language-mermaid` を SVG へ変換して preview / export / print に反映   |

### 6.7 KaTeX 数式レンダリング

| 項目               | 仕様                                         |
| ------------------ | -------------------------------------------- |
| ライブラリ         | KaTeX v0.16.22                               |
| インライン数式     | `$...$`                                      |
| ブロック数式       | `$$...$$`                                    |
| 配置               | 左揃え (`slides` モードでは Marp の KaTeX 出力を利用) |
| エラーハンドリング | レンダリング失敗時はテキストにフォールバック |

### 6.8 コードブロック

| 項目         | 仕様                                 |
| ------------ | ------------------------------------ |
| ハイライト   | Prism.js (80+ 言語対応)              |
| コピーボタン | 各コードブロックに自動付与           |
| コピー確認   | ツールチップで「コピーしました」表示 |

### 6.9 マークダウン入力ツール

エディタ上部にフローティングパネルとして表示。トグル: `Ctrl+Alt+I`

対応する入力補助ボタン:

- 見出し (H1〜H6)
- 太字、リスト (箇条書き・番号付き)
- テーブル、コードブロック
- 水平線、リンク、画像
- 数式 (インライン・ブロック)
- メール (`mailto:`)、電話 (`tel:`)
- 折りたたみ (details)、ノート、警告
- Mermaid ダイアグラム (フローチャート・シーケンス図)
- 動画、YouTube
- 改ページ

注記:

- 入力支援パネルは Markdown 記法の補助を主対象とする。
- スライド作成時も使用できるが、Ageha 独自 block 記法が `slides` モードでサポートされることを意味しない。

### 6.10 エクスポート機能

#### PDF / 印刷 (`Ctrl+Alt+P`)

- ブラウザの印刷ダイアログを利用
- `markdown` モードでは Mermaid ダイアグラムを事前に SVG 変換
- `slides` モードではスライド用 HTML をそのまま印刷し、OS / ブラウザの PDF 保存を利用
- カスタム CSS を適用 (`markdown` モード)
- ウィンドウスケーリング対応

#### HTML エクスポート (`Ctrl+Alt+F`)

- スタンドアロン HTML ファイルとして出力
- `markdown` モードでは CSS・Mermaid をインラインで埋込
- `slides` モードでは Marp 生成済みの HTML/CSS を単一 HTML に埋込
- ファイル保存ダイアログで保存先指定

#### 別ウィンドウ表示 (`Ctrl+Alt+W`)

- 現在のプレビュー内容を別ウィンドウで表示
- `slides` モードではスライド用 HTML をそのまま表示

### 6.11 新規ウィンドウ (`Ctrl+Alt+N`)

- 現在の実行ファイルの新規インスタンスを生成
- Windows: `CREATE_NO_WINDOW` フラグでコンソール非表示

---

## 7. キーボードショートカット一覧

| ショートカット | 機能                         |
| -------------- | ---------------------------- |
| `Ctrl+O`       | ファイルを開く               |
| `Ctrl+S`       | ファイル保存                 |
| `Ctrl+R`       | 画像挿入                     |
| `Ctrl+Alt+P`   | 印刷 / PDF 出力              |
| `Ctrl+Alt+F`   | HTML エクスポート            |
| `Ctrl+Alt+/`   | プレビュー表示トグル         |
| `Ctrl+Alt+I`   | マークダウンツール表示トグル |
| `Ctrl+Alt+H`   | ヘルプ表示                   |
| `Ctrl+Alt+W`   | 別ウィンドウ表示             |
| `Ctrl+Alt+N`   | 新規ウィンドウ               |
| `Ctrl+,`       | Vim モードトグル             |
| `Ctrl+M`       | Mermaid 再描画               |

---

## 8. ユーザー設定

### 8.1 設定ファイル

| ファイル         | パス                       | 説明                       |
| ---------------- | -------------------------- | -------------------------- |
| `ageha.env.json` | `~/.ageha/ageha.env.json`  | アプリケーション設定       |
| `ageha.css`      | `~/.ageha/ageha.css`       | カスタムスタイルシート     |
| `settings.json`  | OS固有のデータディレクトリ | ユーザー設定 (Tauri Store) |

### 8.2 ageha.env.json

```json
{
  "css_file_path": "~/.ageha/ageha.css",
  "rust_log": "ageha=error"
}
```

| プロパティ      | 型       | 説明                        |
| --------------- | -------- | --------------------------- |
| `css_file_path` | `string` | カスタム CSS ファイルのパス |
| `rust_log`      | `string` | ログレベル設定 (tracing)    |

### 8.3 ageha.css

プレビュー・エクスポートに適用されるカスタムスタイルシート。デフォルトで以下を含む:

- A4 用紙サイズ (印刷時)
- GitHub Flavored Markdown スタイリング
- 見出しスタイル (ボーダー付き)
- コードブロック・テーブル・引用スタイル
- Mermaid エラー抑制
- KaTeX 左揃え配置

注記:

- `ageha.css` は通常 Markdown のプレビュー / 出力へ適用される。
- `slides` モードでは Marp のテーマ CSS (`ageha-slide`) を優先し、プレビューは iframe 分離する。

---

## 9. Tauri 設定

### 9.1 ウィンドウ

| 項目       | 値           |
| ---------- | ------------ |
| タイトル   | "Ageha"      |
| 初期サイズ | 800 x 600 px |

### 9.2 セキュリティ (CSP)

```
script-src: 'self' 'unsafe-inline'
style-src:  'self' 'unsafe-inline'
img-src:    'self' data: blob:
font-src:   'self' data:
```

- アセットプロトコル: 有効 (スコープ: `$HOME/**`)

### 9.3 バンドル

| 項目             | 値                               |
| ---------------- | -------------------------------- |
| インストーラ     | NSIS (Windows, 日本語)           |
| ファイル関連付け | `.md`, `.txt`                    |
| アイコン         | 32x32, 128x128, 128x128@2x, .ico |

---

## 10. セキュリティ

| 対策                 | 実装                                       |
| -------------------- | ------------------------------------------ |
| XSS フィルタリング   | FilterXSS カスタムホワイトリスト           |
| CSP ヘッダー         | script/style/img/font ソース制限           |
| YouTube 埋込検証     | URL パターン検証 + 11文字の動画ID検証      |
| アセットプロトコル   | ホームディレクトリにスコープ限定           |
| ファイルパス解決     | 絶対パス変換、ディレクトリトラバーサル防止 |
| Tauri サンドボックス | デフォルト有効                             |

---

## 11. ビルド・開発

### 11.1 開発コマンド

```bash
npm install              # 依存関係インストール
npm run dev              # 開発サーバー起動 (localhost:1420)
npm run tauri dev        # Tauri 開発モード起動
npm run build            # プロダクションビルド (TypeScript チェック + Vite)
npm run tauri build      # アプリバンドル作成
npm run format           # Prettier でコードフォーマット
```

### 11.2 Vite 設定

| 項目               | 値                                        |
| ------------------ | ----------------------------------------- |
| エントリポイント   | `./src/main.ts`                           |
| エイリアス         | `@` → `./src`                             |
| 開発サーバーポート | 1420                                      |
| HMR ポート         | 1421                                      |
| グローバル定数     | `__APP_VERSION__` (package.json から取得) |

### 11.3 コード規約

| ツール     | 設定                                                 |
| ---------- | ---------------------------------------------------- |
| TypeScript | strict モード、未使用変数/引数エラー                 |
| ESLint     | Vue3 essential + TypeScript 対応                     |
| Prettier   | 幅100文字、2スペース、セミコロンあり、ダブルクォート |

---

## 12. UI レイアウト

```
┌──────────────────────────────────────────────┐
│  ヘッダー: "Ageha Editor" (ダブルクリックでバージョン表示) │
├──────────────────────────────────────────────┤
│  ツールバー: [Mode][開く][保存][画像][印刷][HTML] │
│             [プレビュー][ツール][Vim][Help][新規]  │
├──────────────────┬───────────────────────────┤
│  マークダウンツール  │                           │
│  (トグル表示)      │                           │
├──────────────────┤                           │
│                  │                           │
│   Ace エディタ     │    プレビューパネル          │
│                  │    (Markdown: HTML直描画 /    │
│                  │     Slides: iframe描画)       │
│   (50%)          │    (50%)                  │
│                  │                           │
│                  │                           │
└──────────────────┴───────────────────────────┘
```

- プレビュー非表示時はエディタが全幅に拡張
- マークダウンツールはフローティングパネル
- ツールバー左端に現在の文書モードを示すバッジを表示する

### テーマカラー

| 要素             | カラーコード |
| ---------------- | ------------ |
| 背景             | `#2e2e2e`    |
| ヘッダーテキスト | `#f0f0f0`    |
| ボタン背景       | `#5f5f5f`    |
| アクセント       | `#396cd8`    |
| リンク           | `#1431af`    |

---

## 13. リリース履歴 (主要マイルストーン)

| バージョン | 内容                                              |
| ---------- | ------------------------------------------------- |
| v0.1.0     | 正式リリース準備、Marp 互換スライド作成機能追加   |
| v0.0.27    | YouTube 埋込修正、新規入力ボタン追加              |
| v0.0.24    | YouTube 埋込、HTML エクスポート、CSS カスタマイズ |
| v0.0.23    | コードブロックコピーボタン                        |
| v0.0.20    | PDF 印刷出力                                      |
| v0.0.17    | Tauri Store プラグイン、ビューワーウィンドウ      |
| v0.0.8     | KaTeX 数式サポート                                |
| v0.0.7     | Mermaid ダイアグラムサポート                      |
| v0.0.1     | 初期リリース                                      |
