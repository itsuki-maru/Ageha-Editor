import rawKatex from "katex/dist/katex.min.css?raw";
import rawMermaid from "mermaid/dist/mermaid.min.js?raw";

export function createHtml(html: string, style: string): string {
  const htmlEmbed = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8" />
    <title>Ageha Editor</title>
    <style>
    ${style}
    </style>
    <style>
    ${rawKatex}
    </style>
    <script>
    ${rawMermaid}
    </script>
    </head>
    <body>
    <div class="container-fluid">${html}</div>
    </body>
    <script>
        document.addEventListener("click", (e) => {
            const target = e.target;
            if (target.classList.contains("copy-btn")) {
                const codeId = target.dataset.target;
                const codeElem = document.getElementById(codeId || "")
                if (codeElem) {
                    navigator.clipboard.writeText(codeElem.textContent || "");
                    // すでにメッセージがあれば削除
                    const existingTooltip = target.parentElement?.querySelector(".copy-tooltip");
                    if (existingTooltip) existingTooltip.remove();
                    // メッセージを作成
                    const tooltip = document.createElement("div");
                    tooltip.textContent = "コピーしました";
                    tooltip.className = "copy-tooltip";
                    // ボタンの親要素（code-container）に追加
                    target.parentElement?.appendChild(tooltip);
                    // 一定時間後に非表示
                    setTimeout(() => {
                        tooltip.style.opacity = "0";
                        setTimeout(() => tooltip.remove(), 300);
                    }, 1000);
                }
            }
        });
    </script>
    </html>`;
  return htmlEmbed;
}
