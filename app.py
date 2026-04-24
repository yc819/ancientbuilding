from __future__ import annotations

import os
from functools import lru_cache
from typing import Any
from urllib.parse import urlencode

from flask import Flask, abort, jsonify, redirect, render_template, request

from site_data import (
    DATASET_META,
    _dataset_signature,
    build_overview,
    dataset_records,
    filter_records,
    get_record,
    guide_answer,
    load_records,
    record_detail_path,
    related_records,
)

app = Flask(__name__)


ABOUT_PAGES: dict[str, dict[str, Any]] = {
    "intro": {
        "slug": "intro",
        "page_title": "关于华章",
        "hero_title": "华章简介",
        "hero_description": "以中国古代建筑为主线，把成就、人物、著作与文化组织成可浏览的数字专题站点。",
        "band_title": "华章简介",
        "breadcrumb_title": "华章简介",
        "paragraphs": [
            "“古建华章”尝试把分散的古代建筑资料重新组织为适合网页阅读的专题叙事，不再把建筑、人物、著作和文化概念割裂展示，而是先用代表性案例建立直观印象，再逐步把背后的制度结构、营造技术、历史人物和文化观念补充进来。这样处理的目的，不只是让用户“看到建筑”，更是帮助用户理解建筑为何会以这样的尺度、形制和空间秩序被建造出来。",
            "站点同时保留浏览与研究两种使用方式：首页和专题页偏重观看节奏，适合先快速进入主题；数据浏览、图谱与问答则服务于继续检索、比对与延伸阅读，适合在课堂讲解、专题汇报或自主学习中反复调用。换句话说，它既是一个可以顺着看下去的数字展览，也是一组可以随时返回、继续检索和重组的资料入口。",
            "四组数据并不是孤立展示，而是围绕建筑本体建立关联：建筑实体提供观看对象，时代背景提供历史坐标，相关人物解释技术与制度来源，文化概念则补足审美与思想层面的理解。它们共同构成一条更完整的阅读链路，使用户在浏览某一条目时，能够自然延伸到与之有关的营造传统、历史环境和文化语境，而不只停留在单一图像或单一事实层面。",
        ],
        "figure": "/static/images/about-intro-collage.jpg",
        "figure_alt": "华章简介专题配图",
        "figure_caption": "",
        "cards": [
            {"title": "以建筑为核心展开叙事", "text": "页面内容始终从具体建筑出发，再向制度、工艺与文化层面延展。"},
            {"title": "从数据转成展览化表达", "text": "原始资料被重新整理为专题页面、时间线、图谱与互动入口。"},
            {"title": "兼顾观看与研究", "text": "既能快速浏览代表案例，也能继续做检索、比较和课堂汇报。"},
        ],
    },
    "framework": {
        "slug": "framework",
        "page_title": "关于华章",
        "hero_title": "内容架构",
        "hero_description": "以主展线、支撑线、互动线三层结构组织站点内容。",
        "band_title": "内容架构",
        "breadcrumb_title": "内容架构",
        "paragraphs": [
            "主展线负责建筑成就与代表性案例的第一入口，帮助用户快速建立主题印象。它承担的是“先让人看懂”的任务，因此会优先呈现最具辨识度的建筑类型、最核心的历史案例和最容易进入的阅读路径，让用户先形成整体轮廓，再继续向纵深展开。",
            "支撑线由人物、著作与文化条目组成，为建筑专题提供必要的解释深度与背景信息。人物条目用来说明营造传统背后的组织者、设计者和工匠群体，著作条目补充制度规范与理论来源，文化条目则解释礼制、空间秩序、装饰观念与技术智慧。三者共同承担“解释建筑为什么如此形成”的任务。",
            "互动线通过数据浏览、可视化、问答与收藏，把静态资料转化为可参与的学习路径。它不是单纯附加在内容之后的功能模块，而是把阅读行为继续向检索、筛选、提问、比对和整理推进，使用户可以根据自己的学习目标重新组织站点内容，把展陈逻辑转化为个人化的学习路线。",
        ],
        "figure": "/static/images/about-framework.png",
        "figure_alt": "网站内容架构示意图",
        "figure_caption": "",
        "cards": [
            {"title": "主展线", "text": "首页、专题页和代表案例负责建立第一印象与浏览方向。"},
            {"title": "支撑线", "text": "人物、著作与文化模块持续补充建筑背后的历史与思想背景。"},
            {"title": "互动线", "text": "图表、问答和收藏让用户能主动筛选、提问、整理与回看。"},
        ],
    },
    "vision": {
        "slug": "vision",
        "page_title": "关于华章",
        "hero_title": "营造脉络",
        "hero_description": "从时间、空间与文化观念三重维度回看中国古代建筑。",
        "band_title": "营造脉络",
        "breadcrumb_title": "营造脉络",
        "paragraphs": [
            "时间维度帮助用户理解中国古代建筑如何从早期营建经验逐步走向成熟与制度化。无论是夯土台基、木构架体系，还是都城规划、官式制度与营造规范，许多我们今天视为“典型中国古建”的特征，都不是一次完成的，而是在漫长历史过程中不断积累、修正与定型的结果。",
            "空间维度强调建筑与地域环境的关系，不同地区的材料、气候与生活方式会塑造不同形态。北方木构与高台建筑、江南园林与水网聚落、西南山地民居与地方营造经验，往往都体现出因地制宜的适应逻辑。把建筑放回区域环境中观察，才能更准确地理解其尺度、布局、结构和日常使用方式。",
            "文化维度则解释斗拱、轴线、院落、园林与礼制等观念如何共同构成古代建筑的精神秩序。建筑并不仅仅是功能空间，它还承担着权力表达、伦理组织、日常生活与审美趣味等多重意义。也正因为如此，研究古代建筑不能只看结构形式，还需要同时理解它在制度、观念和文化象征上的位置。",
        ],
        "figure": "/static/images/about-vision.png",
        "figure_alt": "中国古代建筑时间轴示意图",
        "figure_caption": "",
        "cards": [
            {"title": "时间维度", "text": "从史前萌芽到明清成熟，呈现建筑技术和制度的长期演进。"},
            {"title": "空间维度", "text": "从地域差异切入，比较民居、宫殿、桥梁与园林的不同营建路径。"},
            {"title": "文化维度", "text": "把形式背后的礼制、审美与观念系统重新连接起来。"},
        ],
    },
}

HOME_HISTORY_TIMELINE = [
    {"period": "新石器时代", "core": "穴居与干栏式建筑萌芽，夯土与木骨泥墙技术初现。", "landmarks": ["半坡遗址", "河姆渡干栏建筑"], "theme": "neolithic", "motif": "夯土"},
    {"period": "夏商西周", "core": "夯土高台建筑兴起，四合院雏形逐步确立。", "landmarks": ["二里头宫殿遗址", "凤雏村四合院"], "theme": "bronze", "motif": "高台"},
    {"period": "秦汉", "core": "高台建筑与木构体系走向成熟，“秦砖汉瓦”广泛普及。", "landmarks": ["秦咸阳宫", "汉长安城", "长城"], "theme": "qinhan", "motif": "砖瓦"},
    {"period": "魏晋南北朝", "core": "佛教建筑大发展，石窟与塔式建筑影响持续扩大。", "landmarks": ["云冈石窟", "龙门石窟", "嵩岳寺塔"], "theme": "buddhist", "motif": "石窟"},
    {"period": "隋唐", "core": "都城规划成熟，木构技术走向高峰，宫殿体系影响东亚。", "landmarks": ["唐长安城", "大明宫", "佛光寺东大殿"], "theme": "tang", "motif": "宫阙"},
    {"period": "宋辽金", "core": "《营造法式》成书，建筑规范化与装饰精细化同步推进。", "landmarks": ["应县木塔", "晋祠圣母殿", "泉州清净寺"], "theme": "song", "motif": "法式"},
    {"period": "元明清", "core": "官式建筑标准化，皇家园林与砖石工程达到高峰。", "landmarks": ["元大都", "北京故宫", "苏州园林"], "theme": "imperial", "motif": "园林"},
]

EXPLORER_OVERVIEW_PAGE = {
    "page_title": "数据浏览",
    "hero_title": "数据浏览",
    "hero_description": "从专题入口、筛选浏览与可视化总览三条路径进入整站内容。",
    "band_title": "数据导览",
    "breadcrumb_title": "数据导览",
}

REGION_MAP_VIEW = {
    "陕西": {"center": [34.27, 108.95], "zoom": 7},
    "北京": {"center": [39.9, 116.4], "zoom": 9},
    "辽宁": {"center": [41.8, 123.43], "zoom": 8},
    "江苏": {"center": [32.06, 119.2], "zoom": 7},
    "河北": {"center": [38.04, 114.52], "zoom": 7},
    "福建": {"center": [24.8, 117.6], "zoom": 7},
    "广东": {"center": [23.13, 113.27], "zoom": 7},
    "山西": {"center": [37.2, 112.4], "zoom": 7},
    "河南": {"center": [33.8, 112.9], "zoom": 7},
    "江西": {"center": [29.3, 117.2], "zoom": 8},
    "安徽": {"center": [30.12, 117.99], "zoom": 8},
    "湖南": {"center": [28.31, 109.73], "zoom": 7},
    "云南": {"center": [25.04, 102.72], "zoom": 7},
    "四川": {"center": [29.92, 102.23], "zoom": 7},
    "内蒙古": {"center": [40.84, 111.67], "zoom": 6},
}

BUILDING_GALLERY_META = {
    "民居": {"label": "民居", "fallback_title": "北京四合院", "image": "/static/images/category-residential-new.jpg", "summary_image": "/static/images/summary-residential.jpg", "tagline": "院落有序，家居成章"},
    "官府": {"label": "官府", "fallback_title": "南阳府衙", "image": "/static/images/category-official-new.png", "summary_image": "/static/images/summary-official.jpg", "tagline": "礼法分明，庄重有度"},
    "皇宫": {"label": "皇宫", "fallback_title": "紫禁城（故宫）", "image": "/static/images/category-palace-new.jpg", "summary_image": "/static/images/summary-palace.jpg", "tagline": "宫阙巍然，气象恢弘"},
    "桥梁": {"label": "桥梁", "fallback_title": "赵州桥", "image": "/static/images/category-bridge-new.jpg", "summary_image": "/static/images/summary-bridge.jpg", "tagline": "跨水如虹，结构精妙"},
}

SPECIAL_CATEGORY_TITLES = {"皇宫": "宫阙中枢", "官府": "礼制政务", "民居": "院落家居", "桥梁": "跨水营造"}
INTERACTIVE_HOT_QUESTIONS = [
    {"title": "先看代表案例", "question": "桥梁类古代建筑有哪些代表案例？", "summary": "适合先快速建立建筑类型印象。"},
    {"title": "按朝代梳理", "question": "宋代有哪些重要的中国古代建筑著作？", "summary": "适合沿着制度化营造的线索继续读。"},
    {"title": "找关键人物", "question": "谁推动了古代都城规划的发展？", "summary": "适合串联人物、都城与制度背景。"},
    {"title": "理解文化概念", "question": "斗拱体现了哪些建筑智慧？", "summary": "适合从工艺和审美角度切入。"},
]
INTERACTIVE_SERVICE_CARDS = [
    {"title": "按问题找答案", "text": "围绕建筑、人物、著作和文化概念直接提问。", "href": "/ai", "label": "进入 快问快答"},
    {"title": "按留言看反馈", "text": "集中浏览访客建议、问题与站点回复。", "href": "/messages", "label": "进入 网友留言"},
    {"title": "按收藏做专题", "text": "把关心的条目整理成自己的课堂或汇报路线。", "href": "/collections", "label": "进入 收藏室"},
]
MESSAGE_BOARD_SEED = [
    {"id": "msg-001", "title": "希望增加按朝代快速导览的入口", "author": "华章访客", "date": "2026-04-18", "tag": "功能建议", "content": "如果能提供“先秦、汉唐、宋元、明清”这样的快捷入口，会更方便教学使用。", "reply": "已纳入后续优化方向，后续会优先补充按朝代组织的快捷路线。", "status": "已回复"},
    {"id": "msg-002", "title": "地图页面建议突出重点地区", "author": "建筑史学习者", "date": "2026-04-15", "tag": "页面体验", "content": "如果地图能先展示高密度地区，再展开到全国，会更容易理解。", "reply": "新版地图已加入地区筛选与重点区域跳转，并保留全国视角。", "status": "已回复"},
    {"id": "msg-003", "title": "希望快问快答提供提问模板", "author": "课程助教", "date": "2026-04-11", "tag": "教学使用", "content": "很多同学不知道怎么问，建议补几个常用模板。", "reply": "该建议已采纳，当前版本已加入快捷提问卡片与主题入口。", "status": "已回复"},
]


def _slug_record(dataset: str, item_slug: str) -> dict[str, Any] | None:
    return next((item for item in dataset_records(dataset) if item["title"] == item_slug), None)


@lru_cache(maxsize=4)
def _cached_overview(_signature: tuple[tuple[str, int], ...]) -> dict[str, Any]:
    return build_overview()


def _overview() -> dict[str, Any]:
    return _cached_overview(_dataset_signature())


def _nav_context(page_title: str, page_key: str, nav_section: str) -> dict[str, Any]:
    return {
        "browser_title": f"{page_title} | 古建华章",
        "page_title": page_title,
        "page_key": page_key,
        "nav_section": nav_section,
        "overview": _overview(),
    }


@app.context_processor
def inject_detail_url_helper() -> dict[str, Any]:
    return {"detail_url": record_detail_path}


def _video_href(record: dict[str, Any]) -> str:
    return str(record.get("details", {}).get("视频链接") or "#")


def _article_paragraphs(record: dict[str, Any]) -> list[str]:
    paragraphs: list[str] = []
    summary = str(record.get("summary") or "").strip()
    body = str(record.get("body") or "").strip()
    secondary = str(record.get("secondary") or "").strip()
    details = record.get("detail_pairs") or []
    category = str(record.get("category") or record.get("dataset_label") or "当前专题").strip()
    era = str(record.get("era") or "").strip()
    region = str(record.get("region") or record.get("region_short") or "").strip()

    if summary:
        prefix = f"{record['title']}是当前专题中具有代表性的条目之一。"
        context = ""
        if category or era or region:
            parts = []
            if category:
                parts.append(f"它通常被放在“{category}”这条线索中理解")
            if era:
                parts.append(f"时代背景可追溯至{era}")
            if region:
                parts.append(f"并与{region}一带的历史空间密切相关")
            context = "，".join(parts) + "。"
        paragraphs.append(f"{prefix}{context}{summary}")
    if body and body != summary:
        paragraphs.append(
            f"{body} 结合现有条目内容来看，{record['title']}之所以值得被单独提取出来讨论，不只是因为它本身具有辨识度，更因为它往往能够把某一时期的技术水平、制度安排或文化观念集中体现出来，因此适合作为进入相关专题的观察起点。"
        )
    if details:
        facts = "，".join(f"{item['label']}为{item['value']}" for item in details[:4])
        paragraphs.append(
            f"从条目资料看，{record['title']}{facts}。这些信息共同构成了它的历史与技术背景，也帮助我们把它放回更完整的研究语境中理解：它既不是孤立存在的单一对象，也不是只供浏览的静态名词，而是与时代制度、营造方法、地域环境和相关人物持续发生联系的一个知识节点。"
        )
    if secondary:
        paragraphs.append(
            f"进一步延展阅读时，可以重点关注：{secondary}。如果继续沿着这些关联线索展开，通常还可以把{record['title']}与同类建筑、相关人物、制度文献或文化观念联系起来阅读，从而形成比单条资料更完整的理解框架。"
        )

    return paragraphs[:4] or [f"{record['title']}是当前资料库中的一个重要条目，围绕它通常可以进一步串联起时代背景、营造经验和相关文化线索。"]


def _achievement_feature_tiles(record: dict[str, Any]) -> list[dict[str, str]]:
    related = related_records(record, limit=5)
    tiles: list[dict[str, str]] = []
    themes = ["earth", "ink", "jade"]
    for index, item in enumerate(related):
        tiles.append(
            {
                "theme": themes[index % len(themes)],
                "href": record_detail_path(item),
                "title": item["title"],
                "subtitle": item.get("category") or item.get("dataset_label") or "相关条目",
                "summary": item.get("summary") or "",
                "image": item.get("image") or "",
            }
        )
    return tiles


def _home_tool_cards(overview: dict[str, Any]) -> list[dict[str, Any]]:
    dataset_stats = overview.get("dataset_stats", [])
    bars = [{"label": item["label"].replace("中国古代建筑", ""), "count": item["count"], "accent": item["accent"]} for item in dataset_stats]
    return [
        {"key": "viz", "route": "/explorer/visualization", "title": "数据可视化", "description": "直接查看板块规模、类别结构和时代分布。", "preview": "bars", "bars": bars},
        {
            "key": "knowledge",
            "route": "/knowledge",
            "title": "知识图谱",
            "description": "从建筑、人物、著作与文化之间的关系进入站内内容。",
            "preview": "graph",
            "nodes": [
                {"label": "建筑", "x": 50, "y": 22, "size": "lg", "accent": "#9c4f2f"},
                {"label": "人物", "x": 20, "y": 58, "size": "md", "accent": "#2d5d62"},
                {"label": "著作", "x": 46, "y": 72, "size": "sm", "accent": "#7b5b2f"},
                {"label": "文化", "x": 76, "y": 60, "size": "md", "accent": "#5a4f7c"},
            ],
            "edges": [
                {"x1": 50, "y1": 22, "x2": 20, "y2": 58},
                {"x1": 50, "y1": 22, "x2": 46, "y2": 72},
                {"x1": 50, "y1": 22, "x2": 76, "y2": 60},
                {"x1": 20, "y1": 58, "x2": 46, "y2": 72},
                {"x1": 46, "y1": 72, "x2": 76, "y2": 60},
            ],
        },
        {"key": "ai", "route": "/ai", "title": "快问快答", "description": "围绕建筑史脉络、代表条目和文化概念继续提问。", "preview": "chat", "messages": [{"role": "user", "text": "宋代有哪些建筑著作？"}, {"role": "assistant", "text": "可先从《营造法式》等文献切入。"}]},
        {"key": "collection", "route": "/collections", "title": "收藏室", "description": "把关注条目整理成自己的浏览路线与专题清单。", "preview": "stack", "items": ["故宫", "赵州桥", "李诫"]},
    ]


def _building_gallery_cards() -> list[dict[str, Any]]:
    records = dataset_records("buildings")
    cards: list[dict[str, Any]] = []
    for category, meta in BUILDING_GALLERY_META.items():
        record = next((item for item in records if item["category"] == category and item["title"] == meta["fallback_title"]), None)
        record = record or next((item for item in records if item["category"] == category), None)
        if not record:
            continue
        cards.append(
            {
                "category": category,
                "label": meta["label"],
                "id": record["id"],
                "title": record["title"],
                "era": record["era"],
                "summary": record["summary"],
                "image": meta["image"],
                "summary_image": meta["summary_image"],
                "tagline": meta["tagline"],
                "dataset": "buildings",
            }
        )
    return cards


def _gallery_halls() -> list[dict[str, Any]]:
    halls: list[dict[str, Any]] = []
    accent_map = {"皇宫": "#9c4f2f", "官府": "#8c5a33", "民居": "#735439", "桥梁": "#7c6a38"}
    for card in _building_gallery_cards():
        items = [item for item in dataset_records("buildings") if item["category"] == card["category"]][:6]
        if not items:
            continue
        halls.append(
            {
                "slug": card["category"],
                "kicker": "影像展厅",
                "title": card["label"],
                "count": len(items),
                "accent": accent_map.get(card["category"], "#9c4f2f"),
                "featured": items[0],
                "items": items,
            }
        )
    return halls


def _building_map_records() -> list[dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "title": item["title"],
            "category": item["category"],
            "era": item["era"],
            "region": item["region"] or item["region_short"] or "未详",
            "region_short": item["region_short"] or "未详",
            "summary": item["summary"],
            "image": item.get("image") or "",
            "href": record_detail_path(item),
        }
        for item in dataset_records("buildings")
    ]


def _achievement_exhibit_cards() -> list[dict[str, Any]]:
    cards: list[dict[str, Any]] = []
    for index, record in enumerate(dataset_records("buildings")):
        cards.append(
            {
                "title": record["title"],
                "category": record["category"],
                "category_title": SPECIAL_CATEGORY_TITLES.get(record["category"], record["category"]),
                "lead": record.get("body") or record.get("summary") or "",
                "summary": record.get("summary") or "",
                "era": record.get("era") or "",
                "region": record.get("region") or "",
                "image": record.get("image") or "",
                "intro_href": record_detail_path(record),
                "digital_href": _video_href(record),
                "meta_items": [
                    f"建筑类型：{record['category']}",
                    f"时代线索：{record['era'] or '未详'}",
                    f"地理位置：{record['region'] or '未详'}",
                ],
                "is_reverse": bool(index % 2),
            }
        )
    return cards


def _museum_page(dataset: str) -> dict[str, Any]:
    records = dataset_records(dataset)
    sorted_records = sorted(records, key=lambda item: (item.get("year_sort") is None, item.get("year_sort") or 999999, item["title"]))
    category_counter: dict[str, int] = {}
    eras: list[str] = []
    for item in records:
        category = str(item.get("category") or "").strip()
        era = str(item.get("era") or "").strip()
        if category:
            category_counter[category] = category_counter.get(category, 0) + 1
        if era and era not in eras:
            eras.append(era)
    category_stats = [{"label": key, "count": value} for key, value in sorted(category_counter.items(), key=lambda pair: (-pair[1], pair[0]))]
    return {"records": sorted_records, "timeline_records": sorted_records, "category_stats": category_stats, "eras": eras}


def _interactive_recommendations() -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for key in DATASET_META:
        dataset_items = dataset_records(key)
        if dataset_items:
            result.append(dataset_items[0])
    return result


def _explorer_browser_filters(overview: dict[str, Any]) -> dict[str, Any]:
    records = load_records()
    datasets = []
    dataset_filter_map: dict[str, dict[str, list[str]]] = {}
    all_categories = sorted({item["category"] for item in records if item.get("category")})
    all_regions = sorted({item["region_short"] for item in records if item.get("region_short")})

    for item in overview.get("dataset_stats", []):
        key = item["key"]
        dataset_items = [record for record in records if record["dataset"] == key]
        datasets.append({"key": key, "label": item["label"], "count": item["count"]})
        dataset_filter_map[key] = {
            "categories": sorted({record["category"] for record in dataset_items if record.get("category")}),
            "regions": sorted({record["region_short"] for record in dataset_items if record.get("region_short")}),
        }

    return {"datasets": datasets, "filters": {"all": {"categories": all_categories, "regions": all_regions}, **dataset_filter_map}}


def _render_about_page(section_key: str) -> str:
    about_page = ABOUT_PAGES[section_key]
    return render_template("about.html", about_page=about_page, about_section_key=section_key, **_nav_context(about_page["page_title"], f"about-{section_key}", "about"))


@app.route("/")
def home():
    overview = _overview()
    return render_template(
        "index.html",
        history_timeline=HOME_HISTORY_TIMELINE,
        building_gallery_cards=_building_gallery_cards(),
        home_tool_cards=_home_tool_cards(overview),
        **_nav_context("首页", "home", "home"),
    )


@app.route("/about")
def about_page():
    return _render_about_page("intro")


@app.route("/about/framework")
def about_framework_page():
    return _render_about_page("framework")


@app.route("/about/vision")
def about_vision_page():
    return _render_about_page("vision")


@app.route("/explorer")
def explorer():
    overview = _overview()
    default_filters = {key: request.args.get(key, "") for key in ("q", "dataset", "region", "category")}
    return render_template(
        "explorer_curated_v3.html",
        explorer_page=EXPLORER_OVERVIEW_PAGE,
        explorer_browser_filters=_explorer_browser_filters(overview),
        default_filters=default_filters,
        **_nav_context("数据浏览", "explorer", "explorer"),
    )


@app.route("/explorer/visualization")
def explorer_visualization():
    return render_template(
        "visualization.html",
        explorer_page=EXPLORER_OVERVIEW_PAGE,
        hero_kicker="数据总览",
        hero_title="可视化总览",
        hero_description="按地区、板块与时代观察站内资料的整体结构。",
        section_focus={"region_map_view": REGION_MAP_VIEW},
        **_nav_context("可视化总览", "explorer-visualization", "explorer"),
    )


@app.route("/explorer/guide")
def explorer_guide():
    return redirect("/ai")


@app.route("/achievements")
def achievements():
    topic_page = {
        "hero_title": "建筑成就",
        "hero_description": "以《中国古代建筑成就》为主线，重组宫阙、官署、民居与桥梁四类代表案例。",
        "band_title": "专题陈列",
        "breadcrumb_title": "建筑成就",
    }
    return render_template("topic_achievements.html", topic_page=topic_page, exhibit_cards=_achievement_exhibit_cards(), **_nav_context("建筑成就", "achievements", "special"))


@app.route("/gallery")
def gallery():
    topic_page = {"hero_title": "影像展厅", "hero_description": "围绕重点古建条目提供沉浸式影像和 3D 展示入口。", "band_title": "专题陈列", "breadcrumb_title": "影像展厅"}
    halls = _gallery_halls()
    return render_template("topic_gallery.html", topic_page=topic_page, gallery_halls=halls, **_nav_context("影像展厅", "gallery", "special"))


@app.route("/map")
def map_page():
    topic_page = {"hero_title": "建筑地图", "hero_description": "按地区与建筑类型查看古代建筑条目的空间分布。", "band_title": "专题陈列", "breadcrumb_title": "建筑地图"}
    map_records = _building_map_records()
    return render_template(
        "topic_map.html",
        topic_page=topic_page,
        map_categories=sorted({item["category"] for item in map_records if item["category"]}),
        map_regions=sorted({item["region_short"] for item in map_records if item["region_short"]}),
        map_records=map_records,
        map_viewports=REGION_MAP_VIEW,
        **_nav_context("建筑地图", "map", "special"),
    )


@app.route("/figures")
def figures():
    topic_page = {"hero_title": "杰出人物", "hero_description": "以人物为线索整理中国古代建筑史中的营造者、规划者与建筑学家。", "band_title": "馆藏专题", "breadcrumb_title": "杰出人物"}
    return render_template("topic_figures.html", topic_page=topic_page, museum_page=_museum_page("scientists"), **_nav_context("杰出人物", "figures", "collections"))


@app.route("/figures/treatises")
def treatises_page():
    topic_page = {"hero_title": "建筑著作", "hero_description": "把建筑理论、施工规范与园林文献整理成连续可浏览的著作专题。", "band_title": "馆藏专题", "breadcrumb_title": "建筑著作"}
    return render_template("topic_treatises.html", topic_page=topic_page, museum_page=_museum_page("treatises"), **_nav_context("建筑著作", "treatises", "collections"))


@app.route("/figures/culture")
def culture_page():
    topic_page = {"hero_title": "建筑文化", "hero_description": "围绕结构、礼制、装饰、民居与工程传统重组建筑文化条目。", "band_title": "馆藏专题", "breadcrumb_title": "建筑文化"}
    return render_template("topic_culture.html", topic_page=topic_page, museum_page=_museum_page("culture"), **_nav_context("建筑文化", "culture", "collections"))


@app.route("/knowledge")
def knowledge():
    sections = {key: dataset_records(key) for key in DATASET_META}
    return render_template("knowledge.html", dataset_meta=DATASET_META, knowledge_sections=sections, **_nav_context("知识图谱", "knowledge", "knowledge"))


@app.route("/ai")
def ai_page():
    suggested_questions = [item["question"] for item in INTERACTIVE_HOT_QUESTIONS]
    return render_template(
        "guide.html",
        hot_questions=INTERACTIVE_HOT_QUESTIONS,
        service_cards=INTERACTIVE_SERVICE_CARDS,
        suggested_questions=suggested_questions,
        **_nav_context("快问快答", "ai", "interactive"),
    )


@app.route("/messages")
def messages_page():
    return render_template("messages.html", message_seed=MESSAGE_BOARD_SEED, **_nav_context("网友留言", "messages", "interactive"))


@app.route("/collections")
def collections():
    return render_template("collections.html", featured_records=_interactive_recommendations(), **_nav_context("收藏室", "collections", "interactive"))


@app.route("/achievements/<path:item_slug>/")
def achievement_detail(item_slug: str):
    record = _slug_record("buildings", item_slug)
    if not record:
        abort(404)
    explorer_params = urlencode({"dataset": "buildings", "category": record.get("category", "")})
    return render_template(
        "achievement_detail.html",
        record=record,
        article_paragraphs=_article_paragraphs(record),
        feature_tiles=_achievement_feature_tiles(record),
        digital_href=_video_href(record),
        explorer_href=f"/explorer?{explorer_params}",
        **_nav_context(record["title"], "achievement-detail", "achievements"),
    )


def _render_collection_detail(record: dict[str, Any], *, band_title: str, index_endpoint: str, index_title: str, intro_title: str) -> str:
    return render_template(
        "collection_detail.html",
        record=record,
        band_title=band_title,
        index_endpoint=index_endpoint,
        index_title=index_title,
        intro_title=intro_title,
        article_paragraphs=_article_paragraphs(record),
        related=related_records(record, limit=4),
        digital_href=_video_href(record),
        **_nav_context(record["title"], f"{record['dataset']}-detail", "figures"),
    )


@app.route("/figures/<path:item_slug>/")
def figure_detail(item_slug: str):
    record = _slug_record("scientists", item_slug)
    if not record:
        abort(404)
    return _render_collection_detail(record, band_title="建筑科学家", index_endpoint="figures", index_title="杰出人物", intro_title="人物简介")


@app.route("/figures/treatises/<path:item_slug>/")
def treatise_detail(item_slug: str):
    record = _slug_record("treatises", item_slug)
    if not record:
        abort(404)
    return _render_collection_detail(record, band_title="建筑著作", index_endpoint="treatises_page", index_title="建筑著作", intro_title="著作简介")


@app.route("/figures/culture/<path:item_slug>/")
def culture_detail(item_slug: str):
    record = _slug_record("culture", item_slug)
    if not record:
        abort(404)
    return _render_collection_detail(record, band_title="建筑文化", index_endpoint="culture_page", index_title="建筑文化", intro_title="文化简介")


@app.route("/api/overview")
def api_overview():
    return jsonify(_overview())


@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok"})


@app.route("/api/items")
def api_items():
    items = filter_records(
        query=request.args.get("q", ""),
        dataset=request.args.get("dataset", ""),
        category=request.args.get("category", ""),
        era=request.args.get("era", ""),
        region=request.args.get("region", ""),
    )
    return jsonify({"items": items, "total": len(items)})


@app.route("/api/items/<record_id>")
def api_item_detail(record_id: str):
    record = get_record(record_id)
    if not record:
        abort(404)
    return jsonify(record)


@app.route("/api/guide")
def api_guide():
    return jsonify(guide_answer(request.args.get("q", "")))


@app.route("/api/search")
def api_search():
    query = request.args.get("q", "")
    matches = filter_records(query=query)
    return jsonify({"items": matches, "total": len(matches)})


@app.route("/api/records")
def api_records():
    records = load_records()
    return jsonify({"items": records, "total": len(records)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=os.environ.get("FLASK_DEBUG") == "1")
