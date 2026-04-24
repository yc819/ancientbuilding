document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "ancientbuilding-guide-history";
    const input = document.querySelector("#guide-question");
    const submit = document.querySelector("#guide-submit");
    const clear = document.querySelector("#guide-clear");
    const copy = document.querySelector("#guide-copy");
    const resetAnswer = document.querySelector("#guide-reset-answer");
    const answer = document.querySelector("#guide-answer");
    const matches = document.querySelector("#guide-matches");
    const followups = document.querySelector("#guide-followups");
    const recent = document.querySelector("#guide-recent");
    const status = document.querySelector("#guide-status");
    const matchCount = document.querySelector("#guide-match-count");

    if (!input || !submit || !answer || !matches || !followups || !recent) {
        return;
    }

    function setStatus(text) {
        if (status) {
            status.textContent = text;
        }
    }

    function loadHistory() {
        try {
            const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            return Array.isArray(items) ? items : [];
        } catch (error) {
            return [];
        }
    }

    function saveHistory(question) {
        const text = String(question || "").trim();
        if (!text) {
            return;
        }
        const next = [text, ...loadHistory().filter((item) => item !== text)].slice(0, 8);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        renderHistory();
    }

    function renderHistory() {
        const items = loadHistory();
        if (!items.length) {
            recent.innerHTML = '<div class="empty-state">还没有提问记录，可以先从模板开始。</div>';
            return;
        }
        recent.innerHTML = items.map((item) => `
            <button class="interactive-history-item" type="button" data-history-question="${item}">${item}</button>
        `).join("");
    }

    function renderAnswer(text) {
        const parts = String(text || "")
            .split(/\n{2,}/)
            .map((item) => item.trim())
            .filter(Boolean);

        if (!parts.length) {
            answer.innerHTML = '<div class="empty-state">暂未生成回答。</div>';
            return;
        }

        answer.innerHTML = parts.map((item) => `<p>${item}</p>`).join("");
    }

    function renderGuideMatchCard(record) {
        const metaItems = [
            record.category ? `<span class="badge">${record.category}</span>` : "",
            record.era ? `<span>${record.era}</span>` : "",
            record.region ? `<span>${record.region}</span>` : "",
        ].filter(Boolean).join("");

        return `
            <article class="guide-match-card">
                <div class="guide-match-topline">
                    <span class="guide-match-dataset">${record.dataset_label || ""}</span>
                    ${record.year_label ? `<span class="guide-match-year">${record.year_label}</span>` : ""}
                </div>
                <div class="guide-match-copy">
                    <h3><a href="${window.SiteApp.detailUrl(record)}">${record.title}</a></h3>
                    ${metaItems ? `<div class="card-meta">${metaItems}</div>` : ""}
                    <p class="guide-match-summary">${record.summary || ""}</p>
                </div>
                <div class="guide-match-actions">
                    <a class="button button-primary" href="${window.SiteApp.detailUrl(record)}">查看详情</a>
                    ${window.SiteApp.favoriteButton(record.id)}
                </div>
            </article>
        `;
    }

    function renderMatches(items) {
        if (matchCount) {
            matchCount.textContent = items.length ? `匹配到 ${items.length} 条相关内容` : "未找到直接匹配";
        }

        if (!items.length) {
            matches.innerHTML = '<div class="empty-state">没有找到直接匹配的条目，可以换一个更具体的问法，或使用下方建议追问。</div>';
            return;
        }

        matches.innerHTML = items.map((record) => renderGuideMatchCard(record)).join("");
    }

    function renderFollowups(items) {
        if (!items.length) {
            followups.innerHTML = '<div class="empty-state">当前没有自动追问建议，你可以尝试补充朝代、建筑类型或人物名称。</div>';
            return;
        }

        followups.innerHTML = items.map((item) => `
            <button class="question-chip question-chip--followup" type="button" data-question="${item}">${item}</button>
        `).join("");
    }

    function resetPanels() {
        renderAnswer("输入问题后，这里会显示简洁回答、相关条目和建议追问。");
        renderMatches([]);
        renderFollowups([]);
        setStatus("等待提问");
    }

    async function runGuide(question) {
        const text = String(question || "").trim();
        if (!text) {
            setStatus("请先输入问题");
            input.focus();
            return;
        }

        setStatus("正在检索");
        renderAnswer("正在检索站内知识库，请稍候。");
        renderMatches([]);
        renderFollowups([]);

        try {
            const response = await fetch(`/api/guide?q=${encodeURIComponent(text)}`);
            const payload = await response.json();
            renderAnswer(payload.answer || "暂未生成回答。");
            renderMatches(payload.matches || []);
            renderFollowups(payload.followups || []);
            saveHistory(text);
            setStatus("已生成回答");
        } catch (error) {
            renderAnswer("当前无法获取回答，请稍后重试。");
            renderMatches([]);
            renderFollowups([]);
            setStatus("请求失败");
        }
    }

    function ask(question) {
        const text = String(question || "").trim();
        if (!text) {
            return;
        }
        input.value = text;
        runGuide(text);
    }

    submit.addEventListener("click", () => ask(input.value));

    clear?.addEventListener("click", () => {
        input.value = "";
        input.focus();
        setStatus("问题已清空");
    });

    resetAnswer?.addEventListener("click", () => {
        resetPanels();
    });

    copy?.addEventListener("click", async () => {
        const text = answer.innerText.trim();
        if (!text) {
            setStatus("暂无可复制内容");
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            setStatus("答案已复制");
        } catch (error) {
            setStatus("复制失败");
        }
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            ask(input.value);
        }
    });

    document.addEventListener("click", (event) => {
        const questionButton = event.target.closest("[data-question]");
        if (questionButton) {
            ask(questionButton.dataset.question);
            return;
        }

        const historyButton = event.target.closest("[data-history-question]");
        if (historyButton) {
            ask(historyButton.dataset.historyQuestion);
        }
    });

    renderHistory();
    resetPanels();
});
