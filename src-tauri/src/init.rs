use super::schema::ApplicationInitSetup;
use dirs::home_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

pub fn get_application_user_setup_path() -> PathBuf {
    let home_dir = home_dir().expect("User home directory get error.");
    let setup_file_dir = home_dir.join(".ageha");
    if !setup_file_dir.exists() {
        fs::create_dir(&setup_file_dir).expect("Directory `~/.ageha` create error.");
        read_or_create_json_env(setup_file_dir.clone());
    }
    setup_file_dir
}

pub fn create_default_env(application_user_setting_dir: PathBuf) -> ApplicationInitSetup {
    // ユーザー入力から取得
    let css_file_path = application_user_setting_dir.join("ageha.css");
    let rust_log = "ageha=error".to_string();

    ApplicationInitSetup {
        css_file_path: css_file_path.to_string_lossy().into_owned(),
        rust_log: rust_log,
    }
}

pub fn read_or_create_json_env(setup_file_dir: PathBuf) -> ApplicationInitSetup {
    let setup_recover_path = setup_file_dir.clone();
    let env_json_path = setup_file_dir.join("ageha.env.json");

    // JSONデータが存在しない場合の処理
    if !env_json_path.exists() {
        let default_env = create_default_env(setup_file_dir);
        let _ = write_to_json_file(env_json_path.clone(), &default_env.clone());
    }

    let load_json_data: ApplicationInitSetup = match read_to_json_data(&env_json_path) {
        Ok(load_json_env) => load_json_env,
        Err(_) => {
            let result = fs::remove_file(env_json_path);
            match result {
                Ok(_) => read_or_create_json_env(setup_recover_path),
                Err(_) => panic!("Json env load error."),
            }
        }
    };

    // CSSファイルが存在しない場合の処理
    let css_path = Path::new(&load_json_data.css_file_path);
    if !css_path.exists() {
        let _ = create_default_css(css_path.to_path_buf());
    }

    load_json_data
}

fn write_to_json_file<T: Serialize>(file_path: PathBuf, data: &T) -> io::Result<()> {
    let file = fs::File::create(file_path).expect("`ageha.env.json` fs create error.");
    serde_json::to_writer_pretty(file, data).expect("`ageha.env.json` write error.");
    Ok(())
}

fn read_to_json_data<T: for<'de> Deserialize<'de>>(file_path: &PathBuf) -> io::Result<T> {
    let file = fs::File::open(file_path)?;
    let reader = io::BufReader::new(file);
    let data = serde_json::from_reader(reader)?;
    Ok(data)
}

fn create_default_css(file_path: PathBuf) -> io::Result<()> {
    let css = r#"
    @page {
        size: A4;
        margin: 1mm;
    }

    body {
      font-family: Helvetica, arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      padding-top: 10px;
      padding-bottom: 10px;
      background-color: white;
      padding: 30px;
    }

    body > *:first-child {
      margin-top: 0 !important;
    }
    body > *:last-child {
      margin-bottom: 0 !important;
    }

    a {
      color: #1431af;
      text-decoration: underline;
    }
    a.absent {
      color: #cc0000;
    }
    a.anchor {
      display: block;
      padding-left: 30px;
      margin-left: -30px;
      cursor: pointer;
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin: 20px 0 10px;
      padding: 0;
      font-weight: bold;
      -webkit-font-smoothing: antialiased;
      cursor: text;
      position: relative;
    }

    h1:hover a.anchor,
    h2:hover a.anchor,
    h3:hover a.anchor,
    h4:hover a.anchor,
    h5:hover a.anchor,
    h6:hover a.anchor {
      background: url('../../images/modules/styleguide/para.png') no-repeat 10px center;
      text-decoration: none;
    }

    h1 tt,
    h1 code {
      font-size: inherit;
    }

    h2 tt,
    h2 code {
      font-size: inherit;
    }

    h3 tt,
    h3 code {
      font-size: inherit;
    }

    h4 tt,
    h4 code {
      font-size: inherit;
    }

    h5 tt,
    h5 code {
      font-size: inherit;
    }

    h6 tt,
    h6 code {
      font-size: inherit;
    }

    h1 {
      font-size: 28px;
      color: black;
    }

    h2 {
      font-size: 24px;
      border-bottom: 2px solid #cccccc;
      color: black;
    }

    h3 {
      font-size: 18px;
      border-bottom: 0.5px solid #cccccc;
    }

    h4 {
      font-size: 16px;
    }

    h5 {
      font-size: 14px;
    }

    h6 {
      color: #777777;
      font-size: 14px;
    }

    p,
    blockquote,
    ul,
    ol,
    dl,
    li,
    table,
    pre {
      margin: 15px 0;
    }

    hr {
      background: transparent url('../../images/modules/pulls/dirty-shade.png') repeat-x 0 0;
      border: 0 none;
      color: #cccccc;
      height: 4px;
      padding: 0;
    }

    body > h2:first-child {
      margin-top: 0;
      padding-top: 0;
    }
    body > h1:first-child {
      margin-top: 0;
      padding-top: 0;
    }
    body > h1:first-child + h2 {
      margin-top: 0;
      padding-top: 0;
    }
    body > h3:first-child,
    body > h4:first-child,
    body > h5:first-child,
    body > h6:first-child {
      margin-top: 0;
      padding-top: 0;
    }

    a:first-child h1,
    a:first-child h2,
    a:first-child h3,
    a:first-child h4,
    a:first-child h5,
    a:first-child h6 {
      margin-top: 0;
      padding-top: 0;
    }

    h1 p,
    h2 p,
    h3 p,
    h4 p,
    h5 p,
    h6 p {
      margin-top: 0;
    }

    li p.first {
      display: inline-block;
    }

    ul,
    ol {
      padding-left: 30px;
    }

    ul :first-child,
    ol :first-child {
      margin-top: 0;
    }

    ul :last-child,
    ol :last-child {
      margin-bottom: 0;
    }

    dl {
      padding: 0;
    }
    dl dt {
      font-size: 14px;
      font-weight: bold;
      font-style: italic;
      padding: 0;
      margin: 15px 0 5px;
    }
    dl dt:first-child {
      padding: 0;
    }
    dl dt > :first-child {
      margin-top: 0;
    }
    dl dt > :last-child {
      margin-bottom: 0;
    }
    dl dd {
      margin: 0 0 15px;
      padding: 0 15px;
    }
    dl dd > :first-child {
      margin-top: 0;
    }
    dl dd > :last-child {
      margin-bottom: 0;
    }

    blockquote {
      border-left: 4px solid #dddddd;
      padding: 0 15px;
      color: #777777;
    }
    blockquote > :first-child {
      margin-top: 0;
    }
    blockquote > :last-child {
      margin-bottom: 0;
    }

    table {
      padding: 0;
    }
    table tr {
      border-top: 1px solid #cccccc;
      background-color: white;
      margin: 0;
      padding: 0;
    }
    table tr:nth-child(2n) {
      background-color: #f8f8f8;
    }
    table tr th {
      font-weight: bold;
      border: 1px solid #cccccc;
      text-align: left;
      margin: 0;
      padding: 6px 13px;
      background-color: #a5cef7;
    }
    table tr td {
      border: 1px solid #cccccc;
      text-align: left;
      margin: 0;
      padding: 6px 13px;
    }
    table tr th :first-child,
    table tr td :first-child {
      margin-top: 0;
    }
    table tr th :last-child,
    table tr td :last-child {
      margin-bottom: 0;
    }

    img,
    video {
      max-width: 100%;
      border: none;
    }

    span.frame {
      display: block;
      overflow: hidden;
    }
    span.frame > span {
      border: 1px solid #dddddd;
      display: block;
      float: left;
      overflow: hidden;
      margin: 13px 0 0;
      padding: 7px;
      width: auto;
    }
    span.frame span img {
      display: block;
      float: left;
    }
    span.frame span span {
      clear: both;
      color: #333333;
      display: block;
      padding: 5px 0 0;
    }
    span.align-center {
      display: block;
      overflow: hidden;
      clear: both;
    }
    span.align-center > span {
      display: block;
      overflow: hidden;
      margin: 13px auto 0;
      text-align: center;
    }
    span.align-center span img {
      margin: 0 auto;
      text-align: center;
    }
    span.align-right {
      display: block;
      overflow: hidden;
      clear: both;
    }
    span.align-right > span {
      display: block;
      overflow: hidden;
      margin: 13px 0 0;
      text-align: right;
    }
    span.align-right span img {
      margin: 0;
      text-align: right;
    }
    span.float-left {
      display: block;
      margin-right: 13px;
      overflow: hidden;
      float: left;
    }
    span.float-left span {
      margin: 13px 0 0;
    }
    span.float-right {
      display: block;
      margin-left: 13px;
      overflow: hidden;
      float: right;
    }
    span.float-right > span {
      display: block;
      overflow: hidden;
      margin: 13px auto 0;
      text-align: right;
    }

    code,
    tt {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.9em;
      background: #f1eff1;
      border-radius: 4px;
      padding: 0.2em 0.4em;
    }

    pre code {
      margin: 0;
      padding: 0;
      white-space: pre;
      border: none;
      background: transparent;
    }

    .highlight pre {
      background-color: #f8f8f8;
      border: 1px solid #cccccc;
      font-size: 13px;
      line-height: 19px;
      overflow: auto;
      padding: 6px 10px;
      border-radius: 3px;
    }

    pre {
      background-color: #e6e6e6;
      color: black;
      border: 1px solid #5e5e5e;
      font-size: 13px;
      line-height: 19px;
      overflow: auto;
      padding: 6px 10px;
      border-radius: 3px;
    }
    pre code,
    pre tt {
      background-color: transparent;
      border: none;
    }
    pre a {
      color: black;
      text-decoration: none;
    }

    p code {
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    ul code {
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    li code {
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Mermaid.jsのシンタックスエラーの描画を回避 */
    .mermaid .error-icon {
      display: none; /* アイコンを非表示にする */
    }
    .mermaid .error-text {
      display: none;
    }

    /* 画像プレビューモーダル用 */
    img#img-preview,
    video#img-preview {
      max-height: 80vh;
    }

    img,
    video {
      max-width: 100%;
      border: none;
    }

    pre[class*='language-'] {
      margin: 0;
    }

    .katex-display {
      width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      font-size: 1.3em;
      padding-bottom: 5px;
    }

    .katex-display > .katex {
      text-align: left;
      margin-left: 3%;
    }

    .head1 {
      font-size: 32px;
      margin-bottom: -1%;
      border-bottom: solid 3px #d7d7d7;
    }

    .head2 {
      font-size: 20px;
      color: black;
      margin-top: 2%;
      padding: 0.3em 0.4em;
      background: #ebe8e8;
      border-left: solid 5px #426f9c;
      border-bottom: solid 3px #d7d7d7;
      border-radius: 6px;
    }
    "#;
    let file = fs::File::create(file_path).expect("`ageha.css` fs create error.");
    let mut writer = io::BufWriter::new(file);
    write!(writer, "{}", css)?;
    Ok(())
}
