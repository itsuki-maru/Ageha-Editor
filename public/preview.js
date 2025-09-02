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