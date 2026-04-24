document.addEventListener("DOMContentLoaded", async () => {
    const regionToolbar = document.querySelector("#viz-region-toolbar");
    const regionMap = document.querySelector("#viz-region-map");
    const regionPanel = document.querySelector("#viz-region-panel");
    const heatmapBoard = document.querySelector("#viz-heatmap-board");
    const mapBack = document.querySelector("#viz-map-back");
    const mapStatus = document.querySelector("#viz-map-status");

    if (!regionToolbar || !regionMap || !regionPanel || !mapBack || !mapStatus) {
        return;
    }

    const COUNTRY_ADCODE = "100000";
    const COUNTRY_MAP_NAME = "china";
    const REGION_ORDER = [
        "北京", "天津", "河北", "山西", "内蒙古",
        "辽宁", "吉林", "黑龙江", "上海", "江苏",
        "浙江", "安徽", "福建", "江西", "山东",
        "河南", "湖北", "湖南", "广东", "广西",
        "海南", "重庆", "四川", "贵州", "云南",
        "西藏", "陕西", "甘肃", "青海", "宁夏",
        "新疆", "台湾", "香港", "澳门",
    ];
    const EXTRA_REGION_ORDER = ["未标注或不详"];
    const DATASET_PRIORITY = { buildings: 0, scientists: 1, treatises: 2, culture: 3 };
    const PANEL_PAGE_SIZE = 2;
    const NON_MAP_REGIONS = new Set(EXTRA_REGION_ORDER);
    const ERA_COLORS = ["#c84f38", "#df7842", "#eca156", "#f1be67", "#d0a85b", "#a78342", "#7c6541"];
    const BUILDING_CATEGORY_COLORS = {
        "皇宫": "#b55435",
        "官府": "#cb7a3a",
        "桥梁": "#b68d41",
        "民居": "#8d5a34",
        "城防工程": "#8a6448",
        "水利工程": "#92723b",
        "塔楼": "#ad6542",
        "园林": "#9f7a4b",
    };
    const PROVINCE_META = {
        "北京": { adcode: "110000" },
        "天津": { adcode: "120000" },
        "河北": { adcode: "130000" },
        "山西": { adcode: "140000" },
        "内蒙古": { adcode: "150000" },
        "辽宁": { adcode: "210000" },
        "吉林": { adcode: "220000" },
        "黑龙江": { adcode: "230000" },
        "上海": { adcode: "310000" },
        "江苏": { adcode: "320000" },
        "浙江": { adcode: "330000" },
        "安徽": { adcode: "340000" },
        "福建": { adcode: "350000" },
        "江西": { adcode: "360000" },
        "山东": { adcode: "370000" },
        "河南": { adcode: "410000" },
        "湖北": { adcode: "420000" },
        "湖南": { adcode: "430000" },
        "广东": { adcode: "440000" },
        "广西": { adcode: "450000" },
        "海南": { adcode: "460000" },
        "重庆": { adcode: "500000" },
        "四川": { adcode: "510000" },
        "贵州": { adcode: "520000" },
        "云南": { adcode: "530000" },
        "西藏": { adcode: "540000" },
        "陕西": { adcode: "610000" },
        "甘肃": { adcode: "620000" },
        "青海": { adcode: "630000" },
        "宁夏": { adcode: "640000" },
        "新疆": { adcode: "650000" },
        "台湾": { adcode: "710000" },
        "香港": { adcode: "810000" },
        "澳门": { adcode: "820000" },
    };
    const ADCODE_TO_REGION = Object.fromEntries(
        Object.entries(PROVINCE_META).map(([name, meta]) => [meta.adcode, name]),
    );
    const PROVINCE_LOCALITY_ALIASES = {
        "北京": {
            "丰台": "丰台区",
        },
        "河北": {
            "保定": "保定市",
            "赵县": "石家庄市",
            "邢台": "邢台市",
        },
        "山西": {
            "灵石": "晋中市",
            "祁县": "晋中市",
            "临猗": "运城市",
            "霍州": "临汾市",
            "应县": "朔州市",
        },
        "内蒙古": {
            "呼和浩特": "呼和浩特市",
        },
        "辽宁": {
            "沈阳": "沈阳市",
        },
        "江苏": {
            "南京": "南京市",
            "苏州": "苏州市",
            "淮安": "淮安市",
            "丰县": "徐州市",
        },
        "浙江": {
            "杭州": "杭州市",
        },
        "安徽": {
            "黄山": "黄山市",
        },
        "福建": {
            "泉州": "泉州市",
            "晋江": "泉州市",
            "漳州": "漳州市",
            "龙岩": "龙岩市",
            "仙游": "莆田市",
        },
        "江西": {
            "浮梁": "景德镇市",
            "建昌": "抚州市",
        },
        "山东": {
            "曲阜": "济宁市",
            "泰安": "泰安市",
            "蒙阴": "临沂市",
        },
        "河南": {
            "南阳": "南阳市",
            "内乡": "南阳市",
            "叶县": "平顶山市",
            "新密": "郑州市",
            "郑州": "郑州市",
        },
        "湖南": {
            "湘西": "湘西土家族苗族自治州",
        },
        "广东": {
            "潮州": "潮州市",
            "开平": "江门市",
        },
        "四川": {
            "泸定": "甘孜藏族自治州",
            "都江堰": "成都市",
        },
        "云南": {
            "昆明": "昆明市",
        },
        "陕西": {
            "西安": "西安市",
            "岐山": "宝鸡市",
        },
    };

    const state = {
        items: [],
        overview: window.SITE_OVERVIEW || {},
        regionLookup: new Map(),
        navRegions: [],
        selectedRegionKey: "",
        regionPanelPage: 1,
        currentMapLevel: "country",
        activeProvinceKey: "",
        mapBundles: new Map(),
        mapProvinceSet: new Set(),
        provinceCenters: {},
        provinceFeatureNames: {},
    };

    let mapChart = null;

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function normalizeRegionKey(value) {
        const cleaned = String(value || "").trim();
        if (!cleaned || /^\?+$/.test(cleaned)) {
            return "未标注";
        }
        if (["未标注", "不详", "中国", "未标注或不详"].includes(cleaned)) {
            return "未标注或不详";
        }
        if (cleaned === "北京市") return "北京";
        if (cleaned === "天津市") return "天津";
        if (cleaned === "上海市") return "上海";
        if (cleaned === "重庆市") return "重庆";
        return cleaned
            .replace(/特别行政区$/, "")
            .replace(/维吾尔自治区$/, "")
            .replace(/壮族自治区$/, "")
            .replace(/回族自治区$/, "")
            .replace(/自治区$/, "")
            .replace(/省$/, "");
    }

    function getProvinceFeatureName(regionKey) {
        return state.provinceFeatureNames[regionKey] || regionKey;
    }

    function getRegionByMapName(name) {
        return state.regionLookup.get(normalizeRegionKey(name));
    }

    function hasProvinceGeometry(regionKey) {
        return state.mapProvinceSet.has(normalizeRegionKey(regionKey));
    }

    function getProvinceCenter(regionKey) {
        return state.provinceCenters[normalizeRegionKey(regionKey)] || null;
    }

    function bindRegionToolbarEvents() {
        regionToolbar.querySelectorAll("[data-region-key]").forEach((button) => {
            if (button.hasAttribute("disabled")) {
                return;
            }

            button.addEventListener("click", async () => {
                await pickRegion(button.getAttribute("data-region-key") || "", { openProvinceMap: true });
            });
        });
    }

    function renderRegionToolbarMarkup() {
        regionToolbar.innerHTML = state.navRegions.map((region) => {
            const isActive = region.key === state.selectedRegionKey;
            const isDisabled = region.count === 0;
            return `
                <button
                    type="button"
                    class="viz-region-link${isActive ? " is-active" : ""}${isDisabled ? " is-disabled" : ""}"
                    data-region-key="${escapeHTML(region.key)}"
                    title="${escapeHTML(`${region.label} ${region.count} 条`)}"
                    ${isDisabled ? "disabled aria-disabled=\"true\"" : ""}
                >
                    <span class="viz-region-link-text">${escapeHTML(region.label)}</span>
                </button>
            `;
        }).join("");
        bindRegionToolbarEvents();
    }

    function normalizeHeatmapRegionKey(value) {
        const normalized = normalizeRegionKey(value);
        return hasProvinceGeometry(normalized) ? normalized : "";
    }

    function buildHeatmapFallback(items) {
        const buildingItems = items.filter((item) => item.dataset === "buildings" && item.category);
        if (!buildingItems.length) {
            return null;
        }

        const regionCounts = new Map();
        const categoryCounts = new Map();
        const cellCounts = new Map();

        buildingItems.forEach((item) => {
            const regionKey = normalizeRegionKey(item.region_short) || "未标注或不详";
            upsertCounter(regionCounts, regionKey, { label: regionKey }).count += 1;
            upsertCounter(categoryCounts, item.category, {
                label: item.category,
                color: BUILDING_CATEGORY_COLORS[item.category] || "#9c4f2f",
            }).count += 1;
            const cellKey = `${regionKey}__${item.category}`;
            cellCounts.set(cellKey, (cellCounts.get(cellKey) || 0) + 1);
        });

        const topCategories = sortByCount(Array.from(categoryCounts.values())).slice(0, 6);
        const topRegions = sortByCount(Array.from(regionCounts.values())).slice(0, 8);

        if (!topCategories.length || !topRegions.length) {
            return null;
        }

        const maxValue = Math.max(
            ...topCategories.flatMap((category) => {
                return topRegions.map((region) => cellCounts.get(`${region.label}__${category.label}`) || 0);
            }),
            1,
        );

        const rows = topCategories.map((category) => {
            const cells = topRegions.map((region) => {
                const count = cellCounts.get(`${region.label}__${category.label}`) || 0;
                return {
                    region: region.label,
                    count,
                    intensity: count / maxValue,
                    color: category.color,
                };
            });

            return {
                label: category.label,
                color: category.color,
                total: category.count,
                cells,
            };
        });

        let hottest = null;
        rows.forEach((row) => {
            row.cells.forEach((cell) => {
                if (!hottest || cell.count > hottest.count) {
                    hottest = { ...cell, category: row.label };
                }
            });
        });

        return {
            regions: topRegions,
            rows,
            hottest,
            isFallback: true,
        };
    }

    function sortByCount(items) {
        return [...items].sort((left, right) => {
            return right.count - left.count || String(left.label).localeCompare(String(right.label), "zh-Hans-CN");
        });
    }

    function upsertCounter(map, key, seed) {
        if (!map.has(key)) {
            map.set(key, { ...seed, count: 0 });
        }
        return map.get(key);
    }

    function getDatasetMeta(datasetKey) {
        return (state.overview.dataset_stats || []).find((item) => item.key === datasetKey) || {
            key: datasetKey,
            label: datasetKey,
            accent: "#8b5a32",
        };
    }

    function shortDatasetLabel(label) {
        return String(label || "").replace(/^中国古代建筑/, "");
    }

    function createEmptyRegion(key) {
        return {
            key,
            label: key,
            count: 0,
            items: [],
            datasetCounts: new Map(),
            categoryCounts: new Map(),
            eraCounts: new Map(),
        };
    }

    function buildRegionLookup(items) {
        const buckets = new Map();

        items.forEach((item) => {
            const key = normalizeRegionKey(item.region_short);
            const bucketKey = ["未标注", "不详", "中国", "未标注或不详", ""].includes(key) ? "未标注或不详" : key;
            const bucket = buckets.get(bucketKey) || createEmptyRegion(bucketKey);
            buckets.set(bucketKey, bucket);

            bucket.count += 1;
            bucket.items.push(item);

            const datasetMeta = getDatasetMeta(item.dataset);
            upsertCounter(bucket.datasetCounts, item.dataset, {
                key: item.dataset,
                label: datasetMeta.label,
                accent: datasetMeta.accent,
            }).count += 1;

            if (item.category) {
                upsertCounter(bucket.categoryCounts, item.category, { label: item.category }).count += 1;
            }

            const eraLabel = item.era || item.year_label || "未标注";
            upsertCounter(bucket.eraCounts, eraLabel, { label: eraLabel }).count += 1;
        });

        return buckets;
    }

    function buildNavigationRegions(regionLookup) {
        const ordered = REGION_ORDER.map((name) => regionLookup.get(name) || createEmptyRegion(name));
        const extraNamed = EXTRA_REGION_ORDER
            .map((name) => regionLookup.get(name))
            .filter(Boolean);
        const extraDynamic = sortByCount(
            Array.from(regionLookup.values()).filter((region) => {
                return !REGION_ORDER.includes(region.key) && !EXTRA_REGION_ORDER.includes(region.key);
            }),
        );

        return [...ordered, ...extraNamed, ...extraDynamic];
    }

    async function fetchJSON(url) {
        const response = await fetch(url, { credentials: "same-origin" });
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
    }

    function getMapBaseUrl() {
        return String(window.VISUALIZATION_MAP_BASE_URL || "/static/vendor/maps").replace(/\/$/, "");
    }

    function getMapFileUrl(adcode) {
        return `${getMapBaseUrl()}/${adcode}.json`;
    }

    function getMapName(adcode) {
        return adcode === COUNTRY_ADCODE ? COUNTRY_MAP_NAME : `province-${adcode}`;
    }

    async function ensureMapRegistered(adcode) {
        if (state.mapBundles.has(adcode)) {
            return state.mapBundles.get(adcode);
        }

        if (!window.echarts || typeof window.echarts.registerMap !== "function") {
            throw new Error("ECharts unavailable");
        }

        const mapName = getMapName(adcode);
        const existing = window.echarts.getMap && window.echarts.getMap(mapName);
        if (existing) {
            const bundle = { adcode, mapName, mapRecord: existing };
            state.mapBundles.set(adcode, bundle);
            return bundle;
        }

        const geoJson = await fetchJSON(getMapFileUrl(adcode));
        window.echarts.registerMap(mapName, geoJson);
        const mapRecord = window.echarts.getMap(mapName) || { geoJSON: geoJson };
        const bundle = { adcode, mapName, mapRecord };
        state.mapBundles.set(adcode, bundle);
        return bundle;
    }

    function getGeoJsonFromMapRecord(mapRecord) {
        if (!mapRecord) {
            return null;
        }
        return mapRecord.geoJSON || mapRecord.geoJson || mapRecord;
    }

    function getFeatureCenter(feature) {
        const properties = feature?.properties || {};
        const center = properties.center || properties.centroid || properties.cp;
        return Array.isArray(center) && center.length === 2 ? center : null;
    }

    function extractProvinceCenters(mapRecord) {
        const geoJson = getGeoJsonFromMapRecord(mapRecord);
        const features = Array.isArray(geoJson?.features) ? geoJson.features : [];
        const centers = {};

        features.forEach((feature) => {
            const name = feature?.properties?.name;
            const center = getFeatureCenter(feature);
            if (name && center) {
                centers[normalizeRegionKey(name)] = center;
            }
        });

        return centers;
    }

    function extractProvinceFeatureNames(mapRecord) {
        const geoJson = getGeoJsonFromMapRecord(mapRecord);
        const features = Array.isArray(geoJson?.features) ? geoJson.features : [];
        const featureNames = {};

        features.forEach((feature) => {
            const name = feature?.properties?.name;
            if (name) {
                featureNames[normalizeRegionKey(name)] = name;
            }
        });

        return featureNames;
    }

    function getActiveRegion() {
        return state.regionLookup.get(state.selectedRegionKey) || state.navRegions.find((region) => region.count > 0) || null;
    }

    function sortPanelRecords(records) {
        return [...records].sort((left, right) => {
            const leftOrder = DATASET_PRIORITY[left.dataset] ?? 9;
            const rightOrder = DATASET_PRIORITY[right.dataset] ?? 9;
            const leftYear = left.year_sort ?? 999999;
            const rightYear = right.year_sort ?? 999999;
            return leftOrder - rightOrder || leftYear - rightYear || String(left.title).localeCompare(String(right.title), "zh-Hans-CN");
        });
    }

    function compactText(value, limit = 56) {
        const normalized = String(value || "").replace(/\s+/g, " ").trim();
        if (!normalized) {
            return "";
        }
        return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}…`;
    }

    function getProvinceMeta(regionKey) {
        return PROVINCE_META[regionKey] || null;
    }

    function buildFeatureNameVariants(name) {
        const variants = new Set();
        const cleaned = String(name || "").trim();
        if (!cleaned) {
            return variants;
        }

        variants.add(cleaned);
        [
            cleaned.replace(/特别行政区$/, ""),
            cleaned.replace(/自治区$/, ""),
            cleaned.replace(/自治州$/, ""),
            cleaned.replace(/自治县$/, ""),
            cleaned.replace(/地区$/, ""),
            cleaned.replace(/盟$/, ""),
            cleaned.replace(/市$/, ""),
            cleaned.replace(/区$/, ""),
            cleaned.replace(/县$/, ""),
        ].forEach((value) => {
            if (value) {
                variants.add(value);
            }
        });

        return variants;
    }

    function buildFeatureLookup(mapRecord) {
        const geoJson = getGeoJsonFromMapRecord(mapRecord);
        const features = Array.isArray(geoJson?.features) ? geoJson.features : [];
        const exact = new Map();
        const variants = new Map();

        features.forEach((feature) => {
            const name = feature?.properties?.name;
            const center = getFeatureCenter(feature);
            if (!name || !center) {
                return;
            }

            const entry = { name, center, feature };
            exact.set(name, entry);
            buildFeatureNameVariants(name).forEach((variant) => {
                if (!variants.has(variant)) {
                    variants.set(variant, entry);
                }
            });
        });

        return {
            features,
            exact,
            variants,
        };
    }

    function stripParenthetical(value) {
        return String(value || "")
            .replace(/（[^）]*）/g, "")
            .replace(/\([^)]*\)/g, "")
            .trim();
    }

    function extractLocalityCandidates(regionText, provinceKey) {
        const cleaned = stripParenthetical(regionText);
        if (!cleaned || cleaned === "不详" || cleaned.includes("多省")) {
            return [];
        }

        const pieces = cleaned
            .split(/[、，,\/]/)
            .map((value) => value.trim())
            .filter(Boolean);

        const candidates = [];
        pieces.forEach((piece) => {
            let value = piece;
            if (value.startsWith(provinceKey)) {
                value = value.slice(provinceKey.length);
            }

            value = value.trim();
            if (!value) {
                candidates.push(provinceKey);
                return;
            }

            if (value !== "推测") {
                candidates.push(value);
            }
        });

        return candidates;
    }

    function findFeatureEntry(provinceKey, candidate, featureLookup) {
        const aliasMap = PROVINCE_LOCALITY_ALIASES[provinceKey] || {};
        const cleaned = String(candidate || "").trim();
        if (!cleaned) {
            return null;
        }

        const attempts = new Set([
            cleaned,
            aliasMap[cleaned] || "",
            `${cleaned}市`,
            `${cleaned}区`,
            `${cleaned}县`,
            `${cleaned}盟`,
            `${cleaned}地区`,
        ]);

        attempts.forEach((value) => {
            if (!value) {
                return;
            }
            buildFeatureNameVariants(value).forEach((variant) => attempts.add(variant));
        });

        for (const value of attempts) {
            if (featureLookup.exact.has(value)) {
                return featureLookup.exact.get(value);
            }
            if (featureLookup.variants.has(value)) {
                return featureLookup.variants.get(value);
            }
        }

        return null;
    }

    function resolveProvinceLocation(item, provinceKey, featureLookup) {
        const provinceCenter = state.provinceCenters[provinceKey] || null;
        const candidates = extractLocalityCandidates(item.region, provinceKey);

        if (!candidates.length) {
            return provinceCenter ? {
                label: provinceKey,
                coords: provinceCenter,
                featureName: "",
            } : null;
        }

        for (const candidate of candidates) {
            if (candidate === provinceKey) {
                return provinceCenter ? {
                    label: provinceKey,
                    coords: provinceCenter,
                    featureName: "",
                } : null;
            }

            const featureEntry = findFeatureEntry(provinceKey, candidate, featureLookup);
            if (featureEntry) {
                return {
                    label: candidate,
                    coords: featureEntry.center,
                    featureName: featureEntry.name,
                };
            }
        }

        return provinceCenter ? {
            label: candidates[0],
            coords: provinceCenter,
            featureName: "",
        } : null;
    }

    function buildProvinceMapPayload(provinceKey, mapRecord) {
        const region = state.regionLookup.get(provinceKey) || createEmptyRegion(provinceKey);
        const featureLookup = buildFeatureLookup(mapRecord);
        const areaCounts = new Map();
        const pointGroups = new Map();

        region.items.forEach((item) => {
            const resolved = resolveProvinceLocation(item, provinceKey, featureLookup);
            if (!resolved || !Array.isArray(resolved.coords)) {
                return;
            }

            if (resolved.featureName) {
                areaCounts.set(resolved.featureName, (areaCounts.get(resolved.featureName) || 0) + 1);
            }

            const key = `${resolved.label}__${resolved.coords.join(",")}`;
            if (!pointGroups.has(key)) {
                pointGroups.set(key, {
                    name: resolved.label,
                    coords: resolved.coords,
                    featureName: resolved.featureName,
                    count: 0,
                    titles: [],
                });
            }

            const group = pointGroups.get(key);
            group.count += 1;
            if (group.titles.length < 4) {
                group.titles.push(item.title);
            }
        });

        const areaData = featureLookup.features.map((feature) => {
            const name = feature?.properties?.name;
            return {
                name,
                value: areaCounts.get(name) || 0,
            };
        });

        const pointData = Array.from(pointGroups.values()).map((group) => ({
            name: group.name,
            value: [...group.coords, group.count],
            count: group.count,
            titles: group.titles,
            featureName: group.featureName,
        }));

        const maxCount = Math.max(
            ...pointData.map((item) => item.count),
            ...areaData.map((item) => Number(item.value) || 0),
            1,
        );

        return {
            areaData,
            pointData,
            maxCount,
        };
    }

    function ensureMapChart() {
        if (mapChart) {
            return mapChart;
        }

        mapChart = window.echarts.init(regionMap);
        mapChart.on("click", async (params) => {
            if (!params?.name) {
                return;
            }

            if (state.currentMapLevel === "country") {
                const regionKey = normalizeRegionKey(params.name);
                const region = state.regionLookup.get(regionKey);
                if (!region || region.count <= 0 || !getProvinceMeta(regionKey)) {
                    return;
                }
                await enterProvinceView(regionKey);
            }
        });

        window.addEventListener("resize", () => {
            mapChart?.resize();
        }, { passive: true });

        return mapChart;
    }

    function renderRegionToolbar() {
        renderRegionToolbarMarkup();
    }

    function syncMapChrome() {
        const inProvince = state.currentMapLevel === "province" && !!state.activeProvinceKey;

        mapBack.hidden = !inProvince;
        mapBack.textContent = "返回";
        mapStatus.textContent = inProvince ? `${state.activeProvinceKey}省内分布` : "全国分布";

        regionMap.dataset.mapLevel = state.currentMapLevel;
        regionMap.dataset.activeProvince = state.activeProvinceKey || "";
    }

    function renderRegionMapFallback(message) {
        syncMapChrome();
        if (mapChart) {
            mapChart.dispose();
            mapChart = null;
        }
        regionMap.innerHTML = `<div class="viz-region-empty">${escapeHTML(message)}</div>`;
    }

    function renderCountryMap() {
        const countryBundle = state.mapBundles.get(COUNTRY_ADCODE);
        if (!countryBundle) {
            renderRegionMapFallback("全国地图资源尚未准备完成。");
            return;
        }

        const mapRegions = state.navRegions.filter((region) => {
            return region.count > 0 && !NON_MAP_REGIONS.has(region.key) && hasProvinceGeometry(region.key);
        });
        const maxCount = Math.max(...mapRegions.map((region) => region.count), 1);
        const selectedMapRegion = hasProvinceGeometry(state.selectedRegionKey) ? state.selectedRegionKey : "";

        const mapData = REGION_ORDER
            .filter((name) => hasProvinceGeometry(name))
            .map((name) => {
                const region = state.regionLookup.get(name);
                return {
                    name: getProvinceFeatureName(name),
                    value: region?.count || 0,
                    selected: name === selectedMapRegion,
                };
            });

        const scatterData = mapRegions
            .map((region) => {
                const center = getProvinceCenter(region.key);
                if (!Array.isArray(center)) {
                    return null;
                }

                return {
                    name: region.key,
                    value: [...center, region.count],
                    count: region.count,
                };
            })
            .filter(Boolean);

        syncMapChrome();

        ensureMapChart().setOption({
            animation: false,
            tooltip: {
                trigger: "item",
                backgroundColor: "rgba(255, 255, 255, 0.96)",
                borderColor: "rgba(157, 181, 188, 0.75)",
                borderWidth: 1,
                textStyle: {
                    color: "#42515b",
                },
                formatter: (params) => {
                    const region = getRegionByMapName(params.name);
                    if (!region) {
                        return escapeHTML(normalizeRegionKey(params.name || ""));
                    }

                    const topDataset = sortByCount(Array.from(region.datasetCounts.values()))[0];
                    const datasetText = topDataset ? `主数据：${topDataset.label} ${topDataset.count} 条` : "暂无细分数据";
                    return `${escapeHTML(region.label)}<br/>收录 ${region.count} 条<br/>${escapeHTML(datasetText)}`;
                },
            },
            visualMap: {
                min: 0,
                max: maxCount,
                show: false,
                calculable: false,
                inRange: {
                    color: ["#edf6f8", "#d6ebf0", "#b7d7df", "#90bcc9"],
                },
            },
            geo: {
                map: countryBundle.mapName,
                roam: false,
                zoom: 1.06,
                layoutCenter: ["45%", "54%"],
                layoutSize: "98%",
                selectedMode: "single",
                emphasis: {
                    label: { show: false },
                    itemStyle: {
                        areaColor: "#dcecef",
                        borderColor: "#7e99a4",
                        borderWidth: 1.45,
                    },
                },
                select: {
                    disabled: false,
                    label: { show: false },
                    itemStyle: {
                        areaColor: "#cfe3e9",
                        borderColor: "#708994",
                        borderWidth: 1.55,
                    },
                },
                itemStyle: {
                    areaColor: "#edf6f8",
                    borderColor: "#a8bcc4",
                    borderWidth: 1.2,
                },
            },
            series: [
                {
                    type: "map",
                    map: countryBundle.mapName,
                    geoIndex: 0,
                    data: mapData,
                    silent: false,
                    selectedMode: "single",
                    label: { show: false },
                },
                {
                    type: "scatter",
                    coordinateSystem: "geo",
                    symbol: "circle",
                    zlevel: 3,
                    itemStyle: {
                        color: "#7d9f33",
                        borderColor: "#ffffff",
                        borderWidth: 3,
                        shadowBlur: 12,
                        shadowColor: "rgba(79, 114, 28, 0.22)",
                    },
                    data: scatterData,
                    symbolSize: (value) => {
                        const count = value[2] || 0;
                        return 11 + (count / maxCount) * 11;
                    },
                },
            ],
        }, true);
    }

    function renderProvinceMap() {
        const provinceKey = state.activeProvinceKey;
        const provinceMeta = getProvinceMeta(provinceKey);
        if (!provinceMeta) {
            renderCountryMap();
            return;
        }

        const provinceBundle = state.mapBundles.get(provinceMeta.adcode);
        if (!provinceBundle) {
            renderRegionMapFallback(`${provinceKey} 地图加载失败，请稍后重试。`);
            return;
        }

        const payload = buildProvinceMapPayload(provinceKey, provinceBundle.mapRecord);
        syncMapChrome();

        ensureMapChart().setOption({
            animation: false,
            tooltip: {
                trigger: "item",
                backgroundColor: "rgba(255, 255, 255, 0.96)",
                borderColor: "rgba(157, 181, 188, 0.75)",
                borderWidth: 1,
                textStyle: {
                    color: "#42515b",
                },
                formatter: (params) => {
                    if (params.seriesType === "scatter") {
                        const titles = Array.isArray(params.data?.titles) ? params.data.titles : [];
                        const titleLine = titles.length ? `<br/>${titles.map(escapeHTML).join(" / ")}` : "";
                        return `${escapeHTML(params.name)}<br/>收录 ${params.data?.count || 0} 条${titleLine}`;
                    }

                    return `${escapeHTML(params.name)}<br/>收录 ${Number(params.value) || 0} 条`;
                },
            },
            visualMap: {
                min: 0,
                max: payload.maxCount,
                show: false,
                calculable: false,
                inRange: {
                    color: ["#edf6f8", "#d7ebf0", "#b8d8e0", "#8fbcc8"],
                },
            },
            geo: {
                map: provinceBundle.mapName,
                roam: false,
                layoutCenter: ["46%", "55%"],
                layoutSize: "90%",
                emphasis: {
                    label: { show: false },
                    itemStyle: {
                        areaColor: "#d7e9ec",
                        borderColor: "#7f98a1",
                        borderWidth: 1.4,
                    },
                },
                itemStyle: {
                    areaColor: "#edf6f8",
                    borderColor: "#aac0c8",
                    borderWidth: 1.2,
                },
            },
            series: [
                {
                    type: "map",
                    map: provinceBundle.mapName,
                    geoIndex: 0,
                    data: payload.areaData,
                    silent: false,
                    label: { show: false },
                },
                {
                    type: "scatter",
                    coordinateSystem: "geo",
                    symbol: "circle",
                    zlevel: 3,
                    itemStyle: {
                        color: "#7d9f33",
                        borderColor: "#ffffff",
                        borderWidth: 3,
                        shadowBlur: 12,
                        shadowColor: "rgba(79, 114, 28, 0.22)",
                    },
                    data: payload.pointData,
                    symbolSize: (value) => {
                        const count = value[2] || 0;
                        return 11 + count * 2.1;
                    },
                },
            ],
        }, true);
    }

    function renderRegionMap() {
        if (!window.echarts) {
            renderRegionMapFallback("图表资源尚未加载完成。");
            return;
        }

        if (state.currentMapLevel === "province" && state.activeProvinceKey) {
            renderProvinceMap();
            return;
        }

        renderCountryMap();
    }

    function buildPanelSummary(item) {
        const primary = compactText(item.summary, 78);
        const secondary = compactText(item.body, 116);

        if (primary && secondary && secondary !== primary) {
            return `${primary} ${secondary}`;
        }

        return secondary || primary || "暂无简介";
    }

    function buildPanelFacts(item) {
        return [
            {
                label: "地点",
                value: compactText(item.region || "未标注或不详", 72),
            },
            {
                label: "类型",
                value: compactText(item.category || shortDatasetLabel(item.dataset_label) || "未标注", 52),
            },
            {
                label: "年代",
                value: compactText(item.era || item.year_label || "未标注", 52),
            },
            {
                label: "简介",
                value: buildPanelSummary(item),
                kind: "summary",
            },
        ];
    }

    function renderRegionPanel() {
        const region = getActiveRegion();
        if (!region) {
            regionPanel.innerHTML = '<div class="viz-region-panel-empty">暂无可用地区数据。</div>';
            return;
        }

        const sortedRecords = sortPanelRecords(region.items);
        const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PANEL_PAGE_SIZE));
        state.regionPanelPage = Math.min(Math.max(state.regionPanelPage, 1), totalPages);

        const startIndex = (state.regionPanelPage - 1) * PANEL_PAGE_SIZE;
        const visibleRecords = sortedRecords.slice(startIndex, startIndex + PANEL_PAGE_SIZE);
        const panelSlots = Array.from({ length: PANEL_PAGE_SIZE }, (_, index) => visibleRecords[index] || null);
        const footerHint = NON_MAP_REGIONS.has(region.key)
            ? "当前条目没有明确省级定位。"
            : (state.currentMapLevel === "province" && state.activeProvinceKey === region.key)
                ? "当前处于省级地图。"
                : "点击左侧地图切换地区。";

        regionPanel.innerHTML = `
            <div class="viz-region-records">
                ${panelSlots.map((item) => {
                    if (!item) {
                        return `
                            <div class="viz-region-record viz-region-record--empty">
                                <div class="viz-region-record-title">
                                    <span class="viz-region-record-pin" aria-hidden="true"></span>
                                    <strong>当前页没有更多条目</strong>
                                </div>
                                <p class="viz-region-record-summary">可切换其他地区，或返回全国地图继续查看。</p>
                            </div>
                        `;
                    }

                    const facts = buildPanelFacts(item);
                    return `
                        <a class="viz-region-record" href="${window.SiteApp.detailUrl(item)}">
                            <div class="viz-region-record-title">
                                <span class="viz-region-record-pin" aria-hidden="true"></span>
                                <strong>${escapeHTML(item.title)}</strong>
                            </div>
                            <div class="viz-region-record-facts">
                                ${facts.map((fact) => `
                                    <div class="viz-region-record-fact${fact.kind === "summary" ? " viz-region-record-fact--summary" : ""}">
                                        <span>${escapeHTML(fact.label)}：</span>
                                        <b>${escapeHTML(fact.value)}</b>
                                    </div>
                                `).join("")}
                            </div>
                        </a>
                    `;
                }).join("")}
            </div>

            <div class="viz-region-footer">
                <div class="viz-region-panel-count">
                    <strong>${escapeHTML(region.label)} ${region.count} 条</strong>
                    <span>${escapeHTML(footerHint)}</span>
                </div>
                <div class="viz-region-pager">
                    <span class="viz-region-pager-status">${state.regionPanelPage} / ${totalPages}</span>
                    <button
                        class="viz-region-pager-button"
                        type="button"
                        data-panel-action="prev"
                        aria-label="上一页"
                        ${state.regionPanelPage === 1 ? "disabled" : ""}
                    >&lsaquo;</button>
                    <button
                        class="viz-region-pager-button"
                        type="button"
                        data-panel-action="next"
                        aria-label="下一页"
                        ${state.regionPanelPage === totalPages ? "disabled" : ""}
                    >&rsaquo;</button>
                </div>
            </div>
        `;

        regionPanel.querySelectorAll("[data-panel-action]").forEach((button) => {
            button.addEventListener("click", () => {
                if (button.hasAttribute("disabled")) {
                    return;
                }

                if (button.getAttribute("data-panel-action") === "prev") {
                    state.regionPanelPage = Math.max(1, state.regionPanelPage - 1);
                } else {
                    state.regionPanelPage = Math.min(totalPages, state.regionPanelPage + 1);
                }

                renderRegionPanel();
            });
        });
    }

    function normalizeRegionKey(value) {
        const cleaned = String(value || "").trim();
        if (!cleaned || /^\?+$/.test(cleaned)) {
            return "未标注";
        }
        if (["未标注", "不详", "中国", "未标注或不详"].includes(cleaned)) {
            return "未标注或不详";
        }
        if (cleaned === "北京市") return "北京";
        if (cleaned === "天津市") return "天津";
        if (cleaned === "上海市") return "上海";
        if (cleaned === "重庆市") return "重庆";
        return cleaned
            .replace(/特别行政区$/, "")
            .replace(/维吾尔自治区$/, "")
            .replace(/壮族自治区$/, "")
            .replace(/回族自治区$/, "")
            .replace(/自治区$/, "")
            .replace(/省$/, "");
    }

    function buildNavigationRegions(regionLookup) {
        const ordered = REGION_ORDER.map((name) => regionLookup.get(name) || createEmptyRegion(name));
        const unknownRegion = regionLookup.get("未标注或不详");
        const extraDynamic = sortByCount(
            Array.from(regionLookup.values()).filter((region) => {
                return !REGION_ORDER.includes(region.key) && region.key !== "未标注或不详";
            }),
        );

        return [...ordered, ...(unknownRegion ? [unknownRegion] : []), ...extraDynamic];
    }

    function renderRegionToolbar() {
        renderRegionToolbarMarkup();
    }

    function renderDonut(targetSelector, items, centerLabel) {
        const target = document.querySelector(targetSelector);
        if (!target) {
            return;
        }

        const validItems = sortByCount(items.filter((item) => item.count > 0));
        const total = validItems.reduce((sum, item) => sum + item.count, 0);
        if (!total) {
            target.innerHTML = '<div class="viz-panel-empty">暂无可用数据。</div>';
            return;
        }

        let start = 0;
        const segments = validItems.map((item) => {
            const end = start + (item.count / total) * 360;
            const segment = `${item.color} ${start}deg ${end}deg`;
            start = end;
            return segment;
        });

        target.innerHTML = `
            <div class="viz-donut-wrap">
                <div class="viz-donut-chart-stage">
                    <div class="viz-donut-chart" style="background: conic-gradient(${segments.join(", ")});">
                        <div class="viz-donut-hole">
                            <strong>${total}</strong>
                            <span>${escapeHTML(centerLabel)}</span>
                        </div>
                    </div>
                </div>
                <div class="viz-donut-meta">
                    <div class="viz-donut-legend">
                        ${validItems.map((item) => `
                            <div class="viz-donut-legend-item">
                                <span class="viz-donut-legend-dot" style="background:${item.color}"></span>
                                <span>${escapeHTML(item.label)}</span>
                                <div class="viz-donut-legend-track">
                                    <span style="width:${((item.count / total) * 100).toFixed(1)}%; background:${item.color}"></span>
                                </div>
                                <strong>${((item.count / total) * 100).toFixed(1)}%</strong>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;
    }

    function buildHeatmapData(items) {
        const buildingItems = items.filter((item) => item.dataset === "buildings" && item.category);
        const regionCounts = new Map();
        const categoryCounts = new Map();
        const cellCounts = new Map();

        buildingItems.forEach((item) => {
            const regionKey = normalizeHeatmapRegionKey(item.region_short);
            if (!regionKey || NON_MAP_REGIONS.has(regionKey)) {
                return;
            }

            upsertCounter(regionCounts, regionKey, { label: regionKey }).count += 1;
            upsertCounter(categoryCounts, item.category, {
                label: item.category,
                color: BUILDING_CATEGORY_COLORS[item.category] || "#9c4f2f",
            }).count += 1;

            const cellKey = `${regionKey}__${item.category}`;
            cellCounts.set(cellKey, (cellCounts.get(cellKey) || 0) + 1);
        });

        const topRegions = sortByCount(Array.from(regionCounts.values())).slice(0, 8);
        const topCategories = sortByCount(Array.from(categoryCounts.values())).slice(0, 6);
        if (!topRegions.length || !topCategories.length) {
            return buildHeatmapFallback(items);
        }

        const maxValue = Math.max(
            ...topCategories.flatMap((category) => {
                return topRegions.map((region) => cellCounts.get(`${region.label}__${category.label}`) || 0);
            }),
            1,
        );

        const rows = topCategories.map((category) => {
            const cells = topRegions.map((region) => {
                const count = cellCounts.get(`${region.label}__${category.label}`) || 0;
                return {
                    region: region.label,
                    count,
                    intensity: count / maxValue,
                    color: category.color,
                };
            });

            return {
                label: category.label,
                color: category.color,
                total: category.count,
                cells,
            };
        });

        let hottest = null;
        rows.forEach((row) => {
            row.cells.forEach((cell) => {
                if (!hottest || cell.count > hottest.count) {
                    hottest = { ...cell, category: row.label };
                }
            });
        });

        return {
            regions: topRegions,
            rows,
            hottest,
            isFallback: false,
        };
    }

    function renderHeatmap() {
        if (!heatmapBoard) {
            return;
        }
        const data = buildHeatmapData(state.items);
        if (!data) {
            heatmapBoard.innerHTML = '<div class="viz-panel-empty">当前建筑数据不足以生成热力矩阵。</div>';
            return;
        }

        heatmapBoard.innerHTML = `
            <div class="viz-heatmap-shell">
                <div class="viz-heatmap-grid" style="grid-template-columns: 168px repeat(${data.regions.length}, minmax(88px, 1fr));">
                    <div class="viz-heatmap-corner">建筑类型 / 地区</div>
                    ${data.regions.map((region) => `<div class="viz-heatmap-colhead">${escapeHTML(region.label)}</div>`).join("")}

                    ${data.rows.map((row) => `
                        <div class="viz-heatmap-rowhead" style="--row-accent:${row.color}">
                            <strong>${escapeHTML(row.label)}</strong>
                            <span>${row.total} 条</span>
                        </div>
                        ${row.cells.map((cell) => `
                            <div class="viz-heatmap-cell ${cell.count ? "has-value" : "is-empty"}" style="--cell-accent:${row.color}; --cell-opacity:${Math.max(cell.intensity, 0.08)}">
                                <strong>${cell.count || "—"}</strong>
                            </div>
                        `).join("")}
                    `).join("")}
                </div>

                <div class="viz-heatmap-legend">
                    <span>热度较低</span>
                    <div class="viz-heatmap-legend-bar"></div>
                    <span>热度较高</span>
                </div>
            </div>
        `;
    }

    function renderDonuts() {
        const datasetItems = (state.overview.dataset_stats || []).map((item) => ({
            label: shortDatasetLabel(item.label),
            count: item.count,
            color: item.accent,
        }));
        renderDonut(
            "#viz-dataset-donut",
            datasetItems,
            "总站条目",
        );

        const eraItems = (state.overview.era_stats || []).slice(0, 6).map((item, index) => ({
            label: item.label,
            count: item.count,
            color: ERA_COLORS[index % ERA_COLORS.length],
        }));
        const others = (state.overview.era_stats || []).slice(6).reduce((sum, item) => sum + item.count, 0);
        if (others) {
            eraItems.push({ label: "其他", count: others, color: "#dfd2bb" });
        }

        renderDonut(
            "#viz-era-donut",
            eraItems,
            "时代条目",
        );
    }

    function getInitialViewRequest() {
        const params = new URLSearchParams(window.location.search);
        const adcode = String(params.get("adcode") || "").trim();
        const region = normalizeRegionKey(params.get("region"));

        if (adcode && ADCODE_TO_REGION[adcode]) {
            return {
                regionKey: ADCODE_TO_REGION[adcode],
                openProvinceMap: true,
            };
        }

        if (region && getProvinceMeta(region)) {
            return {
                regionKey: region,
                openProvinceMap: true,
            };
        }

        return null;
    }

    async function enterProvinceView(regionKey) {
        const provinceMeta = getProvinceMeta(regionKey);
        if (!provinceMeta) {
            state.currentMapLevel = "country";
            state.activeProvinceKey = "";
            renderRegionMap();
            return;
        }

        await ensureMapRegistered(provinceMeta.adcode);
        state.currentMapLevel = "province";
        state.activeProvinceKey = regionKey;
        state.selectedRegionKey = regionKey;
        state.regionPanelPage = 1;
        renderRegionToolbar();
        renderRegionPanel();
        renderRegionMap();
    }

    function exitProvinceView() {
        state.currentMapLevel = "country";
        state.activeProvinceKey = "";
        renderRegionToolbar();
        renderRegionPanel();
        renderRegionMap();
    }

    async function pickRegion(regionKey, options = {}) {
        const { openProvinceMap = false } = options;
        if (!regionKey) {
            return;
        }

        if (state.selectedRegionKey !== regionKey) {
            state.regionPanelPage = 1;
        }
        state.selectedRegionKey = regionKey;
        renderRegionToolbar();
        renderRegionPanel();

        if (openProvinceMap && getProvinceMeta(regionKey) && state.regionLookup.get(regionKey)?.count > 0) {
            await enterProvinceView(regionKey);
            return;
        }

        if (state.currentMapLevel === "province" && state.activeProvinceKey !== regionKey) {
            state.currentMapLevel = "country";
            state.activeProvinceKey = "";
        }

        renderRegionMap();
    }

    mapBack.addEventListener("click", () => {
        exitProvinceView();
    });

    try {
        const [itemsPayload, overviewPayload, countryBundle] = await Promise.all([
            fetchJSON(window.VISUALIZATION_ITEMS_URL || "/api/items").catch(() => ({ items: [] })),
            fetchJSON(window.VISUALIZATION_OVERVIEW_URL || "/api/overview").catch(() => (window.SITE_OVERVIEW || {})),
            ensureMapRegistered(COUNTRY_ADCODE),
        ]);

        state.items = Array.isArray(itemsPayload.items) ? itemsPayload.items : [];
        state.overview = overviewPayload || window.SITE_OVERVIEW || {};
        state.regionLookup = buildRegionLookup(state.items);
        state.navRegions = buildNavigationRegions(state.regionLookup);
        state.provinceCenters = extractProvinceCenters(countryBundle.mapRecord);
        state.provinceFeatureNames = extractProvinceFeatureNames(countryBundle.mapRecord);
        state.mapProvinceSet = new Set(Object.keys(state.provinceCenters));

        const initialRequest = getInitialViewRequest();
        const firstMappableRegion = state.navRegions.find((region) => {
            return region.count > 0 && !NON_MAP_REGIONS.has(region.key) && hasProvinceGeometry(region.key);
        });
        const firstRegionWithData = state.navRegions.find((region) => region.count > 0);

        state.selectedRegionKey = initialRequest?.regionKey || firstMappableRegion?.key || firstRegionWithData?.key || "";

        renderRegionToolbar();
        renderRegionPanel();
        renderRegionMap();
        renderDonuts();
        renderHeatmap();

        if (initialRequest?.openProvinceMap && state.selectedRegionKey && state.regionLookup.get(state.selectedRegionKey)?.count > 0) {
            await enterProvinceView(state.selectedRegionKey);
        }
    } catch (error) {
        renderRegionMapFallback("页面数据加载失败，请刷新后重试。");
        regionPanel.innerHTML = '<div class="viz-region-panel-empty">页面数据加载失败，请稍后重试。</div>';
        renderHeatmap();
    }
});
