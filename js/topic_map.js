document.addEventListener("DOMContentLoaded", async () => {
    const records = window.BUILDING_MAP_RECORDS || [];
    const viewports = window.BUILDING_MAP_VIEWPORTS || {};
    const mapNode = document.querySelector("#ancient-building-map");
    if (!records.length || !mapNode || typeof echarts === "undefined") {
        return;
    }

    const categoryChips = Array.from(document.querySelectorAll("[data-map-category]"));
    const regionSelect = document.querySelector("#map-region-select");
    const resultCards = Array.from(document.querySelectorAll("[data-map-result]"));
    const regionJumpButtons = Array.from(document.querySelectorAll("[data-map-region-jump]"));

    const focusTitle = document.querySelector("#map-focus-title");
    const focusMeta = document.querySelector("#map-focus-meta");
    const focusImage = document.querySelector("#map-focus-image");
    const focusSummary = document.querySelector("#map-focus-summary");
    const focusLink = document.querySelector("#map-focus-link");
    const mapSection = document.querySelector("#map-exhibit-section");

    const palette = {
        皇宫: "#8f3d29",
        民居: "#2f6b57",
        官府: "#455d8b",
        桥梁: "#8b6a2b",
    };

    const state = {
        category: "",
        region: "",
        activeId: records[0].id,
        center: null,
        zoom: null,
    };

    const recordLookup = new Map(records.map((item) => [item.id, item]));
    const chart = echarts.init(mapNode);

    const response = await fetch("/static/vendor/maps/100000.json");
    const chinaGeoJson = await response.json();
    echarts.registerMap("china-local", chinaGeoJson);

    function filteredRecords() {
        return records.filter((item) => {
            const categoryMatch = !state.category || item.category === state.category;
            const regionMatch = !state.region || item.region === state.region;
            return categoryMatch && regionMatch;
        });
    }

    function syncViewportFromState() {
        const regionViewport = state.region ? viewports[state.region] : null;
        state.center = regionViewport?.center || [104.0, 35.8];
        state.zoom = regionViewport?.zoom || 1.15;
    }

    function focusMapOnRecord(record) {
        if (!record) {
            syncViewportFromState();
            return;
        }
        state.center = [record.lng, record.lat];
        state.zoom = Math.max(state.region ? (viewports[state.region]?.zoom || 1.15) : 1.15, 2.8);
    }

    function setFocus(record) {
        if (!record) {
            return;
        }
        state.activeId = record.id;
        if (focusTitle) {
            focusTitle.textContent = record.title || "";
        }
        if (focusMeta) {
            focusMeta.innerHTML = [record.region, record.category, record.era]
                .filter(Boolean)
                .map((entry) => `<span>${entry}</span>`)
                .join("");
        }
        if (focusImage && record.image) {
            focusImage.src = record.image;
            focusImage.alt = record.title || "";
        }
        if (focusSummary) {
            focusSummary.textContent = record.summary || "";
        }
        if (focusLink) {
            focusLink.href = record.href || "#";
        }
    }

    function syncControls(visible) {
        categoryChips.forEach((chip) => {
            chip.classList.toggle("is-active", (chip.dataset.mapCategory || "") === state.category);
        });
        resultCards.forEach((card) => {
            const record = recordLookup.get(card.dataset.mapResult);
            const isVisible = !!record && visible.some((item) => item.id === record.id);
            card.hidden = !isVisible;
            card.classList.toggle("is-active", isVisible && card.dataset.mapResult === state.activeId);
        });
    }

    function mapOption(visible) {
        const scatter = visible.map((item) => ({
            name: item.title,
            value: [item.lng, item.lat, 1],
            itemId: item.id,
            itemStyle: { color: palette[item.category] || "#7d5c43" },
        }));

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "item",
                backgroundColor: "rgba(31, 23, 18, 0.92)",
                borderColor: "rgba(255, 238, 211, 0.16)",
                textStyle: { color: "#fff5e5" },
                formatter(params) {
                    const record = recordLookup.get(params.data?.itemId);
                    if (!record) {
                        return params.name || "";
                    }
                    return [
                        `<strong>${record.title}</strong>`,
                        [record.region, record.category, record.era].filter(Boolean).join(" · "),
                        record.summary || "",
                    ].join("<br>");
                },
            },
            geo: {
                map: "china-local",
                roam: true,
                zoom: state.zoom || 1.15,
                center: state.center || [104.0, 35.8],
                label: {
                    show: !state.region,
                    color: "#7f6a55",
                    fontSize: 11,
                },
                itemStyle: {
                    areaColor: "#efe6d8",
                    borderColor: "#b59877",
                    borderWidth: 1.1,
                    shadowBlur: 18,
                    shadowColor: "rgba(88, 56, 33, 0.12)",
                },
                emphasis: {
                    label: { color: "#6d3c24" },
                    itemStyle: {
                        areaColor: "#dfcfb7",
                    },
                },
            },
            series: [
                {
                    type: "effectScatter",
                    coordinateSystem: "geo",
                    zlevel: 3,
                    rippleEffect: {
                        scale: 4,
                        brushType: "stroke",
                    },
                    symbolSize(params) {
                        const active = params.data?.itemId === state.activeId;
                        return active ? 15 : 10;
                    },
                    itemStyle: {
                        shadowBlur: 16,
                        shadowColor: "rgba(84, 52, 28, 0.28)",
                        borderColor: "#fff7e8",
                        borderWidth: 2,
                    },
                    data: scatter,
                },
            ],
        };
    }

    function render() {
        const visible = filteredRecords();
        if (!visible.some((item) => item.id === state.activeId)) {
            state.activeId = visible[0]?.id || records[0].id;
        }
        const activeRecord = recordLookup.get(state.activeId);
        if (activeRecord) {
            focusMapOnRecord(activeRecord);
        } else {
            syncViewportFromState();
        }
        setFocus(activeRecord);
        syncControls(visible);
        chart.setOption(mapOption(visible), true);
        const activeIndex = visible.findIndex((item) => item.id === state.activeId);
        if (activeIndex >= 0) {
            chart.dispatchAction({ type: "showTip", seriesIndex: 0, dataIndex: activeIndex });
        }
    }

    chart.on("click", (params) => {
        const record = recordLookup.get(params.data?.itemId);
        if (!record) {
            return;
        }
        setFocus(record);
        render();
    });

    categoryChips.forEach((chip) => {
        chip.addEventListener("click", () => {
            state.category = chip.dataset.mapCategory || "";
            render();
        });
    });

    if (regionSelect) {
        regionSelect.addEventListener("change", () => {
            state.region = regionSelect.value || "";
            syncViewportFromState();
            render();
        });
    }

    resultCards.forEach((card) => {
        card.addEventListener("click", () => {
            const record = recordLookup.get(card.dataset.mapResult);
            if (!record) {
                return;
            }
            setFocus(record);
            render();
        });
    });

    regionJumpButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const region = button.dataset.mapRegionJump || "";
            state.region = region;
            if (regionSelect) {
                regionSelect.value = region;
            }
            syncViewportFromState();
            render();
            mapSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    window.addEventListener("resize", () => chart.resize());
    syncViewportFromState();
    render();
});
