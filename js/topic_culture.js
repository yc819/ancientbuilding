document.addEventListener("DOMContentLoaded", () => {
    const grid = document.querySelector("#culture-poster-grid");
    const pagination = document.querySelector("#culture-gallery-pagination");
    const chips = Array.from(document.querySelectorAll("#culture-filter-bar .culture-filter-chip"));
    if (!grid || !pagination || !chips.length) {
        return;
    }

    const cards = Array.from(grid.querySelectorAll(".culture-poster-card"));
    const PAGE_SIZE = 8;
    const state = { category: "", page: 1 };

    function visibleCards() {
        return cards.filter((card) => !state.category || card.dataset.category === state.category);
    }

    function syncChips() {
        chips.forEach((chip) => {
            chip.classList.toggle("is-active", (chip.dataset.category || "") === state.category);
        });
    }

    function renderPagination(totalPages) {
        if (totalPages <= 1) {
            pagination.innerHTML = "";
            return;
        }

        const buttons = [];
        buttons.push(`<button class="topic-page-button" type="button" data-page="${Math.max(1, state.page - 1)}" ${state.page === 1 ? "disabled" : ""}>上一页</button>`);
        for (let page = 1; page <= totalPages; page += 1) {
            buttons.push(`<button class="topic-page-button ${page === state.page ? "is-active" : ""}" type="button" data-page="${page}">${page}</button>`);
        }
        buttons.push(`<button class="topic-page-button" type="button" data-page="${Math.min(totalPages, state.page + 1)}" ${state.page === totalPages ? "disabled" : ""}>下一页</button>`);
        pagination.innerHTML = buttons.join("");
    }

    function render() {
        const visible = visibleCards();
        const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
        if (state.page > totalPages) {
            state.page = totalPages;
        }
        const start = (state.page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;

        cards.forEach((card) => {
            const index = visible.indexOf(card);
            card.hidden = index === -1 || index < start || index >= end;
        });

        syncChips();
        renderPagination(totalPages);
    }

    chips.forEach((chip) => {
        chip.addEventListener("click", () => {
            state.category = chip.dataset.category || "";
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
