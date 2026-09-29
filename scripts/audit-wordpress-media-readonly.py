#!/usr/bin/env python3
import hashlib, json, re, ssl, sys, time
from collections import Counter, defaultdict
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "src/data/merged-content.json"
OUT_DIR = ROOT / "reports/wordpress-media-audit-2026-09-29"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CURRENT_POSTS = "https://radarcharts.net/wp-json/wp/v2/posts?per_page=1&_fields=id,slug,link,date,title,featured_media"
CURRENT_MEDIA = "https://radarcharts.net/wp-json/wp/v2/media?per_page=1&_fields=id,date,source_url,mime_type,media_details,file"
LEGACY_POSTS = "https://public-api.wordpress.com/rest/v1.1/sites/remradar.wordpress.com/posts/?number=1&page=1&fields=ID,slug,title,content,excerpt,date,URL,featured_image,post_thumbnail"
LEGACY_MEDIA = "https://public-api.wordpress.com/rest/v1.1/sites/remradar.wordpress.com/media/?number=1&page=1"
TIMEOUT = 20


def fetch_json(url):
    started = time.time()
    req = Request(url, headers={"Accept": "application/json", "User-Agent": "RADARSite-readonly-media-audit/2026-09-29"})
    try:
        with urlopen(req, timeout=TIMEOUT, context=ssl.create_default_context()) as response:
            body = response.read(2_000_000)
            return {
                "url": url,
                "status": response.status,
                "contentType": response.headers.get("content-type", ""),
                "bytesRead": len(body),
                "elapsedMs": round((time.time() - started) * 1000),
                "headers": {k.lower(): v for k, v in response.headers.items() if k.lower() in {"x-wp-total", "x-wp-totalpages", "content-length"}},
                "json": json.loads(body),
            }
    except HTTPError as error:
        return {"url": url, "status": error.code, "errorType": "http", "error": str(error), "elapsedMs": round((time.time() - started) * 1000)}
    except (URLError, TimeoutError, ssl.SSLError, OSError) as error:
        return {"url": url, "status": None, "errorType": type(error).__name__, "error": str(error), "elapsedMs": round((time.time() - started) * 1000)}
    except Exception as error:
        return {"url": url, "status": None, "errorType": type(error).__name__, "error": str(error), "elapsedMs": round((time.time() - started) * 1000)}


def image_urls(value):
    if not isinstance(value, str):
        return []
    urls = []
    for match in re.findall(r"https?://[^\s\"'<>]+", value):
        clean = match.rstrip(")],.;'\"")
        if "wp-content" in clean or "r2.dev" in clean or "cdn." in clean:
            urls.append(clean.replace("&amp;", "&"))
    return urls


def dimensions_from_html(value):
    if not isinstance(value, str):
        return []
    result = []
    for tag in re.findall(r"<img\b[^>]*>", value, re.I):
        src = re.search(r"\bsrc=[\"']([^\"']+)", tag, re.I)
        width = re.search(r"\bwidth=[\"']?(\d+)", tag, re.I)
        height = re.search(r"\bheight=[\"']?(\d+)", tag, re.I)
        result.append({"url": src.group(1) if src else "", "width": int(width.group(1)) if width else None, "height": int(height.group(1)) if height else None})
    return result


def audit_snapshot(data):
    articles = data.get("articles", []) if isinstance(data, dict) else []
    rows = []
    url_to_articles = defaultdict(list)
    all_urls = []
    featured_urls = []
    inline_urls = []
    unusual = []
    for article in articles:
        source_url = article.get("sourceUrl") or ""
        provider = article.get("sourceProvider") or "unknown"
        featured = article.get("featuredImage") or article.get("imageUrl") or ""
        inline = image_urls(article.get("bodyHtml") or "")
        urls = list(dict.fromkeys(([featured] if featured else []) + inline))
        for url in urls:
            url_to_articles[url].append(article.get("slug") or article.get("id") or "")
            all_urls.append(url)
        if featured:
            featured_urls.append(featured)
        inline_urls.extend(inline)
        for url in urls:
            parsed = urlparse(url)
            path = parsed.path.lower()
            filename = Path(parsed.path).name
            ext = Path(filename).suffix.lower()
            if not ext or ext not in {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"}:
                unusual.append({"article": article.get("slug"), "url": url, "extension": ext or "none"})
        rows.append({"id": article.get("id"), "slug": article.get("slug"), "sourceProvider": provider, "sourceId": article.get("sourceId"), "status": article.get("status"), "sourceUrl": source_url, "featuredImage": featured, "inlineImageCount": len(inline), "imageCount": len(urls), "dimensions": dimensions_from_html(article.get("bodyHtml") or "")})
    duplicate_urls = [{"url": url, "articleCount": len(set(slugs)), "articles": sorted(set(slugs))[:20]} for url, slugs in url_to_articles.items() if len(set(slugs)) > 1]
    missing_relationships = [row for row in rows if row["imageCount"] == 0]
    hosts = Counter(urlparse(url).hostname or "" for url in all_urls)
    providers = Counter(row["sourceProvider"] for row in rows)
    statuses = Counter(row["status"] for row in rows)
    source_ids = [f"{row['sourceProvider']}:{row['sourceId']}" for row in rows if row.get("sourceId")]
    duplicate_identity_count = len(source_ids) - len(set(source_ids))
    return {
        "snapshotArticles": len(rows),
        "publishedArticles": sum(1 for row in rows if row["status"] == "published"),
        "providerCounts": dict(providers),
        "statusCounts": dict(statuses),
        "featuredImageReferences": len(featured_urls),
        "uniqueFeaturedImageUrls": len(set(featured_urls)),
        "inlineImageReferences": len(inline_urls),
        "uniqueInlineImageUrls": len(set(inline_urls)),
        "uniqueMediaUrls": len(set(all_urls)),
        "mediaReferences": len(all_urls),
        "mediaHosts": dict(hosts),
        "articlesWithoutMedia": len(missing_relationships),
        "articlesWithoutMediaSample": missing_relationships[:50],
        "duplicateMediaUrls": duplicate_urls,
        "duplicateIdentityCount": duplicate_identity_count,
        "unusualFilenameOrExtension": unusual,
        "rows": rows,
    }


def main():
    data = json.loads(SNAPSHOT.read_text())
    endpoints = {"currentPosts": fetch_json(CURRENT_POSTS), "currentMedia": fetch_json(CURRENT_MEDIA), "legacyPosts": fetch_json(LEGACY_POSTS), "legacyMedia": fetch_json(LEGACY_MEDIA)}
    snapshot = audit_snapshot(data)
    result = {
        "audit": "RADARSite WordPress media read-only audit",
        "date": "2026-09-29",
        "mutationsPerformed": False,
        "productionWrites": False,
        "tlsVerificationBypassed": False,
        "endpoints": endpoints,
        "snapshotUsage": snapshot,
        "limitations": [
            "No live endpoint pagination was performed until endpoint reachability and response shape are established.",
            "No source media bytes were downloaded during this first pass; this is a metadata/usage audit only.",
            "A current-source TLS failure is recorded as unavailable rather than bypassed.",
        ],
    }
    (OUT_DIR / "media-audit.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    (OUT_DIR / "snapshot-usage.json").write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"mutationsPerformed": False, "endpoints": {k: {x: v.get(x) for x in ("status", "errorType", "error", "headers")} for k, v in endpoints.items()}, "snapshot": {k: v for k, v in snapshot.items() if k != "rows"}}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
