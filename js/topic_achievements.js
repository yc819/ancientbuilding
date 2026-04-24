document.addEventListener("DOMContentLoaded", () => {
    const wall = document.querySelector("#achievement-exhibit-wall");
    const pagination = document.querySelector("#achievement-pagination");
    const countNode = document.querySelector("#achievement-count");
    const filterTabs = Array.from(document.querySelectorAll("[data-achievement-filters] .topic-filter-tab"));
    if (!wall || !pagination || !countNode || !filterTabs.length) {
        return;
    }

    const cards = Array.from(wall.querySelectorAll(".topic-exhibit-card"));
    const PAGE_SIZE = 6;
    const state = {
        category: "",
        page: 1,
    };

    function filteredCards() {
        return cards.filter((card) => !state.category || card.dataset.category === state.category);
    }

    function syncTabs() {
        filterTabs.forEach((tab) => {
            tab.classList.toggle("is-active", (tab.dataset.category || "") === state.category);
        });
    }

    function renderPagination(totalPages) {
        if (totalPages <= 1) {
            pagination.innerHTML = "";
            return;
        }

        const buttons = [];
        buttons.push(
            `<button class="topic-page-button" type="button" data-page="${Math.max(1, state.page - 1)}" ${state.page === 1 ? "disabled" : ""}>上一页</button>`
        );
        for (let page = 1; page <= totalPages; page += 1) {
            buttons.push(
                `<button class="topic-page-button ${page === state.page ? "is-active" : ""}" type="button" data-page="${page}">${page}</button>`
            );
        }
        buttons.push(
            `<button class="topic-page-button" type="button" data-page="${Math.min(totalPages, state.page + 1)}" ${state.page === totalPages ? "disabled" : ""}>下一页</button>`
        );
        pagination.innerHTML = buttons.join("");
    }

    function render() {
        const visible = filteredCards();
        const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
        if (state.page > totalPages) {
            state.page = totalPages;
        }
        const start = (state.page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;

        cards.forEach((card) => {
            const index = visible.indexOf(card);
            const show = index >= start && index < end;
            card.hidden = index === -1 || !show;
        });

        countNode.textContent = String(visible.length);
        syncTabs();
        renderPagination(totalPages);
    }

    filterTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            state.category = tab.dataset.category || "";
            state.page = 1;
            render();
        });
    });

    pagination.addEventListener("click", (event) => {
        const button = event.target.closest("[data-page]");
        if (!button) {
            return;
        }
        state.page = Math.max(1, Number(button.dataset.page) || 1);
        render();
    });

    render();
});
