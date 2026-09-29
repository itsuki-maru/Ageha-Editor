document.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("copy-btn")) {
        const codeId = target.dataset.target;
        const codeElem = document.getElementById(codeId || "")
        if (codeElem) {
            navigator.clipboard.writeText(codeElem.textContent || "");
            const existingTooltip = target.parentElement?.querySelector(".copy-tooltip");
            if (existingTooltip) existingTooltip.remove();
            const tooltip = document.createElement("div");
            tooltip.textContent = "コピーしました";
            tooltip.className = "copy-tooltip";
            target.parentElement?.appendChild(tooltip);
            setTimeout(() => {
                tooltip.style.opacity = "0";
                setTimeout(() => tooltip.remove(), 300);
            }, 1000);
        }
    }
});