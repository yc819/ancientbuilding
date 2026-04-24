document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "ancientbuilding-messages";
    const seed = window.MESSAGE_BOARD_SEED || [];
    const form = document.querySelector("#message-form");
    const list = document.querySelector("#message-list");
    const charCount = document.querySelector("#message-char-count");
    const search = document.querySelector("#message-search");
    const filterTag = document.querySelector("#message-filter-tag");
    const filterStatus = document.querySelector("#message-filter-status");
    const filterMeta = document.querySelector("#message-filter-meta");
    const formStatus = document.querySelector("#message-form-status");
    const contentField = document.querySelector("#message-content");
    const formReset = document.querySelector("#message-form-reset");

    if (!form || !list || !contentField) {
        return;
    }

    function escapeHTML(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function setFormStatus(text) {
        if (formStatus) {
            formStatus.textContent = text;
        }
    }

    function sourceLabel(value) {
        const mapping = {
            "/ai": "快问快答",
            "/messages": "网友留言",
            "/collections": "收藏室",
            "/achievements": "建筑成就",
            "/explorer/visualization": "可视化总览",
            "未指定页面": "未指定页面",
        };
        return mapping[value] || value || "未指定页面";
    }

    function normalizeMessage(item) {
        const content = String(item.content || "").trim();
        return {
            id: item.id || `msg-${Date.now()}`,
            title: item.title || content.slice(0, 18) || "未命名留言",
            author: item.author || "站内访客",
            date: item.date || new Date().toISOString().slice(0, 10),
            tag: item.tag || "功能建议",
            content,
            reply: item.reply || "留言已收到，后续会结合页面优化继续整理。",
            status: item.status || "待整理",
            source: sourceLabel(item.source),
        };
    }

    function loadMessages() {
        try {
            const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            const localItems = Array.isArray(local) ? local : [];
            return [...localItems, ...seed].map(normalizeMessage);
        } catch (error) {
            return [...seed].map(normalizeMessage);
        }
    }

    function saveMessages(messages) {
        const localOnly = messages
            .filter((item) => String(item.id).startsWith("local-"))
            .map(normalizeMessage);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localOnly));
    }

    function filteredMessages(messages) {
        const keyword = String(search?.value || "").trim().toLowerCase();
        const tag = filterTag?.value || "";
        const status = filterStatus?.value || "";

        return messages.filter((item) => {
            const haystack = [
                item.title,
                item.content,
                item.reply,
                item.source,
                item.author,
            ].join(" ").toLowerCase();
            const matchKeyword = !keyword || haystack.includes(keyword);
            const matchTag = !tag || item.tag === tag;
            const matchStatus = !status || item.status === status;
            return matchKeyword && matchTag && matchStatus;
        });
    }

    function renderList(messages) {
        const visible = filteredMessages(messages)
            .sort((a, b) => String(b.date).localeCompare(String(a.date)));

        if (filterMeta) {
            filterMeta.textContent = visible.length === messages.length
                ? `共 ${messages.length} 条留言`
                : `筛选后剩余 ${visible.length} 条留言`;
        }

        if (!visible.length) {
            list.innerHTML = '<div class="empty-state">当前筛选下没有留言，试试更换关键词或放宽筛选条件。</div>';
            return;
        }

        list.innerHTML = visible.map((item) => `
            <article class="message-thread-item">
                <div class="message-thread-row">
                    <div class="message-thread-badge">Q</div>
                    <div class="message-thread-question">
                        <div class="message-thread-meta">
                            <strong>${escapeHTML(item.author)}</strong>
                            <span>${escapeHTML(item.date)}</span>
                            <span>${escapeHTML(item.tag)}</span>
                            <span>${escapeHTML(item.source)}</span>
                        </div>
                        <p>${escapeHTML(item.content)}</p>
                    </div>
                </div>
                <div class="message-thread-row message-thread-row--answer">
                    <div class="message-thread-badge message-thread-badge--answer">A</div>
                    <div class="message-thread-answer">
                        <div class="message-thread-answer-head">
                            <span>站内回复</span>
                            <b>${escapeHTML(item.status)}</b>
                        </div>
                        <p>${escapeHTML(item.reply)}</p>
                    </div>
                </div>
            </article>
        `).join("");
    }

    function renderAll() {
        renderList(loadMessages());
    }

    function updateCharCount() {
        if (!charCount) {
            return;
        }
        charCount.textContent = `${contentField.value.trim().length} / 300`;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const author = document.querySelector("#message-author")?.value.trim() || "站内访客";
        const tag = document.querySelector("#message-tag")?.value || "功能建议";
        const source = document.querySelector("#message-source")?.value || "未指定页面";
        const content = contentField.value.trim();

        if (content.length < 10) {
            setFormStatus("内容至少 10 个字");
            contentField.focus();
            return;
        }

        const messages = loadMessages();
        messages.unshift({
            id: `local-${Date.now()}`,
            author,
            date: new Date().toISOString().slice(0, 10),
            tag,
            source,
            title: content.slice(0, 18),
            content,
            reply: "留言已保存到当前浏览器，后续可继续用于页面演示与问答整理。",
            status: "待整理",
        });

        saveMessages(messages);
        form.reset();
        updateCharCount();
        setFormStatus("提交成功");
        renderAll();
    });

    formReset?.addEventListener("click", () => {
        form.reset();
        updateCharCount();
        setFormStatus("已重置");
    });

    contentField.addEventListener("input", updateCharCount);
    search?.addEventListener("input", renderAll);
    filterTag?.addEventListener("change", renderAll);
    filterStatus?.addEventListener("change", renderAll);

    updateCharCount();
    setFormStatus("待填写");
    renderAll();
});
