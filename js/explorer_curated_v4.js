document.addEventListener("DOMContentLoaded", () => {
    const filters = window.EXPLORER_BROWSER_FILTERS || {};
    const defaults = window.EXPLORER_DEFAULTS || {};
    const PAGE_SIZE = 16;

    const state = {
        q: "",
        dataset: "",
        region: "",
        category: "",
        page: 1,
        totalPages: 1,
    };

    const input = document.querySelector("#filter-q");
    const grid = document.querySelector("#explorer-grid");
    const meta = document.querySelector("#results-meta");
    const datasetRow = document.querySelector("#dataset-row");
    const regionRow = document.querySelector("#region-row");
    const categoryRow = document.querySelector("#category-row");
    const pagination = document.querySelector("#explorer-pagination");

    const imageMap = {
        "buildings:民居": "/static/images/gallery-residential.jpg",
        "buildings:官府": "/static/images/gallery-official.jpg",
        "buildings:皇宫": "/static/images/gallery-palace.jpg",
        "buildings:桥梁": "/static/images/gallery-bridge.jpg",
    };

    function scopedFilters() {
        return filters[state.dataset || "all"] || filters.all || { categories: [], regions: [] };
    }

    function syncFromUrl() {
        const url = new URL(window.location.href);
        state.q = url.searchParams.get("q") || defaults.q || "";
        state.dataset = url.searchParams.get("dataset") || defaults.dataset || "";
        state.region = url.searchParams.get("region") || defaults.region || "";
        state.category = url.searchParams.get("category") || defaults.category || "";
        state.page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
        input.value = state.q;
    }

    function syncUrl() {
        const url = new URL(window.location.href);
        [
            ["q", state.q],
            ["dataset", state.dataset],
            ["region", state.region],
            ["category", state.category],
            ["page", state.page > 1 ? String(state.page) : ""],
        ].forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            } else {
                url.searchParams.delete(key);
            }
        });
        window.history.replaceState({}, "", url);
    }

    function renderLinkRow(container, control, values, activeValue) {
        const items = ["不限", ...values];
        container.innerHTML = items.map((label, index) => {
            const value = index === 0 ? "" : label;
            const active = value === activeValue ? "is-active" : "";
            return `<button class="museums-filter-link ${active}" type="button" data-filter-control="${control}" data-value="${value}">${label}</button>`;
        }).join("");
    }

    function syncDatasetRow() {
        datasetRow.querySelectorAll("[data-filter-control='dataset']").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.value === state.dataset);
        });
    }

    function renderDynamicRows() {
        const scoped = scopedFilters();
        if (state.region && !scoped.regions.includes(state.region)) {
            state.region = "";
        }
        if (state.category && !scoped.categories.includes(state.category)) {
            state.category = "";
        }
        renderLinkRow(regionRow, "region", scoped.regions || [], state.region);
        renderLinkRow(categoryRow, "category", scoped.categories || [], state.category);
        syncDatasetRow();
    }

    async function fetchItems() {
        const query = new URLSearchParams({
            q: state.q,
            dataset: state.dataset,
            region: state.region,
            category: state.category,
        });
        const response = await fetch(`/api/items?${query.toString()}`);
        return response.json();
    }

    function getImage(record) {
        return record.image || imageMap[`${record.dataset}:${record.category}`] || "";
    }

    function renderCard(record) {
        const image = getImage(record);
        const media = image
            ? `<img src="${image}" alt="${record.title}">`
            : `<div class="museums-tile-placeholder"><span>${record.initial}</span></div>`;
        return `
            <a class="museums-tile-card ${image ? "has-image" : "is-placeholder"}" href="${window.SiteApp.detailUrl(record)}">
                <div class="museums-tile-media">
                    ${media}
                </div>
                <div class="museums-tile-caption">${record.title}</div>
            </a>
        `;
    }

    function renderPagination(totalItems) {
        const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
        state.totalPages = totalPages;
        if (state.page > totalPages) {
            state.page = totalPages;
        }

        if (totalPages <= 1) {
            pagination.hidden = true;
            pagination.innerHTML = "";
            return totalPages;
        }

        const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
        const prevPage = Math.max(1, state.page - 1);
        const nextPage = Math.min(totalPages, state.page + 1);
        pagination.hidden = false;
        pagination.innerHTML = `
            <button class="museums-page-button" type="button" data-page="${prevPage}" ${state.page === 1 ? "disabled" : ""}>上一页</button>
            ${pages.map((page) => `
                <button class="museums-page-button ${page === state.page ? "is-active" : ""}" type="button" data-page="${page}">
                    ${page}
                </button>
            `).join("")}
            <button class="museums-page-button" type="button" data-page="${nextPage}" ${state.page === totalPages ? "disabled" : ""}>下一页</button>
            <button class="museums-page-button" type="button" data-page="${totalPages}" ${state.page === totalPages ? "disabled" : ""}>末页</button>
        `;
        return totalPages;
    }

    async function load() {
        state.q = input.value.trim();
        renderDynamicRows();
        meta.textContent = "正在加载数据…";

        try {
            const payload = await fetchItems();
            const totalPages = renderPagination(payload.total);

            if (!payload.items.length) {
                meta.textContent = "共找到 0 条记录";
                grid.innerHTML = `<div class="empty-state museum-empty-state">当前没有匹配记录。</div>`;
                pagination.hidden = true;
                syncUrl();
                return;
            }

            if (state.page > totalPages) {
                state.page = totalPages;
            }

            const start = (state.page - 1) * PAGE_SIZE;
            const visibleItems = payload.items.slice(start, start + PAGE_SIZE);
            meta.textContent = `共找到 ${payload.total} 条记录`;
            grid.innerHTML = visibleItems.map(renderCard).join("");
            syncUrl();
        } catch (error) {
            meta.textContent = "数据加载失败";
            grid.innerHTML = `<div class="empty-state museum-empty-state">当前无法加载列表数据，请稍后重试。</div>`;
            pagination.hidden = true;
        }
    }

    document.querySelector("#apply-filters")?.addEventListener("click", () => {
        state.page = 1;
        load();
    });

    document.querySelector("#reset-filters")?.addEventListener("click", () => {
        state.q = "";
        state.dataset = "";
        state.region = "";
        state.category = "";
        state.page = 1;
        input.value = "";
        load();
    });

    input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            state.page = 1;
            load();
        }
    });

    document.addEventListener("click", (event) => {
        const filterButton = event.target.closest("[data-filter-control]");
        if (filterButton) {
            const control = filterButton.dataset.filterControl;
            const value = filterButton.dataset.value || "";

            if (control === "dataset") {
                state.dataset = value;
                state.region = "";
                state.category = "";
            } else if (control === "region") {
                state.region = value;
            } else if (control === "category") {
                state.category = value;
            }
            state.page = 1;
            load();
            return;
        }

        const pageButton = event.target.closest("[data-page]");
        if (pageButton) {
            state.page = Math.max(1, Number(pageButton.dataset.page) || 1);
            load();
            return;
        }
    });

    syncFromUrl();
    renderDynamicRows();
    load();
});
