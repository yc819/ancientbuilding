document.addEventListener("DOMContentLoaded", () => {
    const halls = window.GALLERY_HALLS || [];
    if (!halls.length) {
        return;
    }

    const hallButtons = Array.from(document.querySelectorAll("[data-gallery-hall]"));
    const thumbButtons = Array.from(document.querySelectorAll("[data-gallery-thumb]"));
    const stripGroups = Array.from(document.querySelectorAll("[data-gallery-strip]"));

    const room = document.querySelector("#gallery-room");
    const roomKicker = document.querySelector("#gallery-room-kicker");
    const roomTitle = document.querySelector("#gallery-room-title");
    const roomDescription = document.querySelector("#gallery-room-description");
    const stageTitle = document.querySelector("#gallery-stage-title");
    const stageEra = document.querySelector("#gallery-stage-era");

    const viewer = document.querySelector("#gallery-viewer");
    const viewport = document.querySelector("#gallery-viewer-viewport");
    const canvas = document.querySelector("#gallery-viewer-canvas");
    const context = canvas?.getContext("2d");

    const image = document.querySelector("#gallery-focus-image");
    const title = document.querySelector("#gallery-focus-title");
    const summary = document.querySelector("#gallery-focus-summary");
    const meta = document.querySelector("#gallery-focus-meta");
    const link = document.querySelector("#gallery-focus-link");

    const hallLookup = new Map(halls.map((hall) => [hall.slug, hall]));
    const itemLookup = new Map();
    halls.forEach((hall) => {
        (hall.items || []).forEach((item) => itemLookup.set(String(item.id), { hall: hall.slug, item }));
    });

    const state = {
        hall: halls[0].slug,
        itemId: String(halls[0].featured.id),
    };

    const viewerState = {
        rotateX: -0.26,
        rotateY: 0.08,
        zoom: 1.42,
        pointerId: null,
        startX: 0,
        startY: 0,
        startRotateX: -0.26,
        startRotateY: 0.08,
    };

    const light = normalize([0.55, 0.8, 0.45]);
    let currentModel = [];

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function normalize(vector) {
        const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
        return [vector[0] / length, vector[1] / length, vector[2] / length];
    }

    function subtract(a, b) {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    function cross(a, b) {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    }

    function hexToRgb(color) {
        const safe = color.replace("#", "");
        const value = safe.length === 3
            ? safe.split("").map((entry) => entry + entry).join("")
            : safe;
        return [
            parseInt(value.slice(0, 2), 16),
            parseInt(value.slice(2, 4), 16),
            parseInt(value.slice(4, 6), 16),
        ];
    }

    function shadeColor(color, amount) {
        const rgb = hexToRgb(color);
        const mix = amount >= 0 ? 255 : 0;
        const alpha = Math.abs(amount);
        const next = rgb.map((channel) => Math.round(channel + (mix - channel) * alpha));
        return `rgb(${next[0]}, ${next[1]}, ${next[2]})`;
    }

    function rotatePoint(point, rotateX, rotateY) {
        const [x, y, z] = point;
        const cosY = Math.cos(rotateY);
        const sinY = Math.sin(rotateY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        const cosX = Math.cos(rotateX);
        const sinX = Math.sin(rotateX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        return [x1, y2, z2];
    }

    function projectPoint(point, width, height) {
        const cameraDistance = 720;
        const perspective = 920 * viewerState.zoom;
        const scale = perspective / Math.max(180, cameraDistance - point[2]);
        return [
            width / 2 + point[0] * scale,
            height * 0.62 - point[1] * scale,
            scale,
        ];
    }

    function makeFace(vertices, color) {
        return { vertices, color };
    }

    function createBox(center, size, color) {
        const [cx, cy, cz] = center;
        const [w, h, d] = size;
        const x = w / 2;
        const y = h / 2;
        const z = d / 2;
        const p = {
            lbf: [cx - x, cy - y, cz + z],
            rbf: [cx + x, cy - y, cz + z],
            rtf: [cx + x, cy + y, cz + z],
            ltf: [cx - x, cy + y, cz + z],
            lbb: [cx - x, cy - y, cz - z],
            rbb: [cx + x, cy - y, cz - z],
            rtb: [cx + x, cy + y, cz - z],
            ltb: [cx - x, cy + y, cz - z],
        };
        return [
            makeFace([p.lbf, p.rbf, p.rtf, p.ltf], shadeColor(color, 0.05)),
            makeFace([p.rbb, p.lbb, p.ltb, p.rtb], shadeColor(color, -0.08)),
            makeFace([p.lbb, p.lbf, p.ltf, p.ltb], shadeColor(color, -0.16)),
            makeFace([p.rbf, p.rbb, p.rtb, p.rtf], shadeColor(color, -0.24)),
            makeFace([p.ltf, p.rtf, p.rtb, p.ltb], shadeColor(color, 0.14)),
            makeFace([p.lbb, p.rbb, p.rbf, p.lbf], shadeColor(color, -0.28)),
        ];
    }

    function createGableRoof(center, width, depth, height, color) {
        const [cx, cy, cz] = center;
        const hw = width / 2;
        const hd = depth / 2;
        const ridgeY = cy + height / 2;
        const eaveY = cy - height / 2;
        const faces = [];

        const leftFront = [cx - hw, eaveY, cz + hd];
        const rightFront = [cx + hw, eaveY, cz + hd];
        const leftBack = [cx - hw, eaveY, cz - hd];
        const rightBack = [cx + hw, eaveY, cz - hd];
        const ridgeFront = [cx, ridgeY, cz + hd];
        const ridgeBack = [cx, ridgeY, cz - hd];

        faces.push(makeFace([leftFront, ridgeFront, ridgeBack, leftBack], shadeColor(color, 0.06)));
        faces.push(makeFace([ridgeFront, rightFront, rightBack, ridgeBack], shadeColor(color, -0.08)));
        faces.push(makeFace([leftBack, ridgeBack, rightBack, rightFront, leftFront], shadeColor(color, -0.18)));
        faces.push(makeFace([leftFront, rightFront, ridgeFront], shadeColor(color, 0.12)));
        faces.push(makeFace([ridgeBack, rightBack, leftBack], shadeColor(color, -0.12)));
        return faces;
    }

    function createPyramidRoof(center, width, depth, height, color) {
        const [cx, cy, cz] = center;
        const hw = width / 2;
        const hd = depth / 2;
        const top = [cx, cy + height / 2, cz];
        const a = [cx - hw, cy - height / 2, cz + hd];
        const b = [cx + hw, cy - height / 2, cz + hd];
        const c = [cx + hw, cy - height / 2, cz - hd];
        const d = [cx - hw, cy - height / 2, cz - hd];
        return [
            makeFace([a, b, top], shadeColor(color, 0.08)),
            makeFace([b, c, top], shadeColor(color, -0.06)),
            makeFace([c, d, top], shadeColor(color, -0.14)),
            makeFace([d, a, top], shadeColor(color, -0.02)),
        ];
    }

    function stairs(origin, steps, stepSize, color) {
        const [ox, oy, oz] = origin;
        const [w, h, d] = stepSize;
        return Array.from({ length: steps }, (_, index) =>
            createBox(
                [ox, oy - index * h * 0.62, oz + index * d * 0.78],
                [w + index * 18, h, d],
                color,
            )).flat();
    }

    function columnRow(center, columns, spacing, height, color) {
        const [cx, cy, cz] = center;
        return Array.from({ length: columns }, (_, index) => {
            const offset = (index - (columns - 1) / 2) * spacing;
            return createBox([cx + offset, cy, cz], [9, height, 9], color);
        }).flat();
    }

    function ringSegments(center, radius, count, size, color) {
        const [cx, cy, cz] = center;
        const [w, h, d] = size;
        return Array.from({ length: count }, (_, index) => {
            const angle = (Math.PI * 2 * index) / count;
            const x = cx + Math.cos(angle) * radius;
            const z = cz + Math.sin(angle) * radius;
            return createBox([x, cy, z], [w, h, d], color);
        }).flat();
    }

    function segmentedArch(center, width, height, segments, color) {
        const [cx, cy, cz] = center;
        return Array.from({ length: segments }, (_, index) => {
            const t = index / (segments - 1);
            const x = cx - width / 2 + t * width;
            const y = cy + Math.sin(t * Math.PI) * height;
            return createBox([x, y, cz], [width / segments + 6, 10, 26], color);
        }).flat();
    }

    function palette(kind) {
        const palettes = {
            stone: "#d7c6ac",
            stoneDark: "#9d8a73",
            wall: "#b7784f",
            wood: "#8e3b2b",
            woodDark: "#5b241a",
            earth: "#bd8a5b",
            tile: "#3f3434",
            gold: "#d4a44b",
            court: "#ded2be",
            water: "#577d92",
        };
        return palettes[kind];
    }

    function modelKey(item) {
        const title = String(item?.title || "");
        const namedModels = new Map([
            ["阿房宫", "epang-palace"],
            ["未央宫", "weiyang-palace"],
            ["大明宫", "daming-palace"],
            ["紫禁城（故宫）", "forbidden-city"],
            ["南京明故宫", "ming-palace-nanjing"],
            ["北京四合院", "siheyuan"],
            ["福建土楼", "tulou"],
            ["陕西窑洞", "cave"],
            ["皖南徽派民居（宏村）", "hui-house"],
            ["开平碉楼", "diaolou"],
            ["赵州桥", "zhaozhou-bridge"],
            ["洛阳桥", "luoyang-bridge"],
            ["卢沟桥", "lugou-bridge"],
            ["广济桥", "guangji-bridge"],
            ["泸定桥", "luding-bridge"],
        ]);
        return namedModels.get(title) || "hall";
    }

    function buildEpangPalace() {
        return [
            ...createBox([0, -106, 0], [360, 28, 220], palette("stone")),
            ...stairs([0, -94, 104], 9, [180, 10, 20], palette("stone")),
            ...createBox([0, -42, -10], [228, 94, 122], palette("wall")),
            ...columnRow([0, -44, 54], 8, 26, 76, palette("woodDark")),
            ...createGableRoof([0, 18, -10], 288, 176, 74, palette("tile")),
            ...createBox([-126, 2, -28], [82, 108, 84], palette("wall")),
            ...createBox([126, 2, -28], [82, 108, 84], palette("wall")),
            ...createGableRoof([-126, 72, -28], 112, 112, 54, palette("tile")),
            ...createGableRoof([126, 72, -28], 112, 112, 54, palette("tile")),
            ...createBox([0, -38, 80], [154, 34, 48], palette("wood")),
            ...createGableRoof([0, -8, 80], 196, 76, 28, palette("tile")),
        ];
    }

    function buildWeiyangPalace() {
        return [
            ...createBox([0, -116, -46], [334, 20, 188], palette("stone")),
            ...createBox([0, -94, 76], [228, 18, 104], palette("stone")),
            ...stairs([0, -92, 126], 7, [98, 10, 18], palette("stone")),
            ...createBox([0, -38, -42], [206, 84, 108], palette("wall")),
            ...columnRow([0, -40, 12], 7, 28, 68, palette("woodDark")),
            ...createGableRoof([0, 18, -42], 250, 160, 58, palette("tile")),
            ...createBox([0, -42, 58], [136, 46, 72], palette("wood")),
            ...columnRow([0, -42, 90], 5, 22, 38, palette("woodDark")),
            ...createGableRoof([0, -10, 58], 172, 104, 32, palette("gold")),
            ...createBox([-94, -60, 14], [64, 22, 26], palette("wall")),
            ...createBox([94, -60, 14], [64, 22, 26], palette("wall")),
        ];
    }

    function buildDamingPalace() {
        return [
            ...createBox([0, -108, 0], [340, 30, 222], palette("stone")),
            ...stairs([0, -96, 110], 8, [78, 10, 18], palette("stone")),
            ...stairs([-92, -96, 98], 7, [68, 10, 18], palette("stone")),
            ...stairs([92, -96, 98], 7, [68, 10, 18], palette("stone")),
            ...createBox([0, -36, -8], [220, 98, 116], palette("wood")),
            ...columnRow([0, -38, 50], 9, 24, 78, palette("woodDark")),
            ...createGableRoof([0, 28, -8], 286, 180, 86, palette("tile")),
            ...createBox([-140, -12, -24], [54, 84, 54], palette("wood")),
            ...createBox([140, -12, -24], [54, 84, 54], palette("wood")),
            ...createGableRoof([-140, 46, -24], 84, 84, 46, palette("tile")),
            ...createGableRoof([140, 46, -24], 84, 84, 46, palette("tile")),
        ];
    }

    function buildForbiddenCity() {
        return [
            ...createBox([0, -120, 0], [290, 12, 188], palette("court")),
            ...createBox([0, -100, 0], [208, 20, 112], palette("stone")),
            ...stairs([0, -98, 118], 8, [96, 10, 18], palette("stone")),
            ...createBox([0, -44, 4], [192, 84, 90], palette("wood")),
            ...columnRow([0, -44, 46], 7, 26, 74, palette("woodDark")),
            ...createGableRoof([0, 14, 4], 258, 150, 72, palette("gold")),
            ...createBox([-156, -62, 10], [118, 40, 44], palette("wood")),
            ...createBox([156, -62, 10], [118, 40, 44], palette("wood")),
            ...createGableRoof([-156, -32, 10], 146, 76, 26, palette("tile")),
            ...createGableRoof([156, -32, 10], 146, 76, 26, palette("tile")),
        ];
    }

    function buildMingNanjing() {
        return [
            ...createBox([0, -122, 0], [272, 16, 150], palette("stone")),
            ...stairs([0, -118, 84], 5, [68, 10, 18], palette("stone")),
            ...createBox([0, -54, 0], [182, 74, 82], palette("wood")),
            ...columnRow([0, -54, 38], 6, 28, 60, palette("woodDark")),
            ...createGableRoof([0, 8, 0], 246, 138, 78, palette("gold")),
        ];
    }

    function buildSiheyuan() {
        return [
            ...createBox([0, -128, 0], [320, 10, 240], palette("court")),
            ...createBox([0, -66, -70], [150, 62, 82], palette("wall")),
            ...createGableRoof([0, -20, -70], 192, 114, 42, palette("tile")),
            ...createBox([-108, -76, 10], [62, 50, 136], palette("wall")),
            ...createBox([108, -76, 10], [62, 50, 136], palette("wall")),
            ...createGableRoof([-108, -38, 10], 84, 160, 30, palette("tile")),
            ...createGableRoof([108, -38, 10], 84, 160, 30, palette("tile")),
            ...createBox([0, -74, 96], [82, 44, 24], palette("wood")),
            ...createGableRoof([0, -42, 96], 110, 52, 22, palette("tile")),
        ];
    }

    function buildHuiHouse() {
        return [
            ...buildSiheyuan(),
            ...createBox([-154, -36, -64], [12, 86, 30], palette("court")),
            ...createBox([154, -36, -64], [12, 86, 30], palette("court")),
            ...createBox([-154, -28, 14], [12, 72, 60], palette("court")),
            ...createBox([154, -28, 14], [12, 72, 60], palette("court")),
        ];
    }

    function buildTulou() {
        return [
            ...ringSegments([0, -54, 0], 108, 16, [34, 124, 26], palette("earth")),
            ...ringSegments([0, 10, 0], 108, 16, [36, 14, 28], palette("stoneDark")),
            ...ringSegments([0, 22, 0], 108, 16, [38, 14, 30], palette("tile")),
            ...createBox([0, -110, 0], [138, 10, 138], palette("court")),
            ...createBox([0, -62, 114], [44, 84, 20], palette("woodDark")),
            ...createGableRoof([0, -4, 114], 74, 42, 18, palette("tile")),
        ];
    }

    function buildCave() {
        return [
            ...createBox([0, -10, -16], [292, 182, 150], "#9b6f4f"),
            ...createBox([-88, -30, 58], [58, 72, 18], "#1c1512"),
            ...createBox([0, -26, 62], [66, 80, 18], "#1c1512"),
            ...createBox([88, -30, 58], [58, 72, 18], "#1c1512"),
            ...createBox([0, -126, 44], [246, 12, 84], palette("earth")),
        ];
    }

    function buildDiaolou() {
        return [
            ...createBox([0, -112, 0], [116, 14, 116], palette("stone")),
            ...createBox([0, -42, 0], [84, 124, 84], palette("earth")),
            ...createBox([0, 34, 0], [64, 68, 64], palette("earth")),
            ...createPyramidRoof([0, 86, 0], 90, 90, 40, palette("tile")),
        ];
    }

    function buildZhaozhouBridge() {
        const mainArch = Array.from({ length: 13 }, (_, index) => {
            const t = index / 12;
            const x = -116 + t * 232;
            const y = -84 + Math.sin(t * Math.PI) * 58;
            return createBox([x, y, 0], [22, 10, 40], palette("stoneDark"));
        }).flat();

        const shoulderOpenings = [
            ...Array.from({ length: 4 }, (_, index) => {
                const t = index / 3;
                const x = -56 + t * 34;
                const y = -46 + Math.sin(t * Math.PI) * 12;
                return createBox([x, y, 0], [10, 6, 28], palette("stoneDark"));
            }).flat(),
            ...Array.from({ length: 4 }, (_, index) => {
                const t = index / 3;
                const x = 22 + t * 34;
                const y = -46 + Math.sin(t * Math.PI) * 12;
                return createBox([x, y, 0], [10, 6, 28], palette("stoneDark"));
            }).flat(),
        ];

        return [
            ...createBox([0, -26, 0], [304, 14, 58], palette("stone")),
            ...createBox([0, -44, 0], [256, 10, 50], palette("stone")),
            ...mainArch,
            ...shoulderOpenings,
            ...createBox([-138, -58, 0], [34, 24, 44], palette("stoneDark")),
            ...createBox([138, -58, 0], [34, 24, 44], palette("stoneDark")),
            ...createBox([0, -118, 0], [372, 8, 128], palette("water")),
        ];
    }

    function buildLuoyangBridge() {
        return [
            ...createBox([0, -28, 0], [322, 16, 56], palette("stone")),
            ...createBox([-114, -78, 0], [34, 86, 42], palette("stoneDark")),
            ...createBox([-38, -74, 0], [34, 94, 42], palette("stoneDark")),
            ...createBox([38, -74, 0], [34, 94, 42], palette("stoneDark")),
            ...createBox([114, -78, 0], [34, 86, 42], palette("stoneDark")),
            ...segmentedArch([-76, -88, 0], 66, 24, 4, palette("stoneDark")),
            ...segmentedArch([0, -86, 0], 66, 28, 4, palette("stoneDark")),
            ...segmentedArch([76, -88, 0], 66, 24, 4, palette("stoneDark")),
            ...createBox([0, -118, 0], [370, 8, 132], palette("water")),
        ];
    }

    function buildLugouBridge() {
        return [
            ...createBox([0, -28, 0], [314, 16, 64], palette("stone")),
            ...createBox([0, -42, 24], [314, 10, 8], palette("stoneDark")),
            ...createBox([0, -42, -24], [314, 10, 8], palette("stoneDark")),
            ...createBox([-84, -80, 0], [40, 90, 42], palette("stoneDark")),
            ...createBox([84, -80, 0], [40, 90, 42], palette("stoneDark")),
            ...segmentedArch([-84, -92, 0], 72, 28, 4, palette("stoneDark")),
            ...segmentedArch([84, -92, 0], 72, 28, 4, palette("stoneDark")),
            ...createBox([0, -118, 0], [360, 8, 128], palette("water")),
        ];
    }

    function buildGuangjiBridge() {
        const piers = Array.from({ length: 6 }, (_, index) => {
            const x = -132 + index * 52.8;
            return createBox([x, -72, 0], [18, 76, 34], palette("stoneDark"));
        }).flat();

        const deckSegments = Array.from({ length: 5 }, (_, index) => {
            const x = -106 + index * 53;
            return createBox([x, -28, 0], [62, 12, 44], palette("stone"));
        }).flat();

        return [
            ...piers,
            ...deckSegments,
            ...createBox([-120, 0, 0], [22, 22, 22], palette("wood")),
            ...createBox([0, 2, 0], [30, 26, 30], palette("wood")),
            ...createBox([120, 0, 0], [22, 22, 22], palette("wood")),
            ...createPyramidRoof([-120, 22, 0], 42, 42, 18, palette("tile")),
            ...createPyramidRoof([0, 26, 0], 56, 56, 24, palette("tile")),
            ...createPyramidRoof([120, 22, 0], 42, 42, 18, palette("tile")),
            ...createBox([0, -118, 0], [352, 8, 136], palette("water")),
        ];
    }

    function buildLudingBridge() {
        const cables = Array.from({ length: 18 }, (_, index) => {
            const t = index / 17;
            const x = -118 + t * 236;
            const sag = Math.sin(t * Math.PI) * 22;
            return [
                ...createBox([x, 18 - sag, -12], [10, 3, 3], "#9b978f"),
                ...createBox([x, 18 - sag, 12], [10, 3, 3], "#9b978f"),
            ];
        }).flat();

        const suspenders = Array.from({ length: 11 }, (_, index) => {
            const t = index / 10;
            const x = -98 + t * 196;
            const sag = Math.sin(((x + 118) / 236) * Math.PI) * 20;
            const cableY = 18 - sag;
            const deckY = -34 + Math.sin(t * Math.PI) * 8;
            const length = Math.max(16, cableY - deckY);
            return createBox([x, deckY + length / 2 - 2, 0], [3, length, 3], "#b8b2a7");
        }).flat();

        const deckPlanks = Array.from({ length: 12 }, (_, index) => {
            const t = index / 11;
            const x = -102 + t * 204;
            const deckY = -38 + Math.sin(t * Math.PI) * 10;
            return createBox([x, deckY, 0], [12, 5, 30], "#6f563b");
        }).flat();

        return [
            ...createBox([-144, -58, 0], [46, 114, 72], palette("stoneDark")),
            ...createBox([144, -58, 0], [46, 114, 72], palette("stoneDark")),
            ...createBox([-144, -2, 0], [16, 88, 14], "#5f564f"),
            ...createBox([-126, -2, 0], [10, 82, 10], "#5f564f"),
            ...createBox([144, -2, 0], [16, 88, 14], "#5f564f"),
            ...createBox([126, -2, 0], [10, 82, 10], "#5f564f"),
            ...createBox([-135, 32, 0], [38, 6, 16], "#6d635c"),
            ...createBox([135, 32, 0], [38, 6, 16], "#6d635c"),
            ...cables,
            ...suspenders,
            ...deckPlanks,
            ...createBox([0, -124, 0], [392, 10, 172], palette("water")),
        ];
    }

    function buildHall() {
        return [
            ...createBox([0, -116, 0], [240, 18, 150], palette("stone")),
            ...stairs([0, -112, 84], 5, [74, 10, 18], palette("stone")),
            ...createBox([0, -50, 0], [164, 74, 92], palette("wood")),
            ...columnRow([0, -50, 42], 6, 24, 60, palette("woodDark")),
            ...createGableRoof([0, 10, 0], 220, 142, 60, palette("tile")),
        ];
    }

    function buildModel(item) {
        switch (modelKey(item)) {
            case "epang-palace": return buildEpangPalace();
            case "weiyang-palace": return buildWeiyangPalace();
            case "daming-palace": return buildDamingPalace();
            case "forbidden-city": return buildForbiddenCity();
            case "ming-palace-nanjing": return buildMingNanjing();
            case "siheyuan": return buildSiheyuan();
            case "hui-house": return buildHuiHouse();
            case "tulou": return buildTulou();
            case "cave": return buildCave();
            case "diaolou": return buildDiaolou();
            case "zhaozhou-bridge": return buildZhaozhouBridge();
            case "luoyang-bridge": return buildLuoyangBridge();
            case "lugou-bridge": return buildLugouBridge();
            case "guangji-bridge": return buildGuangjiBridge();
            case "luding-bridge": return buildLudingBridge();
            default: return buildHall();
        }
    }

    function defaultZoomForItem(item) {
        switch (modelKey(item)) {
            case "epang-palace":
            case "weiyang-palace":
            case "daming-palace":
            case "forbidden-city":
            case "ming-palace-nanjing":
                return 1.34;
            case "siheyuan":
            case "hui-house":
            case "tulou":
            case "cave":
            case "diaolou":
                return 1.48;
            case "zhaozhou-bridge":
            case "luoyang-bridge":
            case "lugou-bridge":
            case "guangji-bridge":
            case "luding-bridge":
                return 1.26;
            default:
                return 1.42;
        }
    }

    function resizeCanvas() {
        if (!viewport || !canvas || !context) {
            return;
        }
        const rect = viewport.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderScene();
    }

    function renderScene() {
        if (!canvas || !context || !viewport) {
            return;
        }
        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        context.clearRect(0, 0, width, height);

        const faces = [];
        currentModel.forEach((face) => {
            const transformed = face.vertices.map((point) => rotatePoint(point, viewerState.rotateX, viewerState.rotateY));
            const edgeA = subtract(transformed[1], transformed[0]);
            const edgeB = subtract(transformed[2], transformed[0]);
            const normal = normalize(cross(edgeA, edgeB));
            if (normal[2] >= 0.12) {
                return;
            }
            const brightness = clamp(-normal[2] * 0.32 + Math.max(0, normal[0] * light[0] + normal[1] * light[1] + -normal[2] * light[2]) * 0.92, 0.18, 1);
            const projected = transformed.map((point) => projectPoint(point, width, height));
            const depth = transformed.reduce((sum, point) => sum + point[2], 0) / transformed.length;
            faces.push({
                points: projected,
                color: shadeColor(face.color.startsWith("#") ? face.color : rgbToHex(face.color), brightness - 0.55),
                depth,
            });
        });

        faces.sort((a, b) => a.depth - b.depth);
        faces.forEach((face) => {
            context.beginPath();
            face.points.forEach(([x, y], index) => {
                if (index === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            });
            context.closePath();
            context.fillStyle = face.color;
            context.fill();
            context.strokeStyle = "rgba(255, 244, 225, 0.14)";
            context.lineWidth = 1;
            context.stroke();
        });
    }

    function rgbToHex(color) {
        if (color.startsWith("#")) {
            return color;
        }
        const match = color.match(/\d+/g) || ["0", "0", "0"];
        return `#${match.slice(0, 3).map((entry) => Number(entry).toString(16).padStart(2, "0")).join("")}`;
    }

    function renderFocus(item) {
        if (!item) {
            return;
        }
        if (image) {
            image.src = item.image || "";
            image.alt = item.title || "";
        }
        if (title) {
            title.textContent = item.title || "";
        }
        if (summary) {
            summary.textContent = item.body || item.summary || "";
        }
        if (meta) {
            meta.innerHTML = [item.era, item.category].filter(Boolean).map((entry) => `<span>${entry}</span>`).join("");
        }
        if (link) {
            link.href = item.href || "#";
        }
    }

    function renderRoom(hall, item) {
        room?.style.setProperty("--hall-accent", hall.accent || "#8f4b2c");
        if (roomKicker) roomKicker.textContent = hall.kicker || "";
        if (roomTitle) roomTitle.textContent = hall.title || "";
        if (roomDescription) roomDescription.textContent = hall.description || "";
        if (stageTitle) stageTitle.textContent = item.title || "";
        if (stageEra) stageEra.textContent = item.era || item.category || "";
    }

    function resetView(item) {
        viewerState.rotateX = -0.26;
        viewerState.rotateY = 0.08;
        viewerState.zoom = defaultZoomForItem(item);
        renderScene();
    }

    function render() {
        const hall = hallLookup.get(state.hall);
        const selected = itemLookup.get(String(state.itemId));
        if (!hall || !selected) {
            return;
        }

        hallButtons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.galleryHall === state.hall);
        });
        stripGroups.forEach((group) => {
            group.classList.toggle("is-active", group.dataset.galleryStrip === state.hall);
        });
        thumbButtons.forEach((button) => {
            button.classList.toggle(
                "is-active",
                button.dataset.galleryThumb === state.itemId && button.dataset.galleryHallThumb === state.hall,
            );
        });

        renderRoom(hall, selected.item);
        renderFocus(selected.item);
        currentModel = buildModel(selected.item);
        resetView(selected.item);
    }

    function setHall(nextHall) {
        const hall = hallLookup.get(nextHall);
        if (!hall) {
            return;
        }
        state.hall = hall.slug;
        state.itemId = String(hall.featured.id);
        render();
    }

    function setItem(itemId) {
        const selected = itemLookup.get(String(itemId));
        if (!selected) {
            return;
        }
        state.hall = selected.hall;
        state.itemId = String(itemId);
        render();
    }

    hallButtons.forEach((button) => {
        button.addEventListener("click", () => setHall(button.dataset.galleryHall));
    });

    thumbButtons.forEach((button) => {
        button.addEventListener("click", () => setItem(button.dataset.galleryThumb));
    });

    viewport?.addEventListener("pointerdown", (event) => {
        viewerState.pointerId = event.pointerId;
        viewerState.startX = event.clientX;
        viewerState.startY = event.clientY;
        viewerState.startRotateX = viewerState.rotateX;
        viewerState.startRotateY = viewerState.rotateY;
        viewer?.classList.add("is-dragging");
        viewport.setPointerCapture(event.pointerId);
    });

    viewport?.addEventListener("pointermove", (event) => {
        if (viewerState.pointerId !== event.pointerId) {
            return;
        }
        const deltaX = event.clientX - viewerState.startX;
        const deltaY = event.clientY - viewerState.startY;
        viewerState.rotateY = viewerState.startRotateY + deltaX * 0.008;
        viewerState.rotateX = clamp(viewerState.startRotateX + deltaY * 0.006, -1.28, 0.24);
        renderScene();
    });

    function releasePointer(event) {
        if (viewerState.pointerId !== event.pointerId) {
            return;
        }
        viewerState.pointerId = null;
        viewer?.classList.remove("is-dragging");
        if (viewport?.hasPointerCapture(event.pointerId)) {
            viewport.releasePointerCapture(event.pointerId);
        }
    }

    viewport?.addEventListener("pointerup", releasePointer);
    viewport?.addEventListener("pointercancel", releasePointer);
    viewport?.addEventListener("wheel", (event) => {
        event.preventDefault();
        viewerState.zoom = clamp(viewerState.zoom + (event.deltaY < 0 ? 0.08 : -0.08), 0.72, 1.8);
        renderScene();
    }, { passive: false });
    viewport?.addEventListener("dblclick", () => {
        const selected = itemLookup.get(String(state.itemId));
        resetView(selected?.item);
    });

    window.addEventListener("resize", resizeCanvas);
    render();
    resizeCanvas();
});
