from __future__ import annotations

import csv
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import quote


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data_cn"
STATIC_DIR = BASE_DIR / "static"


def record_detail_path(record: dict[str, Any]) -> str:
    dataset = str(record.get("dataset", "")).strip()
    title = str(record.get("title", "")).strip()
    if dataset == "buildings":
        return f"/achievements/{quote(title)}/" if title else "/achievements/"
    if dataset == "scientists":
        return f"/figures/{quote(title)}/" if title else "/figures/"
    if dataset == "treatises":
        return f"/figures/treatises/{quote(title)}/" if title else "/figures/treatises/"
    if dataset == "culture":
        return f"/figures/culture/{quote(title)}/" if title else "/figures/culture/"
    return "/knowledge"


DATASET_FILES: dict[str, str] = {
    "buildings": "\u4e2d\u56fd\u53e4\u4ee3\u5efa\u7b51\u6210\u5c31.csv",
    "scientists": "\u4e2d\u56fd\u53e4\u4ee3\u5efa\u7b51\u79d1\u5b66\u5bb6.csv",
    "treatises": "\u4e2d\u56fd\u53e4\u4ee3\u5efa\u7b51\u8457\u4f5c.csv",
    "culture": "\u4e2d\u56fd\u53e4\u4ee3\u5efa\u7b51\u6587\u5316.csv",
}
IMAGE_DATASET_DIRS: dict[str, str] = {
    "buildings": "\u4e2d\u56fd\u53e4\u4ee3\u5efa\u7b51\u6210\u5c31",
    "scientists": "\u79d1\u5b66\u5bb6",
    "treatises": "\u8457\u4f5c",
    "culture": "\u53e4\u4ee3\u5efa\u7b51\u6587\u5316\u56fe\u7247",
}
CULTURE_IMAGE_HINTS: dict[str, tuple[str, ...]] = {
    "\u6597\u62f1": ("\u6597\u62f1",),
    "\u69ab\u536f\u7ed3\u6784": ("\u69ab\u536f",),
    "\u62ac\u6881\u5f0f\u6728\u6784\u67b6": ("\u62ac\u6881\u5f0f\u6728\u6784\u67b6",),
    "\u7a7f\u6597\u5f0f\u6728\u6784\u67b6": ("\u7a7f\u6597\u5f0f\u6728\u67b6\u6784", "\u7a7f\u6597\u5f0f\u6728\u6784\u67b6"),
    "\u5e72\u680f\u5f0f\u5efa\u7b51": ("\u5e72\u680f\u5f0f\u5efa\u7b51",),
    "\u5c4b\u9876\u7b49\u7ea7\u5236\u5ea6": (
        "\u5e91\u6bbf\u5f0f\u5c4b\u9876",
        "\u6b47\u5c71\u9876",
        "\u60ac\u5c71\u9876",
        "\u786c\u5c71\u9876",
        "\u6512\u5c16\u9876",
    ),
    "\u4e2d\u8f74\u5bf9\u79f0\u5e03\u5c40": ("\u4e2d\u8f74\u5bf9\u79f0\u5e03\u5c40",),
    "\u524d\u671d\u540e\u5bdd\u5236\u5ea6": ("\u524d\u671d\u540e\u5bdd\u5236\u5ea6",),
    "\u56db\u5408\u9662\u6587\u5316": ("\u56db\u5408\u9662",),
    "\u98ce\u6c34\u4e0e\u5efa\u7b51\u9009\u5740": ("\u53e4\u4ee3\u5efa\u7b51\u98ce\u6c34",),
    "\u592f\u571f\u6280\u672f": ("\u592f\u571f\u6280\u672f",),
    "\u7409\u7483\u74e6\u5de5\u827a": ("\u7409\u7483\u74e6",),
    "\u5f69\u753b\u827a\u672f": ("\u5f69\u753b\u827a\u672f",),
    "\u7816\u96d5\u77f3\u96d5\u6728\u96d5": ("\u7816\u96d5", "\u77f3\u96d5", "\u6728\u96d5"),
    "\u85fb\u4e95": ("\u85fb\u4e95",),
    "\u5f71\u58c1\uff08\u7167\u58c1\uff09": ("\u5f71\u58c1",),
    "\u724c\u574a": ("\u724c\u574a",),
    "\u5efa\u7b51\u8272\u5f69\u6587\u5316": ("\u8272\u5f69\u6587\u5316", "\u7409\u7483\u74e6"),
    "\u56ed\u6797\u9020\u666f\u6587\u5316": ("\u56ed\u6797",),
    "\u7a91\u6d1e\u6c11\u5c45\u6587\u5316": ("\u7a91\u6d1e\u6c11\u5c45\u6587\u5316",),
    "\u571f\u697c\u6c11\u5c45\u6587\u5316": ("\u571f\u697c\u6c11\u5c45\u6587\u5316",),
    "\u4e07\u91cc\u957f\u57ce": ("\u957f\u57ce",),
    "\u5927\u8fd0\u6cb3\u5de5\u7a0b": ("\u5927\u8fd0\u6cb3",),
    "\u5efa\u7b51\u6a21\u6570\u5236\u5ea6": ("\u5efa\u7b51\u6a21\u6570\u5236\u5ea6",),
}

DATASET_META: dict[str, dict[str, str]] = {
    "buildings": {
        "label": "中国古代建筑成就",
        "full_label": "中国古代建筑成就",
        "accent": "#9c4f2f",
        "description": "聚焦古代民居、官府、皇宫、桥梁等建筑成就与营造智慧。",
        "category_label": "建筑类型",
    },
    "scientists": {
        "label": "中国古代建筑科学家",
        "full_label": "中国古代建筑科学家",
        "accent": "#2d5d62",
        "description": "梳理推动古代建筑技术演进的重要人物与工匠精神。",
        "category_label": "身份",
    },
    "treatises": {
        "label": "中国古代建筑著作",
        "full_label": "中国古代建筑著作",
        "accent": "#7b5b2f",
        "description": "提炼中国古代建筑理论、工艺标准与制度文献。",
        "category_label": "著作类别",
    },
    "culture": {
        "label": "中国古代建筑文化",
        "full_label": "中国古代建筑文化",
        "accent": "#5a4f7c",
        "description": "展示传统建筑背后的结构智慧、礼制观念与文化传承。",
        "category_label": "文化类别",
    },
}

STOPWORDS = {
    "中国",
    "古代",
    "建筑",
    "文化",
    "著作",
    "科学家",
    "成就",
    "研究",
    "重要",
    "代表",
    "体现",
    "中国古代建筑成就",
    "中国古代建筑科学家",
    "中国古代建筑著作",
    "中国古代建筑文化",
}

PROVINCES = [
    "北京市",
    "天津市",
    "上海市",
    "重庆市",
    "北京",
    "天津",
    "上海",
    "重庆",
    "河北",
    "山西",
    "辽宁",
    "吉林",
    "黑龙江",
    "江苏",
    "浙江",
    "安徽",
    "福建",
    "江西",
    "山东",
    "河南",
    "湖北",
    "湖南",
    "广东",
    "海南",
    "四川",
    "贵州",
    "云南",
    "陕西",
    "甘肃",
    "青海",
    "台湾",
    "内蒙古",
    "广西",
    "西藏",
    "宁夏",
    "新疆",
    "香港",
    "澳门",
]


TREATISE_REGION_HINTS: dict[str, str] = {
    "《考工记》": "山东",
    "《营造法式》": "河南",
    "《木经》": "浙江",
    "《园冶》": "江苏",
    "《工程做法则例》": "北京",
    "《长物志》": "江苏",
    "《鲁班经》": "山东",
    "《匠人》": "陕西",
    "《梓人传》": "广西",
    "《水经注》": "河北",
}

CULTURE_REGION_HINTS: dict[str, str] = {
    "斗拱": "山西",
    "榫卯结构": "浙江",
    "抬梁式木构架": "北京",
    "穿斗式木构架": "四川",
    "干栏式建筑": "浙江",
    "屋顶等级制度": "北京",
    "中轴对称布局": "北京",
    "前朝后寝制度": "北京",
    "四合院文化": "北京",
    "风水与建筑选址": "江西",
    "夯土技术": "陕西",
    "琉璃瓦工艺": "北京",
    "彩画艺术": "北京",
    "砖雕石雕木雕": "安徽",
    "藻井": "北京",
    "影壁（照壁）": "北京",
    "牌坊": "安徽",
    "建筑色彩文化": "北京",
    "园林造景文化": "江苏",
    "窑洞民居文化": "陕西",
    "土楼民居文化": "福建",
    "万里长城": "北京",
    "大运河工程": "江苏",
    "建筑模数制度": "河南",
}

SCIENTIST_REGION_HINTS: dict[str, str] = {
    "徐杲": "北京",
    "郭安兴": "河南",
    "杨城延": "陕西",
}

BUILDING_REGION_HINTS: dict[str, str] = {
    "万里长城": "北京",
}


def _normalize_asset_name(text: str) -> str:
    if not text:
        return ""
    normalized = text.strip().lower()
    normalized = normalized.replace("\uff08", "(").replace("\uff09", ")")
    normalized = re.sub(r"\s+", "", normalized)
    normalized = re.sub(r"[\"'`.,!?;:()\[\]{}<>《》“”‘’、，。；：·_-]+", "", normalized)
    normalized = re.sub(r"\d+$", "", normalized)
    return normalized


def _static_asset_url(*parts: str) -> str:
    return "/static/" + "/".join(quote(part) for part in parts)


@lru_cache(maxsize=4)
def _image_catalog(_signature: tuple[tuple[str, int], ...]) -> dict[str, dict[str, Any]]:
    catalog: dict[str, dict[str, Any]] = {}
    for dataset, directory_name in IMAGE_DATASET_DIRS.items():
        directory = STATIC_DIR / directory_name
        by_name: dict[str, list[str]] = {}
        assets: list[tuple[str, str]] = []
        if directory.exists():
            for path in sorted(directory.iterdir(), key=lambda item: item.name):
                if not path.is_file():
                    continue
                asset_key = _normalize_asset_name(path.stem)
                asset_url = _static_asset_url(directory_name, path.name)
                by_name.setdefault(asset_key, []).append(asset_url)
                assets.append((asset_key, asset_url))
        catalog[dataset] = {"by_name": by_name, "assets": assets}
    return catalog


def _record_images(dataset: str, title: str) -> list[str]:
    dataset_catalog = _image_catalog(_dataset_signature()).get(dataset, {})
    by_name = dataset_catalog.get("by_name", {})
    assets = dataset_catalog.get("assets", [])
    direct_matches = list(by_name.get(_normalize_asset_name(title), []))
    if direct_matches:
        return direct_matches

    if dataset != "culture":
        return []

    matches: list[str] = []
    seen: set[str] = set()
    for hint in CULTURE_IMAGE_HINTS.get(title, (title,)):
        hint_key = _normalize_asset_name(hint)
        for asset_key, asset_url in assets:
            if hint_key and hint_key in asset_key and asset_url not in seen:
                matches.append(asset_url)
                seen.add(asset_url)
    return matches


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def _parse_year(text: str) -> int | None:
    if not text:
        return None
    cleaned = text.replace(" ", "")
    before_century = re.search(r"前(\d+)世纪", cleaned)
    if before_century:
        return -int(before_century.group(1)) * 100

    before_year = re.search(r"前(\d+)年", cleaned)
    if before_year:
        return -int(before_year.group(1))

    century = re.search(r"(\d+)世纪", cleaned)
    if century:
        return int(century.group(1)) * 100

    year = re.search(r"(\d{2,4})年", cleaned)
    if year:
        return int(year.group(1))
    return None


def _extract_region(text: str) -> str:
    if not text:
        return ""
    for province in PROVINCES:
        if province in text:
            return province.replace("市", "")
    stripped = re.sub(r"[，、,\s]+", "", text)
    return stripped[:2] if stripped else ""


def _infer_region(dataset: str, row: dict[str, str]) -> str:
    if dataset == "buildings":
        return BUILDING_REGION_HINTS.get(row.get("名称", ""), "")
    if dataset == "scientists":
        return SCIENTIST_REGION_HINTS.get(row.get("姓名", ""), "")
    if dataset == "treatises":
        return TREATISE_REGION_HINTS.get(row.get("书名", ""), "")
    if dataset == "culture":
        return CULTURE_REGION_HINTS.get(row.get("文化元素", ""), "")
    return ""


def _record_region_short(dataset: str, row: dict[str, str], region: str) -> str:
    extracted = _extract_region(region)
    if extracted and extracted not in {"中国", "不详"}:
        return extracted

    inferred = _infer_region(dataset, row)
    return inferred or extracted


def _compact(text: str, limit: int = 90) -> str:
    if not text:
        return ""
    normalized = re.sub(r"\s+", " ", text).strip()
    return normalized if len(normalized) <= limit else normalized[: limit - 1] + "…"


def _non_empty(raw: dict[str, str]) -> dict[str, str]:
    return {key: value for key, value in raw.items() if value}


def _record_title(dataset: str, row: dict[str, str]) -> str:
    mapping = {
        "buildings": row.get("名称", ""),
        "scientists": row.get("姓名", ""),
        "treatises": row.get("书名", ""),
        "culture": row.get("文化元素", ""),
    }
    return mapping[dataset]


def _record_category(dataset: str, row: dict[str, str]) -> str:
    mapping = {
        "buildings": row.get("建筑类型", ""),
        "scientists": row.get("身份", ""),
        "treatises": row.get("著作类别", ""),
        "culture": row.get("文化类别", ""),
    }
    return mapping[dataset]


def _record_era(dataset: str, row: dict[str, str]) -> str:
    mapping = {
        "buildings": row.get("朝代", ""),
        "scientists": row.get("朝代", ""),
        "treatises": row.get("朝代", ""),
        "culture": row.get("起源朝代", ""),
    }
    return mapping[dataset]


def _record_year_label(dataset: str, row: dict[str, str]) -> str:
    mapping = {
        "buildings": row.get("建造年代", ""),
        "scientists": row.get("生卒年", ""),
        "treatises": row.get("成书年代", ""),
        "culture": row.get("起源朝代", ""),
    }
    return mapping[dataset]


def _record_region(dataset: str, row: dict[str, str]) -> str:
    mapping = {
        "buildings": row.get("地理位置", ""),
        "scientists": row.get("籍贯", ""),
        "treatises": "",
        "culture": "",
    }
    return mapping[dataset]


def _record_summary(dataset: str, row: dict[str, str]) -> str:
    mapping = {
        "buildings": row.get("简介", "") or row.get("自然科学成就", ""),
        "scientists": row.get("简介", "") or row.get("主要贡献", ""),
        "treatises": row.get("简介", "") or row.get("内容概要", ""),
        "culture": row.get("核心描述", "") or row.get("文化内涵与传承", ""),
    }
    return mapping[dataset]


def _record_body(dataset: str, row: dict[str, str]) -> str:
    mapping = {
        "buildings": row.get("自然科学成就", "") or row.get("简介", ""),
        "scientists": row.get("主要贡献", "") or row.get("科学家精神", ""),
        "treatises": row.get("内容概要", "") or row.get("学术价值", ""),
        "culture": row.get("文化内涵与传承", "") or row.get("补充说明", ""),
    }
    return mapping[dataset]


def _record_secondary(dataset: str, row: dict[str, str]) -> str:
    mapping = {
        "buildings": row.get("建造者", ""),
        "scientists": row.get("科学家精神", ""),
        "treatises": row.get("作者", ""),
        "culture": row.get("补充说明", ""),
    }
    return mapping[dataset]


def _record_detail_pairs(dataset: str, row: dict[str, str]) -> list[dict[str, str]]:
    if dataset == "buildings":
        pairs = [
            ("建筑类型", row.get("建筑类型", "")),
            ("朝代", row.get("朝代", "")),
            ("建造年代", row.get("建造年代", "")),
            ("地理位置", row.get("地理位置", "")),
            ("建造者", row.get("建造者", "")),
        ]
    elif dataset == "scientists":
        pairs = [
            ("朝代", row.get("朝代", "")),
            ("生卒年", row.get("生卒年", "")),
            ("籍贯", row.get("籍贯", "")),
            ("身份", row.get("身份", "")),
            ("科学家精神", row.get("科学家精神", "")),
        ]
    elif dataset == "treatises":
        pairs = [
            ("朝代", row.get("朝代", "")),
            ("作者", row.get("作者", "")),
            ("成书年代", row.get("成书年代", "")),
            ("著作类别", row.get("著作类别", "")),
            ("学术价值", row.get("学术价值", "")),
        ]
    else:
        pairs = [
            ("文化类别", row.get("文化类别", "")),
            ("起源朝代", row.get("起源朝代", "")),
            ("核心描述", row.get("核心描述", "")),
            ("补充说明", row.get("补充说明", "")),
        ]
    return [{"label": label, "value": value} for label, value in pairs if value]


def _record_from_row(dataset: str, index: int, row: dict[str, str]) -> dict[str, Any]:
    meta = DATASET_META[dataset]
    title = _record_title(dataset, row)
    images = _record_images(dataset, title)
    category = _record_category(dataset, row)
    era = _record_era(dataset, row)
    year_label = _record_year_label(dataset, row)
    region = _record_region(dataset, row)
    region_short = _record_region_short(dataset, row, region)
    summary = _record_summary(dataset, row)
    body = _record_body(dataset, row)
    secondary = _record_secondary(dataset, row)
    searchable_values = " ".join(value for value in row.values() if value)
    return {
        "id": f"{dataset}-{index + 1:03d}",
        "dataset": dataset,
        "dataset_label": meta["label"],
        "dataset_full_label": meta["full_label"],
        "accent": meta["accent"],
        "title": title,
        "category": category,
        "era": era,
        "image": images[0] if images else "",
        "images": images,
        "year_label": year_label,
        "year_sort": _parse_year(year_label),
        "region": region,
        "region_short": region_short,
        "summary": _compact(summary, 96),
        "body": body,
        "secondary": secondary,
        "initial": title[:1],
        "detail_pairs": _record_detail_pairs(dataset, row),
        "details": _non_empty(row),
        "search_text": searchable_values.lower(),
    }


def _dataset_signature() -> tuple[tuple[str, int], ...]:
    signature: list[tuple[str, int]] = [
        (dataset, (DATA_DIR / DATASET_FILES[dataset]).stat().st_mtime_ns)
        for dataset in DATASET_META
    ]
    for dataset, directory_name in IMAGE_DATASET_DIRS.items():
        directory = STATIC_DIR / directory_name
        if not directory.exists():
            signature.append((f"images:{dataset}", 0))
            continue
        for path in sorted(directory.iterdir(), key=lambda item: item.name):
            if path.is_file():
                signature.append((f"images:{dataset}:{path.name}", path.stat().st_mtime_ns))
    return tuple(signature)


@lru_cache(maxsize=4)
def _load_records_cached(_signature: tuple[tuple[str, int], ...]) -> tuple[dict[str, Any], ...]:
    records: list[dict[str, Any]] = []
    for dataset in DATASET_META:
        rows = _read_csv(DATA_DIR / DATASET_FILES[dataset])
        for index, row in enumerate(rows):
            records.append(_record_from_row(dataset, index, row))
    return tuple(records)


def load_records() -> list[dict[str, Any]]:
    return list(_load_records_cached(_dataset_signature()))


def dataset_records(dataset: str) -> list[dict[str, Any]]:
    return [record for record in load_records() if record["dataset"] == dataset]


def get_record(record_id: str) -> dict[str, Any] | None:
    return next((record for record in load_records() if record["id"] == record_id), None)


def filter_records(
    *,
    query: str = "",
    dataset: str = "",
    category: str = "",
    era: str = "",
    region: str = "",
) -> list[dict[str, Any]]:
    records = load_records()
    query_lower = query.lower().strip()
    filtered: list[dict[str, Any]] = []
    for record in records:
        if dataset and record["dataset"] != dataset:
            continue
        if category and record["category"] != category:
            continue
        if era and record["era"] != era:
            continue
        if region and record["region_short"] != region:
            continue
        if query_lower and query_lower not in record["search_text"]:
            continue
        filtered.append(record)
    return filtered


def related_records(record: dict[str, Any], limit: int = 4) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    for candidate in load_records():
        if candidate["id"] == record["id"]:
            continue
        same_dataset = candidate["dataset"] == record["dataset"]
        same_era = record["era"] and candidate["era"] == record["era"]
        same_category = record["category"] and candidate["category"] == record["category"]
        if same_dataset or same_era or same_category:
            matches.append(candidate)
    return matches[:limit]


def _keyword_candidates(record: dict[str, Any]) -> list[str]:
    raw_parts = [
        record["title"],
        record["category"],
        record["era"],
        record["region_short"],
        record["secondary"],
    ]
    text = " ".join(part for part in raw_parts if part)
    tokens = re.findall(r"[\u4e00-\u9fff]{2,8}|[A-Za-z0-9]{2,}", text)
    results: list[str] = []
    for token in tokens:
        if token in STOPWORDS:
            continue
        if token.startswith("中国古代"):
            continue
        results.append(token)
    return results


def _build_category_matrix(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    top_categories = [label for label, _ in Counter(record["category"] for record in records if record["category"]).most_common(8)]
    matrix: list[dict[str, Any]] = []
    for category in top_categories:
        dataset_counts = []
        total = 0
        for key, meta in DATASET_META.items():
            count = sum(1 for record in records if record["dataset"] == key and record["category"] == category)
            total += count
            dataset_counts.append({"dataset": key, "label": meta["label"], "count": count, "accent": meta["accent"]})
        matrix.append({"label": category, "total": total, "datasets": dataset_counts})
    return matrix


def _build_era_matrix(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    top_eras = [label for label, _ in Counter(record["era"] for record in records if record["era"]).most_common(8)]
    rows: list[dict[str, Any]] = []
    for era in top_eras:
        dataset_counts = []
        total = 0
        for key, meta in DATASET_META.items():
            count = sum(1 for record in records if record["dataset"] == key and record["era"] == era)
            total += count
            dataset_counts.append({"dataset": key, "label": meta["label"], "count": count, "accent": meta["accent"]})
        rows.append({"label": era, "total": total, "datasets": dataset_counts})
    return rows


def _build_timeline_lanes(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    lanes: list[dict[str, Any]] = []
    timed_records = [record for record in records if record["year_sort"] is not None]
    if not timed_records:
        return lanes
    min_year = min(record["year_sort"] for record in timed_records)
    max_year = max(record["year_sort"] for record in timed_records)
    span = max(max_year - min_year, 1)
    for key, meta in DATASET_META.items():
        lane_records = []
        for record in timed_records:
            if record["dataset"] != key:
                continue
            offset = ((record["year_sort"] - min_year) / span) * 100
            lane_records.append(
                {
                    "id": record["id"],
                    "title": record["title"],
                    "year_label": record["year_label"] or record["era"],
                    "offset": round(offset, 2),
                    "accent": record["accent"],
                    "summary": record["summary"],
                }
            )
        lanes.append({"dataset": key, "label": meta["label"], "accent": meta["accent"], "records": lane_records[:16]})
    return lanes


def _build_keyword_clusters(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keyword_counts = Counter()
    keyword_dataset_counter: dict[str, Counter[str]] = {}
    for record in records:
        tokens = _keyword_candidates(record)
        keyword_counts.update(tokens)
        for token in set(tokens):
            keyword_dataset_counter.setdefault(token, Counter()).update([record["dataset"]])
    clusters: list[dict[str, Any]] = []
    for token, count in keyword_counts.most_common(20):
        dominant_dataset, _ = keyword_dataset_counter[token].most_common(1)[0]
        clusters.append(
            {
                "label": token,
                "count": count,
                "dataset": dominant_dataset,
                "accent": DATASET_META[dominant_dataset]["accent"],
            }
        )
    return clusters


def _build_relation_graph(records: list[dict[str, Any]]) -> dict[str, Any]:
    top_eras = [label for label, _ in Counter(record["era"] for record in records if record["era"]).most_common(4)]
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    for key, meta in DATASET_META.items():
        nodes.append(
            {
                "id": f"dataset:{key}",
                "label": meta["label"],
                "type": "dataset",
                "accent": meta["accent"],
                "size": 32,
            }
        )

    for era in top_eras:
        nodes.append(
            {
                "id": f"era:{era}",
                "label": era,
                "type": "era",
                "accent": "#b1863a",
                "size": 24,
            }
        )

    for key in DATASET_META:
        for record in dataset_records(key)[:3]:
            nodes.append(
                {
                    "id": record["id"],
                    "label": record["title"],
                    "type": "record",
                    "accent": record["accent"],
                    "size": 18,
                    "url": record_detail_path(record),
                }
            )
            edges.append({"source": f"dataset:{key}", "target": record["id"], "label": "板块"})
            if record["era"] in top_eras:
                edges.append({"source": f"era:{record['era']}", "target": record["id"], "label": "时代"})
    return {"nodes": nodes, "edges": edges}


def _build_story_routes() -> list[dict[str, Any]]:
    routes: list[dict[str, Any]] = []
    for key, meta in DATASET_META.items():
        records = dataset_records(key)[:3]
        if not records:
            continue
        routes.append(
            {
                "title": meta["label"],
                "subtitle": meta["description"],
                "accent": meta["accent"],
                "items": [
                    {
                        "id": record["id"],
                        "title": record["title"],
                        "summary": record["summary"],
                        "meta": " · ".join(part for part in [record["era"], record["category"], record["region_short"]] if part),
                    }
                    for record in records
                ],
            }
        )
    return routes


def _quiz_entry(prompt: str, answer: str, options: list[str], explanation: str) -> dict[str, Any]:
    unique_options = []
    for option in [answer, *options]:
        if option and option not in unique_options:
            unique_options.append(option)
    return {
        "question": prompt,
        "answer": answer,
        "options": unique_options[:4],
        "explanation": explanation,
    }


def _distinct_values(records: list[dict[str, Any]], field: str, exclude: str = "") -> list[str]:
    values = []
    for record in records:
        value = record.get(field, "")
        if value and value != exclude and value not in values:
            values.append(value)
    return values


def _build_quiz_questions() -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []

    building_rows = dataset_records("buildings")
    scientist_rows = dataset_records("scientists")
    treatise_rows = dataset_records("treatises")
    culture_rows = dataset_records("culture")

    if building_rows:
        target = building_rows[0]
        distractors = _distinct_values(building_rows, "category", target["category"])
        questions.append(
            _quiz_entry(
                f"“{target['title']}”属于哪种建筑类型？",
                target["category"],
                distractors,
                f"{target['title']}在数据中被归类为“{target['category']}”，对应记录可在详情页查看。",
            )
        )

    if scientist_rows:
        target = scientist_rows[0]
        distractors = _distinct_values(scientist_rows, "category", target["category"])
        questions.append(
            _quiz_entry(
                f"“{target['title']}”的身份是？",
                target["category"],
                distractors,
                f"{target['title']}所属记录中的身份字段为“{target['category']}”。",
            )
        )

    if treatise_rows:
        target = next((item for item in treatise_rows if item["secondary"]), treatise_rows[0])
        distractors = [item["secondary"] for item in treatise_rows if item["secondary"] and item["secondary"] != target["secondary"]]
        questions.append(
            _quiz_entry(
                f"“{target['title']}”的作者是？",
                target["secondary"],
                distractors,
                f"{target['title']}在著作数据中对应作者为“{target['secondary']}”。",
            )
        )

    if culture_rows:
        target = culture_rows[0]
        distractors = _distinct_values(culture_rows, "category", target["category"])
        questions.append(
            _quiz_entry(
                f"“{target['title']}”属于哪类文化主题？",
                target["category"],
                distractors,
                f"{target['title']}被划分到“{target['category']}”类别。",
            )
        )

    return questions


def build_overview() -> dict[str, Any]:
    records = load_records()
    dataset_counts = Counter(record["dataset"] for record in records)
    category_counts = Counter(record["category"] for record in records if record["category"])
    era_counts = Counter(record["era"] for record in records if record["era"])
    region_counts = Counter(record["region_short"] for record in records if record["region_short"])

    timeline = [
        {
            "id": record["id"],
            "title": record["title"],
            "dataset": record["dataset"],
            "dataset_label": record["dataset_label"],
            "era": record["era"],
            "year_label": record["year_label"],
            "year_sort": record["year_sort"],
            "summary": record["summary"],
        }
        for record in records
        if record["year_sort"] is not None
    ]
    timeline.sort(key=lambda item: item["year_sort"])

    filter_options = {
        "datasets": [
            {"value": key, "label": meta["label"]}
            for key, meta in DATASET_META.items()
        ],
        "categories": sorted(category_counts.keys()),
        "eras": sorted(era_counts.keys(), key=lambda value: (_parse_year(value) is None, _parse_year(value) or 0, value)),
        "regions": sorted(region_counts.keys()),
    }

    return {
        "total_records": len(records),
        "dataset_stats": [
            {
                "key": key,
                "label": DATASET_META[key]["label"],
                "full_label": DATASET_META[key]["full_label"],
                "count": dataset_counts.get(key, 0),
                "accent": DATASET_META[key]["accent"],
                "description": DATASET_META[key]["description"],
            }
            for key in DATASET_META
        ],
        "category_stats": [
            {"label": label, "count": count}
            for label, count in category_counts.most_common(12)
        ],
        "era_stats": [
            {"label": label, "count": count}
            for label, count in era_counts.most_common(12)
        ],
        "region_stats": [
            {"label": label, "count": count}
            for label, count in region_counts.most_common(12)
        ],
        "timeline": timeline[:24],
        "timeline_lanes": _build_timeline_lanes(records),
        "category_matrix": _build_category_matrix(records),
        "era_matrix": _build_era_matrix(records),
        "keyword_clusters": _build_keyword_clusters(records),
        "relation_graph": _build_relation_graph(records),
        "story_routes": _build_story_routes(),
        "quiz_questions": _build_quiz_questions(),
        "filter_options": filter_options,
        "featured": {
            key: dataset_records(key)[:4]
            for key in DATASET_META
        },
    }


def guide_answer(question: str) -> dict[str, Any]:
    cleaned = question.strip()
    if not cleaned:
        return {
            "answer": "请输入一个明确问题，例如“宋代有哪些重要建筑著作”“斗拱体现了哪些结构智慧”或“谁推动了古代都城规划的发展”。",
            "matches": [],
            "followups": [],
        }

    query = cleaned.lower()
    scored: list[tuple[int, dict[str, Any]]] = []
    for record in load_records():
        score = 0
        if cleaned in record["title"]:
            score += 5
        if cleaned in record["body"]:
            score += 4
        if cleaned in record["summary"]:
            score += 3
        if cleaned in record["category"]:
            score += 2
        if cleaned in record["era"]:
            score += 2
        if cleaned in record["region"]:
            score += 2
        for token in re.findall(r"[\u4e00-\u9fffA-Za-z0-9]+", cleaned):
            if token and token.lower() in record["search_text"]:
                score += 1
        if query and score:
            scored.append((score, record))

    scored.sort(key=lambda item: (-item[0], item[1]["year_sort"] or 999999, item[1]["title"]))
    matches = [record for _, record in scored[:3]]
    if not matches:
        return {
            "answer": "当前知识库没有找到足够贴近的结果。建议换一种问法，优先带上朝代、建筑类型、人物姓名、著作名称或文化关键词。",
            "matches": [],
            "followups": [
                "先秦到汉代有哪些重要宫殿建筑？",
                "斗拱和榫卯分别体现了什么技术特点？",
                "谁对古代城市规划影响最大？",
            ],
        }

    lead = matches[0]
    lines = [
        f"根据当前站内知识库，与你的问题最接近的内容主要集中在“{lead['dataset_label']}”板块。"
    ]

    if lead.get("summary"):
        lines.append(f"优先可从“{lead['title']}”入手：{lead['summary']}")

    overview = []
    for record in matches:
        overview.append(
            f"{record['title']}：{record['category'] or '综合'} / {record['era'] or record['year_label'] or '时代未标注'}"
        )
    lines.append("相关条目包括：" + "；".join(overview) + "。")

    dataset_labels = list(dict.fromkeys(record["dataset_label"] for record in matches if record.get("dataset_label")))
    if dataset_labels:
        lines.append("这些结果覆盖了" + "、".join(dataset_labels) + "等角度，适合继续交叉阅读。")

    followups: list[str] = []
    if lead.get("era"):
        followups.append(f"{lead['era']}还有哪些相关条目？")
    if lead.get("category"):
        followups.append(f"{lead['category']}类还有哪些代表案例？")
    if lead.get("title"):
        followups.append(f"{lead['title']}和哪些人物或著作有关？")

    return {
        "answer": "\n\n".join(lines),
        "matches": matches,
        "followups": followups[:3],
    }
