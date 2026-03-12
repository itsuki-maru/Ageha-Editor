# Ageha Editor 仕様書

**プロダクト名:** Ageha Editor
**バージョン:** 0.1.0
**識別子:** com.ageha.app
**技術スタック:** Tauri v2 + Vue 3 + TypeScript (フロントエンド) / Rust (バックエンド)
**対象OS:** Windows / macOS / Linux

---

## 1. アプリケーション概要

Ageha Editor は、Tauri フレームワークを用いて構築されたデスクトップ向けマークダウンエディタである。リアルタイムプレビュー、PDF/HTML エクスポート、Mermaid ダイアグラム、KaTeX 数式レンダリングなどを備える。

---

## 2. プロジェクト構成

```
Ageha-Editor/
├── src/                              # Vue3 フロントエンド
│   ├── App.vue                       # ルートコンポーネント
│   ├── Editor.vue                    # メインエディタコンポーネント
│   ├── main.ts                       # エントリポイント
│   ├── interface.ts                  # TypeScript 型定義
│   ├── style.css                     # グローバルスタイル
│   ├── github.css                    # GitHub Flavored Markdown スタイル
│   ├── components/
│   │   └── Help.vue                  # ヘルプ・ドキュメントコンポーネント
│   ├── stores/
│   │   ├── appInits.ts              # アプリ初期化 Pinia ストア
│   │   └── localStorages.ts         # ローカルストレージ Pinia ストア
│   └── utils/
│       ├── markedSetup.ts           # Marked.js カスタムレンダラ
│       └── htmlTemplate.ts          # HTMLテンプレート生成
│
├── src-tauri/                        # Rust バックエンド
│   ├── src/
│   │   ├── main.rs                  # アプリケーションエントリポイント
│   │   ├── lib.rs                   # ライブラリルート (Tauri セットアップ)
│   │   ├── init.rs                  # 初期化処理
│   │   ├── config.rs                # 設定管理
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

| パッケージ | バージョン | 用途 |
|---|---|---|
| `vue` | ^3.5.13 | UI フレームワーク |
| `pinia` | ^2.1.7 | 状態管理 |
| `@tauri-apps/api` | ^2 | Tauri コア API |
| `@tauri-apps/plugin-dialog` | ^2.3.0 | ファイルダイアログ |
| `@tauri-apps/plugin-fs` | ^2.4.0 | ファイルシステム操作 |
| `@tauri-apps/plugin-global-shortcut` | ^2.3.0 | グローバルショートカット |
| `@tauri-apps/plugin-opener` | ^2 | ファイル/URLオープナー |
| `@tauri-apps/plugin-store` | ^2.3.0 | 永続ストレージ |
| `ace-builds` | ^1.24.0 | コードエディタ |
| `marked` | ^13.0.3 | Markdown パーサ |
| `mermaid` | ^11.9.0 | ダイアグラムレンダリング |
| `katex` | ^0.16.22 | 数式レンダリング |
| `prismjs` | ^1.30.0 | コードシンタックスハイライト |
| `xss` | ^1.0.14 | XSS サニタイズ |

### 3.2 バックエンド (Cargo.toml)

| クレート | バージョン | 用途 |
|---|---|---|
| `tauri` | ^2 | アプリケーションフレームワーク (protocol-asset, devtools) |
| `tauri-plugin-opener` | ^2 | ファイルオープン |
| `tauri-plugin-dialog` | ^2 | ダイアログ |
| `tauri-plugin-store` | ^2 | 永続ストレージ |
| `serde` / `serde_json` | ^1 | シリアライズ / デシリアライズ |
| `anyhow` | ^1.0 | エラーハンドリング |
| `dirs` | ^5.0 | ホームディレクトリ解決 |
| `once_cell` | ^1.20.3 | 遅延初期化シングルトン |
| `tracing` / `tracing-subscriber` | ^0.1 / ^0.3 | ロギング |

### 3.3 Rust Edition / ビルド最適化

- **Edition:** 2024
- **リリースプロファイル:** LTO 有効、strip 有効、codegen-units=1、panic=abort

---

## 4. アーキテクチャ

### 4.1 全体構成

```
┌─────────────────────────────────────────────────┐
│                  Tauri Shell                     │
│  ┌───────────────────────┐  ┌─────────────────┐ │
│  │   Vue3 フロントエンド    │  │  Rust バックエンド │ │
│  │                       │  │                 │ │
│  │  App.vue              │  │  main.rs        │ │
│  │   └─ Editor.vue       │◄─►  lib.rs         │ │
│  │       └─ Help.vue     │IPC│  handler/       │ │
│  │                       │  │   ├─ file.rs    │ │
│  │  Pinia Stores         │  │   └─ spawn.rs   │ │
│  │   ├─ appInits.ts      │  │  config.rs      │ │
│  │   └─ localStorages.ts │  │  schema.rs      │ │
│  │                       │  │  utils.rs       │ │
│  │  Utils                │  │  init.rs        │ │
│  │   ├─ markedSetup.ts   │  │                 │ │
│  │   └─ htmlTemplate.ts  │  └─────────────────┘ │
│  └───────────────────────┘                       │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │           ユーザー設定 (~/.ageha/)          │    │
│  │  ├─ ageha.env.json   (アプリ設定)          │    │
│  │  └─ ageha.css        (カスタムCSS)         │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### 4.2 起動シーケンス

```
1. main.rs: ~/.ageha/ ディレクトリ作成/確認
2. main.rs: ageha.env.json 読込/作成 → 環境変数に設定
3. main.rs: ageha.css が存在しない場合はデフォルト生成
4. main.rs: コマンドライン引数解析
5. main.rs: tracing ロガー初期化
6. lib.rs: Tauri アプリケーション構築・プラグイン登録
7. main.ts: Pinia ストア初期化 (appInits → Rust から起動引数取得)
8. main.ts: CSS データを DOM に適用
9. main.ts: Vue アプリケーションマウント
10. Editor.vue: Ace エディタ初期化、ファイルデータ反映
```

### 4.3 IPC コマンド (Tauri Commands)

| コマンド名 | 入力 | 出力 | 説明 |
|---|---|---|---|
| `request_launch_args` | なし | `LaunchRequestData` | 起動時引数・CSS・ファイルデータ取得 |
| `read_file` | `target_file: String` | `ReadFileData` | ファイル読込 |
| `save_file` | `save_path: String, markdown_text_data: String` | `StatusCode` | ファイル保存 |
| `spawn_self` | `args: Vec<String>` | なし | 新規インスタンス起動 |

### 4.4 データ構造体 (Rust)

```rust
ApplicationInitSetup {
    css_file_path: String,     // CSS ファイルパス
    rust_log: String,          // ログレベル設定
}

StatusCode {
    status_code: u16,          // 200: 成功, 500: エラー
    message: String,           // メッセージ
}

LaunchRequestData {
    status: StatusCode,        // ステータス
    file_abs_path: String,     // ファイル絶対パス
    text_data: String,         // ファイル内容
    css_data: String,          // CSS データ
}

ReadFileData {
    status: StatusCode,        // ステータス
    file_abs_path: String,     // 絶対パス
    text_data: String,         // ファイル内容
}
```

---

## 5. 状態管理 (Pinia Stores)

### 5.1 useRustArgsInitStore (appInits.ts)

**目的:** Rust バックエンドからの起動データを保持する。

| プロパティ | 型 | 説明 |
|---|---|---|
| `rustArgsData.file_abs_path` | `string` | 開くファイルの絶対パス |
| `rustArgsData.text_data` | `string` | ファイルの内容 |
| `rustArgsData.css_data` | `string` | カスタム CSS |
| `rustArgsData.status` | `number` | ステータスコード |

**アクション:**
- `init()` — `request_launch_args` コマンドを呼び出し、起動データを取得
- `clear()` — ストアを初期状態にリセット

### 5.2 useLocalStorageStore (localStorages.ts)

**目的:** ユーザー設定の永続化 (Tauri plugin-store 経由)。

| プロパティ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `isPreviewFromLocalStrage` | `boolean` | `true` | プレビュー表示/非表示 |
| `isShowToolsFromLocalStrage` | `boolean` | `true` | マークダウンツール表示/非表示 |
| `isVimModeFromLocalStrage` | `boolean` | `false` | Vim モード有効/無効 |

**機能:**
- 150ms デバウンスによる自動保存
- `BroadcastChannel` によるウィンドウ間同期
- JSON 破損時のフォールバック処理

---

## 6. 機能仕様

### 6.1 エディタ機能

| 項目 | 仕様 |
|---|---|
| エディタエンジン | Ace Editor |
| シンタックスモード | Markdown |
| フォントサイズ | 16px |
| 折り返し | 有効 |
| 印刷マージン | 非表示 |
| Vim モード | トグル可 (Ctrl+,) |
| Vim カスタムコマンド | `:w` (保存), `:wq` (保存して閉じる) |

### 6.2 ファイル操作

| 操作 | ショートカット | 説明 |
|---|---|---|
| ファイルを開く | `Ctrl+O` | .md / .txt ファイル選択ダイアログ |
| ファイル保存 | `Ctrl+S` | 新規時は名前を付けて保存、既存時は上書き |
| 画像挿入 | `Ctrl+R` | 画像ファイル選択 → マークダウン記法挿入 |
| ドラッグ&ドロップ | — | .md/.txt ファイルのドロップで開く、画像のドロップで挿入 |

**ファイル関連付け:** `.md`, `.txt`

**ウィンドウタイトル:** ファイルパスを表示、未保存時は `*` を付加

**終了確認:** 未保存変更がある場合、確認ダイアログを表示

### 6.3 リアルタイムプレビュー

| 項目 | 仕様 |
|---|---|
| パーサ | Marked.js (カスタム拡張あり) |
| XSS 対策 | FilterXSS ライブラリ (カスタムホワイトリスト) |
| レイアウト | エディタとプレビューの分割表示 (50/50) |
| スクロール同期 | エディタ → プレビュー方向の同期 |
| トグル | `Ctrl+Alt+/` |

### 6.4 Marked.js カスタムトークン

Marked.js に以下のカスタムトークンを拡張登録している。

| トークン | 記法 | レンダリング結果 |
|---|---|---|
| 動画 | `?[text](url)` | `<video>` タグ |
| YouTube | `@[youtube](url)` | YouTube iframe 埋込 (youtube-nocookie.com) |
| 折りたたみ | `:::details タイトル\n内容\n:::` | `<details>` / `<summary>` |
| ノート | `:::note タイトル\n内容\n:::` | スタイル付きノートボックス |
| 警告 | `:::warning タイトル\n内容\n:::` | スタイル付き警告ボックス |
| 数式 (インライン) | `$...$` | KaTeX インライン数式 |
| 数式 (ブロック) | `$$...$$` | KaTeX ブロック数式 |
| 改ページ | `@@@` | `<div class="pagebreak">` (印刷用) |

**レンダラカスタマイズ:**
- **見出し:** 深さに応じたクラス付与 (head1〜head6)
- **リンク:** 外部リンクは新規タブで開く (`rel="noopener noreferrer"`)
- **コードブロック:** Mermaid は `<pre class="mermaid">`、通常コードはコピーボタン付き
- **画像:** 相対パスの絶対パス変換、幅指定サポート (`![alt](path =200)`)

### 6.5 Mermaid ダイアグラム

| 項目 | 仕様 |
|---|---|
| ライブラリ | Mermaid.js v11.9.0 |
| 対応チャート | フローチャート、シーケンス図、クラス図、状態遷移図、ER図、ガントチャート 他 |
| エラー処理 | シンタックスエラー時のグレースフルフォールバック |
| 再描画 | `Ctrl+M` |
| エクスポート時 | SVG に事前変換 |

### 6.6 KaTeX 数式レンダリング

| 項目 | 仕様 |
|---|---|
| ライブラリ | KaTeX v0.16.22 |
| インライン数式 | `$...$` |
| ブロック数式 | `$$...$$` |
| 配置 | 左揃え |
| エラーハンドリング | レンダリング失敗時はテキストにフォールバック |

### 6.7 コードブロック

| 項目 | 仕様 |
|---|---|
| ハイライト | Prism.js (80+ 言語対応) |
| コピーボタン | 各コードブロックに自動付与 |
| コピー確認 | ツールチップで「Copied!」表示 |

### 6.8 マークダウン入力ツール

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

### 6.9 エクスポート機能

#### PDF / 印刷 (`Ctrl+Alt+P`)
- ブラウザの印刷ダイアログを利用
- Mermaid ダイアグラムは事前に SVG 変換
- カスタム CSS を適用
- ウィンドウスケーリング対応

#### HTML エクスポート (`Ctrl+Alt+F`)
- スタンドアロン HTML ファイルとして出力
- CSS・Mermaid をインラインで埋込
- ファイル保存ダイアログで保存先指定

### 6.10 新規ウィンドウ (`Ctrl+Alt+N`)

- 現在の実行ファイルの新規インスタンスを生成
- Windows: `CREATE_NO_WINDOW` フラグでコンソール非表示

---

## 7. キーボードショートカット一覧

| ショートカット | 機能 |
|---|---|
| `Ctrl+O` | ファイルを開く |
| `Ctrl+S` | ファイル保存 |
| `Ctrl+R` | 画像挿入 |
| `Ctrl+Alt+P` | 印刷 / PDF 出力 |
| `Ctrl+Alt+F` | HTML エクスポート |
| `Ctrl+Alt+/` | プレビュー表示トグル |
| `Ctrl+Alt+I` | マークダウンツール表示トグル |
| `Ctrl+Alt+H` | ヘルプ表示 |
| `Ctrl+Alt+N` | 新規ウィンドウ |
| `Ctrl+,` | Vim モードトグル |
| `Ctrl+M` | Mermaid 再描画 |

---

## 8. ユーザー設定

### 8.1 設定ファイル

| ファイル | パス | 説明 |
|---|---|---|
| `ageha.env.json` | `~/.ageha/ageha.env.json` | アプリケーション設定 |
| `ageha.css` | `~/.ageha/ageha.css` | カスタムスタイルシート |
| `settings.json` | OS固有のデータディレクトリ | ユーザー設定 (Tauri Store) |

### 8.2 ageha.env.json

```json
{
  "css_file_path": "~/.ageha/ageha.css",
  "rust_log": "ageha=error"
}
```

| プロパティ | 型 | 説明 |
|---|---|---|
| `css_file_path` | `string` | カスタム CSS ファイルのパス |
| `rust_log` | `string` | ログレベル設定 (tracing) |

### 8.3 ageha.css

プレビュー・エクスポートに適用されるカスタムスタイルシート。デフォルトで以下を含む:

- A4 用紙サイズ (印刷時)
- GitHub Flavored Markdown スタイリング
- 見出しスタイル (ボーダー付き)
- コードブロック・テーブル・引用スタイル
- Mermaid エラー抑制
- KaTeX 左揃え配置

---

## 9. Tauri 設定

### 9.1 ウィンドウ

| 項目 | 値 |
|---|---|
| タイトル | "Ageha" |
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

| 項目 | 値 |
|---|---|
| インストーラ | NSIS (Windows, 日本語) |
| ファイル関連付け | `.md`, `.txt` |
| アイコン | 32x32, 128x128, 128x128@2x, .ico |

---

## 10. セキュリティ

| 対策 | 実装 |
|---|---|
| XSS フィルタリング | FilterXSS カスタムホワイトリスト |
| CSP ヘッダー | script/style/img/font ソース制限 |
| YouTube 埋込検証 | URL パターン検証 + 11文字の動画ID検証 |
| アセットプロトコル | ホームディレクトリにスコープ限定 |
| ファイルパス解決 | 絶対パス変換、ディレクトリトラバーサル防止 |
| Tauri サンドボックス | デフォルト有効 |

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

| 項目 | 値 |
|---|---|
| エントリポイント | `./src/main.ts` |
| エイリアス | `@` → `./src` |
| 開発サーバーポート | 1420 |
| HMR ポート | 1421 |
| グローバル定数 | `__APP_VERSION__` (package.json から取得) |

### 11.3 コード規約

| ツール | 設定 |
|---|---|
| TypeScript | strict モード、未使用変数/引数エラー |
| ESLint | Vue3 essential + TypeScript 対応 |
| Prettier | 幅100文字、2スペース、セミコロンあり、ダブルクォート |

---

## 12. UI レイアウト

```
┌──────────────────────────────────────────────┐
│  ヘッダー: "Ageha Editor" (ダブルクリックでバージョン表示) │
├──────────────────────────────────────────────┤
│  ツールバー: [開く][保存][画像][印刷][HTML]        │
│             [プレビュー][ツール][Vim][Help][新規]  │
├──────────────────┬───────────────────────────┤
│  マークダウンツール  │                           │
│  (トグル表示)      │                           │
├──────────────────┤                           │
│                  │                           │
│   Ace エディタ     │    プレビューパネル          │
│                  │    (リアルタイムHTML描画)      │
│   (50%)          │    (50%)                  │
│                  │                           │
│                  │                           │
└──────────────────┴───────────────────────────┘
```

- プレビュー非表示時はエディタが全幅に拡張
- マークダウンツールはフローティングパネル

### テーマカラー

| 要素 | カラーコード |
|---|---|
| 背景 | `#2e2e2e` |
| ヘッダーテキスト | `#f0f0f0` |
| ボタン背景 | `#5f5f5f` |
| アクセント | `#396cd8` |
| リンク | `#1431af` |

---

## 13. リリース履歴 (主要マイルストーン)

| バージョン | 内容 |
|---|---|
| v0.1.0 | 正式リリース準備 |
| v0.0.27 | YouTube 埋込修正、新規入力ボタン追加 |
| v0.0.24 | YouTube 埋込、HTML エクスポート、CSS カスタマイズ |
| v0.0.23 | コードブロックコピーボタン |
| v0.0.20 | PDF 印刷出力 |
| v0.0.17 | Tauri Store プラグイン、ビューワーウィンドウ |
| v0.0.8 | KaTeX 数式サポート |
| v0.0.7 | Mermaid ダイアグラムサポート |
| v0.0.1 | 初期リリース |
