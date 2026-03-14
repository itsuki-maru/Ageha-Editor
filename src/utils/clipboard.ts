import { TOOLTIP_DISPLAY_MS, TOOLTIP_FADE_MS } from "../constants";

// ヘルプ画面やコードブロックで使うコピー処理を共通化している。
// ツールチップ表示まで含めて一か所に寄せることで挙動を揃えやすくする。
/**
 * コピーボタンのクリックハンドラ
 * data-target属性で指定されたコード要素のテキストをクリップボードにコピーし、ツールチップを表示する
 */
export function handleCopyButtonClick(target: HTMLElement): void {
  const codeId = target.dataset.target;
  const codeElem = document.getElementById(codeId || "");
  if (!codeElem) return;

  navigator.clipboard.writeText(codeElem.textContent || "");
  showCopyTooltip(target);
}

/**
 * 要素のテキスト内容をクリップボードにコピーし、ツールチップを表示する
 */
export function copyElementText(element: HTMLElement): void {
  if (!element.textContent) return;

  navigator.clipboard.writeText(element.textContent);
  showCopyTooltip(element);
}

function showCopyTooltip(anchorElement: HTMLElement): void {
  const parent = anchorElement.parentElement;
  if (!parent) return;

  // すでにメッセージがあれば削除
  const existingTooltip = parent.querySelector(".copy-tooltip");
  if (existingTooltip) existingTooltip.remove();

  // メッセージを作成
  const tooltip = document.createElement("div");
  tooltip.textContent = "コピーしました";
  tooltip.className = "copy-tooltip";
  parent.appendChild(tooltip);

  // 一定時間後に非表示
  setTimeout(() => {
    tooltip.style.opacity = "0";
    setTimeout(() => tooltip.remove(), TOOLTIP_FADE_MS);
  }, TOOLTIP_DISPLAY_MS);
}
