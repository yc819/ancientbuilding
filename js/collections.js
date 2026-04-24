document.addEventListener("DOMContentLoaded", async () => {
    const STORAGE_KEY = "ancientbuilding-favorites";
    const PAGE_SIZE = 6;

    const target = document.querySelector("#collections-grid");
    const metrics = document.querySelector("#collection-metrics");
    const search = document.querySelector("#collection-search");
    const datasetFilter = document.querySelector("#collection-filter-dataset");
    const exportButton = document.querySelector("#collection-export");
    const clearAllButton = document.querySelector("#collection-clear-all");
    const exportNote = document.querySelector("#collection-export-note");
    const filterMeta = document.querySelector("#collection-filter-meta");
    const topics = document.querySelector("#collection-topics");
    const status = document.querySelector("#collection-status");
    const pagination = document.querySelector("#collection-pagination");

    if (!target || !metrics || !search || !datasetFilter || !topics || !pagination) {
        return;
    }

    let allRecords = [];
    let page = 1;

    function escapeHTML(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function setStatus(text) {
        if (status) {
            status.textContent = text;
        }
    }

    function getFavoriteIds() {
        return window.SiteApp.getFavorites();
    }

    function setFavoriteIds(ids) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        document.dispatchEvent(new CustomEvent("favorites:changed"));
    }

    function renderMetrics(records) {
        const datasetCount = new Set(records.map((item) => item.dataset).filter(Boolean)).size;
        const themeCount = new Set(records.map((item) => item.category).filter(Boolean)).size;
        const eraCount = new Set(records.map((item) => item.era).filter(Boolean)).size;

        metrics.innerHTML = `
            <article class="collection-metric-card"><strong>${records.length}</strong><span>收藏条目</span></article>
            <article class="collection-metric-card"><strong>${themeCount}</strong><span>主题方向</span></article>
            <article class="collection-metric-card"><strong>${datasetCount}</strong><span>数据类型</span></article>
            <article class="collection-metric-card"><strong>${eraCount}</strong><span>涉及时代</span></article>
        `;
    }

    function renderTopicSummary(records) {
        const counts = new Map();
        records.forEach((item) => {
            const key = item.category || item.dataset_label || "未分类";
            counts.set(key, (counts.get(key) || 0) + 1);
        });

        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
        if (!sorted.length) {
            topics.innerHTML = '<div class="empty-state">收藏加载后，这里会自动统计出现最多的类型和主题。</div>';
            return;
        }

        topics.innerHTML = sorted.map(([label, count]) => `
            <div class="collection-topic-item">
                <strong>${escapeHTML(label)}</strong>
                <span>${count} 条</span>
            </div>
        `).join("");
    }

    function populateDatasetFilter(records) {
        const current = datasetFilter.value;
        const options = [...new Map(
            records
                .filter((item) => item.dataset)
                .map((item) => [item.dataset, item.dataset_label || item.dataset]),
        ).entries()];

        datasetFilter.innerHTML = `
            <option value="">全部类型</option>
            ${options.map(([value, label]) => `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join("")}
        `;

        datasetFilter.value = options.some(([value]) => value === current) ? current : "";
    }

    function getVisibleRecords() {
        const keyword = String(search.value || "").trim().toLowerCase();
        const dataset = datasetFilter.value;

        return allRecords.filter((record) => {
            const haystack = [
                record.title,
                record.summary,
                record.category,
                record.era,
                record.region,
                record.dataset_label,
            ].join(" ").toLowerCase();

            const matchKeyword = !keyword || haystack.includes(keyword);
            const matchDataset = !dataset || record.dataset === dataset;
            return matchKeyword && matchDataset;
        });
    }

    function paginate(records) {
        const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
        if (page > totalPages) {
            page = totalPages;
        }
        const start = (page - 1) * PAGE_SIZE;
        return {
            totalPages,
            start,
            end: Math.min(start + PAGE_SIZE, records.length),
            items: records.slice(start, start + PAGE_SIZE),
        };
    }

    function renderCard(record) {
        const facts = [record.category, record.era, record.region].filter(Boolean);
        const media = record.image
            ? `<img src="${escapeHTML(record.image)}" alt="${escapeHTML(record.title)}">`
            : `<div class="collection-record-placeholder">${escapeHTML(record.initial || record.title?.slice(0, 1) || "藏")}</div>`;

        return `
            <article class="collection-record-card">
                <a class="collection-record-media ${record.image ? "" : "is-placeholder"}" href="${window.SiteApp.detailUrl(record)}">
                    ${media}
                </a>
                <div class="collection-record-head">
                    <div>
                        <div class="micro-meta">${escapeHTML(record.dataset_label || "")}</div>
                        <h3><a href="${window.SiteApp.detailUrl(record)}">${escapeHTML(record.title)}</a></h3>
                    </div>
                    <button class="button button-secondary" type="button" data-remove-favorite="${escapeHTML(record.id)}">移除</button>
                </div>
                ${facts.length ? `<div class="collection-record-meta">${facts.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}</div>` : ""}
                <p>${escapeHTML(record.summary || "暂无摘要。")}</p>
                <div class="collection-record-actions">
                    <a class="button button-primary" href="${window.SiteApp.detailUrl(record)}">查看详情</a>
                </div>
            </article>
        `;
    }

    function renderPagination(totalPages) {
        if (totalPages <= 1) {
            pagination.hidden = true;
            pagination.innerHTML = "";
            return;
        }

        pagination.hidden = false;
        const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
        const prev = Math.max(1, page - 1);
        const next = Math.min(totalPages, page + 1);

        pagination.innerHTML = `
            <button class="collection-page-button" type="button" data-page="${prev}" ${page === 1 ? "disabled" : ""}>上一页</button>
            ${pages.map((item) => `
                <button class="collection-page-button ${item === page ? "is-active" : ""}" type="button" data-page="${item}">
                    ${item}
                </button>
            `).join("")}
            <button class="collection-page-button" type="button" data-page="${next}" ${page === totalPages ? "disabled" : ""}>下一页</button>
        `;
    }

    function renderList(records) {
        if (!records.length) {
            target.innerHTML = '<div class="empty-state">当前筛选下没有收藏内容，可以换个关键词或重新选择数据类型。</div>';
            pagination.hidden = true;
            pagination.innerHTML = "";
            if (filterMeta) {
                filterMeta.textContent = "";
            }
            return;
        }

        const paged = paginate(records);
        if (filterMeta) {
            filterMeta.textContent = "";
        }

        target.innerHTML = paged.items.map((record) => renderCard(record)).join("");
        renderPagination(paged.totalPages);
    }

    function renderAll() {
        renderMetrics(allRecords);
        renderTopicSummary(allRecords);
        populateDatasetFilter(allRecords);
        renderList(getVisibleRecords());
        setStatus(allRecords.length ? "收藏已整理" : "暂无收藏");
    }

    function buildExportText(records) {
        const lines = ["收藏室专题提纲", ""];
        records.forEach((item, index) => {
            const meta = [item.dataset_label, item.category, item.era, item.region].filter(Boolean).join(" / ");
            lines.push(`${index + 1}. ${item.title}${meta ? `（${meta}）` : ""}`);
            if (item.summary) {
                lines.push(`   ${item.summary}`);
            }
        });
        return lines.join("\n").trim();
    }

    async function loadRecords() {
        const ids = getFavoriteIds();
        if (!ids.length) {
            allRecords = [];
            renderAll();
            target.innerHTML = '<div class="empty-state">你还没有收藏条目。可以在详情页点击“收藏”，把关心的建筑、人物、著作和文化条目收进收藏室。</div>';
            pagination.hidden = true;
            pagination.innerHTML = "";
            if (filterMeta) {
                filterMeta.textContent = "当前没有收藏内容";
            }
            setStatus("暂无收藏");
            return;
        }

        setStatus("正在加载");
        const records = await Promise.all(
            ids.map((id) => fetch(`/api/items/${id}`).then((response) => response.json()).catch(() => null)),
        );
        allRecords = records.filter(Boolean);
        renderAll();
    }

    exportButton?.addEventListener("click", async () => {
        const records = getVisibleRecords();
        if (!records.length) {
            if (exportNote) {
                exportNote.textContent = "当前没有可导出的收藏内容。";
            }
            return;
        }

        try {
            await navigator.clipboard.writeText(buildExportText(records));
            if (exportNote) {
                exportNote.textContent = `已复制 ${records.length} 条收藏的专题提纲。`;
            }
        } catch (error) {
            if (exportNote) {
                exportNote.textContent = "复制失败，请稍后重试。";
            }
        }
    });

    clearAllButton?.addEventListener("click", () => {
        if (!allRecords.length) {
            return;
        }
        if (!window.confirm("确认清空当前浏览器中的全部收藏吗？")) {
            return;
        }

        setFavoriteIds([]);
        allRecords = [];
        page = 1;
        renderAll();
        target.innerHTML = '<div class="empty-state">收藏已清空，可以重新从详情页添加条目。</div>';
        pagination.hidden = true;
        pagination.innerHTML = "";
        if (exportNote) {
            exportNote.textContent = "已清空当前收藏。";
        }
    });

    search.addEventListener("input", () => {
        page = 1;
        renderAll();
    });

    datasetFilter.addEventListener("change", () => {
        page = 1;
        renderAll();
    });

    pagination.addEventListener("click", (event) => {
        const button = event.target.closest("[data-page]");
        if (!button) {
            return;
        }
        page = Number(button.dataset.page) || 1;
        renderAll();
    });

    target.addEventListener("click", (event) => {
        const button = event.target.closest("[data-remove-favorite]");
        if (!button) {
            return;
        }

        const next = getFavoriteIds().filter((item) => item !== button.dataset.removeFavorite);
        setFavoriteIds(next);
        allRecords = allRecords.filter((item) => item.id !== button.dataset.removeFavorite);

        const visibleCount = getVisibleRecords().length;
        const totalPages = Math.max(1, Math.ceil(visibleCount / PAGE_SIZE));
        if (page > totalPages) {
            page = totalPages;
        }

        renderAll();
        if (!allRecords.length) {
            target.innerHTML = '<div class="empty-state">你还没有收藏条目。可以在详情页点击“收藏”，把关心的内容加入收藏室。</div>';
            pagination.hidden = true;
            pagination.innerHTML = "";
        }
    });

    document.addEventListener("favorites:changed", loadRecords);
    await loadRecords();
});
