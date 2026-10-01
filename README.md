# Ageha Editor

![Icon](https://ageha-editor.pages.dev/icon-128.png)

インストールは [Release](https://github.com/itsuki-maru/Ageha-Editor/releases/tag/v0.3.0) から自身のプラットフォームに適したものを選択してください。なお、Windows においては `ageha.exe` をダウンロードして実行することも可能ですが、OSのバージョンによっては WebView などのコンポーネントが足りない場合があります。その際はインストーラを使用してください。

なお、インストーラ時に、次のような青の警告が発せられる場合があります。

> このアプリケーションを使用したことで発生した、いかなる損害も、作者は負いません。絶対に。
>
> このアプリケーションは次のような青いウィンドウに決して臆しない、恐れない者のみが使うことを推奨します。
>
> ![Icon](https://ageha-editor.pages.dev/safe.png)
>
> また、親切に dmg ファイルをリリースに用意しているにも関わらず、作者は「ヨドバシカメラでしか MacBook は触れたことがない」と言っています。さらに「Linux で動いたから動くでしょ」と言っています。

## アプリケーション概要

**Ageha Editor**は [Tauri](https://v2.tauri.app/ja/) 製のマークダウンエディター。軽量かつインストール不要で使用可能。

**起動イメージ**

![Ageha Editor](https://geocode-web-single.pages.dev/ageha-edhitor-desktop-image.png)

**フルスクリーン**

![Ageha Editor](https://ageha-editor.pages.dev/ageha-editor.png)

### 基本機能

- リアルタイムプレビュー
- 印刷機能（PDF出力を含む）
- HTML エクスポート
- 入力支援機能
- フローチャート対応（Mermaid）
- 数式対応（KaTeX）
- スライド作成機能（Marp）
- スライドショー機能
- Vim モード
- カスタム CSS

---

## 機能詳細

### エディタ

- [Ace Editor](https://ace.c9.io/) ベースの高機能テキストエディタ
- **Vim モード**: Vim キーバインドへ切り替え可能（`Ctrl+,` または UI トグルボタン）
- **スクロール同期**: エディタとプレビューのスクロール位置を連動
- **未保存状態の追跡**: タイトルバーに `*` を表示

### ファイル操作

| 操作               | 説明                                         |
| ------------------ | -------------------------------------------- |
| ファイルを開く     | ダイアログでファイルを選択して読み込み       |
| ファイルを保存     | 現在の内容をローカルファイルへ保存           |
| ドラッグ＆ドロップ | ファイルをエディタ領域にドロップして読み込み |
| 新規ウィンドウ     | 新しいエディタウィンドウを起動               |

対応ファイル形式: `.md` `.txt`

### 出力

- **印刷 / PDF出力**: ブラウザの印刷機能を利用してPDFに出力
- **HTML エクスポート**: CSS・画像・フォントをインライン化した単一ファイルの HTML を出力
- **別ウィンドウビューア**: プレビューを独立したウィンドウで表示

### マークダウン拡張記法

標準の Markdown に加えて、以下の独自記法に対応。

| 記法                       | 説明               |
| -------------------------- | ------------------ |
| `?[alt](video.mp4)`        | 動画埋め込み       |
| `@[youtube](URL)`          | YouTube 埋め込み   |
| `:::details 見出し...:::`  | 折りたたみブロック |
| `:::note 見出し...:::`     | ノートブロック     |
| `:::warning　見出し...:::` | 警告ブロック       |
| `@@@`                      | 改ページ（印刷時） |

### スライドモード

![Ageha Editor](https://ageha-editor.pages.dev/ageha-editor-slide.png)

frontmatter に `marp: true` を記述すると自動的にスライドモードへ切り替わる。

```markdown
---
marp: true
---

# スライドタイトル

---

## 2枚目のスライド
```

- テーマ `ageha-slide`、サイズ `16:9`、数式 `KaTeX` を自動設定
- 印刷・HTML エクスポート・ビューア表示に対応

#### スライドショー（`Ctrl+Alt+S` または "Play" ボタン）

![Ageha Editor](https://ageha-editor.pages.dev/ageha-editor-slideshow.png)

スライドモード時のみ有効。1 枚ずつ表示する発表モードのウィンドウを開く。

| 操作                | 動作                                      |
| ------------------- | ----------------------------------------- |
| `→` / `↓` / `Space` | 次のスライド                              |
| `←` / `↑`           | 前のスライド                              |
| `Home` / `End`      | 最初 / 最後のスライド                     |
| 画面右半分クリック  | 次のスライド                              |
| 画面左半分クリック  | 前のスライド                              |
| 画面下部ホバー      | ナビゲーション UI（← カウンター →）を表示 |

### Mermaid ダイアグラム

コードブロックに `mermaid` を指定するとダイアグラムをレンダリング。

````markdown
```mermaid
flowchart TD
    A[開始] --> B{条件}
    B -->|Yes| C[処理]
    B -->|No| D[終了]
```
````

フローチャート、シーケンス図、状態遷移図、クラス図、ER図などに対応。

> プレビューへの反映は `Ctrl + m`

### 数式（KaTeX）

インライン数式とディスプレイ数式に対応。

```
インライン: $E = mc^2$

ディスプレイ:
$$
消費税額 = \frac{税込み価格 × 消費税率}{消費税率 + 100}
$$
```

---

## キーボードショートカット

| キー         | 機能                           |
| ------------ | ------------------------------ |
| `Ctrl+O`     | ファイルを開く                 |
| `Ctrl+S`     | ファイルを保存                 |
| `Ctrl+R`     | 画像を挿入                     |
| `Ctrl+M`     | Mermaid を再描画               |
| `Ctrl+,`     | Vim モードの切り替え           |
| `Ctrl+Alt+P` | 印刷 / PDF出力                 |
| `Ctrl+Alt+F` | HTML エクスポート              |
| `Ctrl+Alt+W` | 別ウィンドウでプレビューを表示 |
| `Ctrl+Alt+/` | プレビューの表示 / 非表示      |
| `Ctrl+Alt+I` | 入力支援パネルの表示 / 非表示  |
| `Ctrl+Alt+H` | ヘルプを表示                   |
| `Ctrl+Alt+N` | 新規ウィンドウを開く           |
| `Ctrl+Alt+S` | スライドショーを開く           |
| `Escape`     | モーダルを閉じる               |

---

## カスタム CSS

初回起動時にユーザーディレクトリへ `~/.ageha/` が作成される。

| ファイル                   | 説明                             |
| -------------------------- | -------------------------------- |
| `~/.ageha/ageha.css`       | マークダウンプレビューのスタイル |
| `~/.ageha/ageha-slide.css` | スライドプレビューのスタイル     |

これらのファイルを編集することでプレビュー・印刷・HTML エクスポートのスタイルをカスタマイズできる。

---

## 開発

### 必要環境

- Node.js 24 系（CI とリリースで使用するバージョンは `.node-version` で管理）
- Rust stable（Rust 2024 Edition に対応するツールチェーン）
- Tauri CLI v2（npm の開発依存としてインストール）
- OS ごとの [Tauri 開発環境](https://v2.tauri.app/start/prerequisites/)

### セットアップと実行

```bash
npm ci
npm run tauri dev
```

### ビルド

```bash
npm run build
npm run tauri build
```

### テスト

```bash
npm test
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo test --manifest-path src-tauri/Cargo.toml --locked
```

- フロントエンドの単体テストは Vitest を使用
- Rust バックエンドの単体テストは Cargo の標準テスト機能を使用

### CI

`.github/workflows/ci.yml` は `main`・`develop` への PR と push、および Actions からの手動実行で動作する。

- **Frontend**（Ubuntu）：`npm ci` → `npm test` → 配布ファイル収集処理のテスト → `npm run build`（型チェックを含む）
- **Rust**（Windows）：整形チェック → フロントエンド成果物のビルド → `cargo test --locked`

同じブランチに更新が続いた場合、古い CI 実行はキャンセルされる。npm と Cargo のロックファイルを使用し、依存関係のキャッシュを利用する。

### リリース

リリースは GitHub Actions の `release.yml` ワークフローで行う。`v*` タグの push、または Actions の **Release → Run workflow** で既存の `tag_name` を指定すると実行できる。手動実行のワークフローは `main` を選択する。

指定タグが存在し、そのコミットが `main` の履歴に含まれることを検証する。そのコミットに対して通常 CI を再実行し、成功後に同じコミットから Linux（AppImage / deb）、macOS Universal（dmg）、Windows（NSIS exe / MSI）のインストーラーをビルドする。必要なファイルの欠落・空ファイルはエラーとし、`checksums.txt` に SHA-256 を記録して検証する。作成するリリースはドラフトで、公開は手動で行う。

書き込み権限はドラフトリリース作成ジョブだけに付与する。同じタグのリリース実行は直列化し、配布直前にもタグが検証時のコミットを指していることを確認する。

#### テスト手順（本番実行前の確認）

CI の変更を `main` にマージした後、そのコミットに仮タグを付け、ワークフローが正常に動作するか確認する。`main` に含まれないブランチのタグは拒否される。

```bash
# 1. 最新の main に移動
git switch main
git pull --ff-only origin main

# 2. 仮タグを push（ワークフローがトリガーされる）
git tag v0.0.0-test
git push origin v0.0.0-test
```

GitHub の **Actions** タブで進捗を確認する。`gh` CLI を使う場合:

```bash
gh run list --workflow=release.yml
gh run watch
```

確認後、仮タグとドラフトリリースを削除してクリーンアップする。

```bash
# ローカルとリモートのタグを削除
git tag -d v0.0.0-test
git push origin --delete v0.0.0-test
```

GitHub UI で **Releases → ドラフト → Delete** からドラフトリリースも削除する。

#### 本番リリース手順

```bash
# 1. バージョンを更新（package.json / src-tauri/Cargo.toml / src-tauri/tauri.conf.json）
# package-lock.json と src-tauri/Cargo.lock のアプリ自身のバージョンも同期する

# 2. コミット
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json
git commit -m "Prepare for release vX.Y.Z"

# 3. 変更を main にマージし、CI の成功を確認してからタグを付ける
git switch main
git pull --ff-only origin main
git tag vX.Y.Z
git push origin vX.Y.Z
```

ワークフロー完了後、GitHub の **Releases** にドラフトリリースが作成されるので、内容を確認して **Publish release** で公開する。

---

## ライセンス

MIT

## スタイルパック

ツールバーの「スタイル」から、標準・シンプル・ダーク・ペーパーを選択できます。
Markdown とスライドの見た目をセットで切り替え、選択は次回起動時にも復元されます。
HTML 出力・印刷・新しく開く閲覧ウィンドウやスライドショーにも反映されます。
すでに開いている閲覧ウィンドウは、開き直すと反映されます。

「標準」では従来の独自 CSS を適用します。他のパックでは同梱 CSS を使用し、
独自 CSS ファイルは変更しません。設定はアプリ共通で、Markdown 本文には書き込みません。
