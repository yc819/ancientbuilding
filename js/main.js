(function () {
    const STORAGE_KEY = "ancientbuilding-favorites";
    let quizState = {
        index: 0,
        selected: false,
        score: 0,
        options: [],
    };

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        } catch (error) {
            return [];
        }
    }

    function setFavorites(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(items)]));
        document.dispatchEvent(new CustomEvent("favorites:changed"));
    }

    function isFavorite(id) {
        return getFavorites().includes(id);
    }

    function toggleFavorite(id) {
        const items = getFavorites();
        if (items.includes(id)) {
            setFavorites(items.filter((item) => item !== id));
            return false;
        }
        items.push(id);
        setFavorites(items);
        return true;
    }

    function favoriteLabel(id) {
        return isFavorite(id) ? "已收藏" : "收藏";
    }

    function favoriteButton(id) {
        return `<button class="button button-secondary" type="button" data-favorite-toggle data-record-id="${id}">${favoriteLabel(id)}</button>`;
    }

    function detailUrl(record) {
        const langPrefix = window.__LANG_PREFIX__ || "";
        if (!record) {
            return "#";
        }
        if (record.dataset === "buildings") {
            return `${langPrefix}/achievements/${encodeURIComponent(record.title || "")}/`;
        }
        if (record.dataset === "scientists") {
            return `${langPrefix}/figures/${encodeURIComponent(record.title || "")}/`;
        }
        if (record.dataset === "treatises") {
            return `${langPrefix}/figures/treatises/${encodeURIComponent(record.title || "")}/`;
        }
        if (record.dataset === "culture") {
            return `${langPrefix}/figures/culture/${encodeURIComponent(record.title || "")}/`;
        }
        return `${langPrefix}/achievements`;
    }

    function renderRecordCard(record, options = {}) {
        const compact = Boolean(options.compact);
        return `
            <article class="result-card ${compact ? "compact-card" : ""}">
                <div class="result-head">
                    <div class="feature-avatar" style="--accent:${record.accent}">${record.initial}</div>
                    <div>
                        <div class="micro-meta">${record.dataset_label}</div>
                        <h3>${record.title}</h3>
                        <div class="card-meta">
                            ${record.category ? `<span class="badge">${record.category}</span>` : ""}
                            ${record.era ? `<span>${record.era}</span>` : ""}
                            ${record.region ? `<span>${record.region}</span>` : ""}
                        </div>
                    </div>
                </div>
                <p>${record.summary}</p>
                <div class="card-actions">
                    <a class="button button-primary" href="${detailUrl(record)}">查看详情</a>
                    ${favoriteButton(record.id)}
                </div>
            </article>
        `;
    }

    function syncFavoriteButtons() {
        document.querySelectorAll("[data-favorite-toggle]").forEach((button) => {
            button.textContent = favoriteLabel(button.dataset.recordId);
        });
    }

    function openOverlay(selector) {
        const target = document.querySelector(selector);
        if (!target) {
            return;
        }
        target.hidden = false;
    }

    function closeOverlay(selector) {
        const target = document.querySelector(selector);
        if (!target) {
            return;
        }
        target.hidden = true;
    }

    function renderStories() {
        const panel = document.querySelector("[data-story-panel]");
        if (!panel || !window.SITE_OVERVIEW.story_routes) {
            return;
        }
        panel.innerHTML = window.SITE_OVERVIEW.story_routes.map((route) => `
            <article class="story-route" style="border-top:4px solid ${route.accent}">
                <h4>${route.title}</h4>
                <p>${route.subtitle}</p>
                <div class="story-items">
                    ${route.items.map((item) => `
                        <a class="story-item" href="${detailUrl(item)}">
                            <strong>${item.title}</strong>
                            <small>${item.meta || "综合信息"}</small>
                            <span>${item.summary}</span>
                        </a>
                    `).join("")}
                </div>
            </article>
        `).join("");
    }

    function renderQuiz() {
        const panel = document.querySelector("[data-quiz-panel]");
        const questions = window.SITE_OVERVIEW.quiz_questions || [];
        if (!panel) {
            return;
        }
        if (!questions.length) {
            panel.innerHTML = `<div class="empty-state">当前没有可用题目。</div>`;
            return;
        }
        const question = questions[quizState.index];
        if (!quizState.options.length) {
            quizState.options = [...question.options].sort((a, b) => a.localeCompare(b, "zh-CN"));
        }

        panel.innerHTML = `
            <div class="quiz-meta">
                <span>第 ${quizState.index + 1} / ${questions.length} 题</span>
                <span>当前得分：${quizState.score}</span>
            </div>
            <article class="quiz-question">
                <h4>${question.question}</h4>
                <div class="quiz-options">
                    ${quizState.options.map((option) => `
                        <button class="quiz-option" type="button" data-quiz-option data-value="${option}" ${quizState.selected ? "disabled" : ""}>
                            ${option}
                        </button>
                    `).join("")}
                </div>
                <div class="quiz-explanation" ${quizState.selected ? "" : "hidden"}>${quizState.selected ? question.explanation : ""}</div>
            </article>
            <div class="quiz-footer">
                <button class="button button-secondary" type="button" data-quiz-restart>重新开始</button>
                <button class="button button-primary" type="button" data-quiz-next ${quizState.selected ? "" : "disabled"}>
                    ${quizState.index === questions.length - 1 ? "完成测验" : "下一题"}
                </button>
            </div>
        `;

        if (quizState.selected) {
            panel.querySelectorAll("[data-quiz-option]").forEach((item) => {
                if (item.dataset.value === question.answer) {
                    item.classList.add("is-correct");
                } else if (item.dataset.value === quizState.selected) {
                    item.classList.add("is-wrong");
                }
            });
        }
    }

    function initRevealCards() {
        const cards = document.querySelectorAll("[data-reveal]");
        if (!cards.length) {
            return;
        }
        if (!("IntersectionObserver" in window)) {
            cards.forEach((card) => card.classList.add("is-visible"));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.18 });
        cards.forEach((card) => observer.observe(card));
    }

    function initHoverGroups() {
        document.querySelectorAll(".tool-preview-grid").forEach((group) => {
            const cards = Array.from(group.querySelectorAll(".tool-preview-card"));
            if (cards.length < 2) {
                return;
            }

            const clear = () => {
                group.classList.remove("is-hovering");
                cards.forEach((card) => card.classList.remove("is-active", "is-dimmed"));
            };

            const activate = (currentCard) => {
                group.classList.add("is-hovering");
                cards.forEach((card) => {
                    const isCurrent = card === currentCard;
                    card.classList.toggle("is-active", isCurrent);
                    card.classList.toggle("is-dimmed", !isCurrent);
                });
            };

            cards.forEach((card) => {
                card.addEventListener("mouseenter", () => activate(card));
                card.addEventListener("focus", () => activate(card));
            });

            group.addEventListener("mouseleave", clear);
            group.addEventListener("focusout", (event) => {
                if (!event.relatedTarget || !group.contains(event.relatedTarget)) {
                    clear();
                }
            });
        });
    }

    function initHeroSlider() {
        const hero = document.querySelector("[data-hero-slider]");
        if (!hero) {
            return;
        }

        const slides = Array.from(hero.querySelectorAll("[data-hero-slide]"));
        const dots = Array.from(hero.querySelectorAll("[data-hero-dot]"));
        const prevButton = hero.querySelector("[data-hero-prev]");
        const nextButton = hero.querySelector("[data-hero-next]");
        if (!slides.length) {
            return;
        }

        let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
        if (activeIndex < 0) {
            activeIndex = 0;
        }
        let timerId = null;

        const render = (index) => {
            activeIndex = (index + slides.length) % slides.length;
            slides.forEach((slide, slideIndex) => {
                slide.classList.toggle("is-active", slideIndex === activeIndex);
            });
            dots.forEach((dot, dotIndex) => {
                dot.classList.toggle("is-active", dotIndex === activeIndex);
            });
        };

        const start = () => {
            if (timerId || slides.length < 2) {
                return;
            }
            timerId = window.setInterval(() => render(activeIndex + 1), 5600);
        };

        const stop = () => {
            if (!timerId) {
                return;
            }
            window.clearInterval(timerId);
            timerId = null;
        };

        const step = (delta) => {
            render(activeIndex + delta);
            stop();
            start();
        };

        prevButton?.addEventListener("click", () => step(-1));
        nextButton?.addEventListener("click", () => step(1));
        dots.forEach((dot) => {
            dot.addEventListener("click", () => {
                const index = Number(dot.dataset.heroDot || 0);
                render(index);
                stop();
                start();
            });
        });

        hero.addEventListener("mouseenter", stop);
        hero.addEventListener("mouseleave", start);
        render(activeIndex);
        start();
    }

    function resetQuiz() {
        quizState = {
            index: 0,
            selected: false,
            score: 0,
            options: [],
        };
        renderQuiz();
    }

    function nextQuiz() {
        const questions = window.SITE_OVERVIEW.quiz_questions || [];
        if (quizState.index >= questions.length - 1) {
            resetQuiz();
            closeOverlay("[data-quiz-overlay]");
            return;
        }
        quizState.index += 1;
        quizState.selected = false;
        quizState.options = [];
        renderQuiz();
    }

    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-favorite-toggle]");
        if (button) {
            event.preventDefault();
            toggleFavorite(button.dataset.recordId);
            syncFavoriteButtons();
            return;
        }

        if (event.target.closest("[data-open-stories]")) {
            openOverlay("[data-story-overlay]");
            return;
        }

        if (event.target.closest("[data-close-stories]") || event.target.matches("[data-story-overlay]")) {
            closeOverlay("[data-story-overlay]");
            return;
        }

        if (event.target.closest("[data-open-quiz]")) {
            resetQuiz();
            openOverlay("[data-quiz-overlay]");
            return;
        }

        if (event.target.closest("[data-close-quiz]") || event.target.matches("[data-quiz-overlay]")) {
            closeOverlay("[data-quiz-overlay]");
            return;
        }

        if (event.target.closest("[data-quiz-restart]")) {
            resetQuiz();
            return;
        }

        if (event.target.closest("[data-quiz-next]")) {
            nextQuiz();
            return;
        }

        const option = event.target.closest("[data-quiz-option]");
        if (option) {
            const questions = window.SITE_OVERVIEW.quiz_questions || [];
            const question = questions[quizState.index];
            if (!question || quizState.selected) {
                return;
            }
            quizState.selected = option.dataset.value;
            if (quizState.selected === question.answer) {
                quizState.score += 1;
            }
            renderQuiz();
        }
    });

    document.addEventListener("favorites:changed", syncFavoriteButtons);
    document.addEventListener("DOMContentLoaded", () => {
        syncFavoriteButtons();
        renderStories();
        renderQuiz();
        initRevealCards();
        initHoverGroups();
        initHeroSlider();
    });

    window.SiteApp = {
        getFavorites,
        isFavorite,
        toggleFavorite,
        renderRecordCard,
        favoriteButton,
        detailUrl,
    };
})();
