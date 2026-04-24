document.addEventListener("DOMContentLoaded", () => {
    const wall = document.querySelector("#figure-atlas-pairs");
    const pagination = document.querySelector("#figure-atlas-pagination");
    if (!wall || !pagination) {
        return;
    }

    const rows = Array.from(wall.querySelectorAll(".figure-atlas-row"));
    const PAGE_SIZE = 4;
    const state = { page: 1 };

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
        const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        if (state.page > totalPages) {
            state.page = totalPages;
        }

        const start = (state.page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        rows.forEach((row, index) => {
            row.hidden = index < start || index >= end;
        });

        renderPagination(totalPages);
    }

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
