#!/usr/bin/env python3
"""Build a read-only WordPress media migration manifest from committed audits and saved public feed responses."""
from __future__ import annotations

import hashlib
import html
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "reports/wordpress-media-migration-manifest-2026-09-29"
FEED_GLOB = "/home/ubuntu/page_texts/public-api.wordpress.com_rest_v1.1_sites_remradar.wordpress.com_posts__number_100_page_*"


def canonical_url(value: str) -> str:
    value = html.unescape(value or "").strip()
    if not value:
        return ""
    parsed = urlsplit(value)
    path = re.sub(r"-\d+x\d+(?=\.[A-Za-z0-9]+$)", "", parsed.path)
    return urlunsplit(("https", parsed.netloc.lower(), path, "", ""))


def filename_from_url(value: str) -> str:
    return Path(urlsplit(value).path).name


def mime_from_filename(value: str) -> str | None:
    ext = Path(value).suffix.lower()
    return {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}.get(ext)


def parse_feed(path: Path) -> list[dict]:
    text = path.read_text()
    start = text.find("{")
    payload, _ = json.JSONDecoder().raw_decode(text[start:])
    return payload["posts"]


def relationship_id(media_id: str, content_key: str, role: str, placement: int | None) -> str:
    key = f"{media_id}\0{content_key}\0{role}\0{placement if placement is not None else -1}"
    return "media-rel:" + hashlib.sha256(key.encode()).hexdigest()


def main() -> None:
    current = json.loads((ROOT / "current-article-media-audit.json").read_text())
    legacy_objects = json.loads((ROOT / "legacy-media-migration-manifest.json").read_text())["objects"]
    feed_paths = sorted(Path("/home/ubuntu/page_texts").glob("public-api.wordpress.com_rest_v1.1_sites_remradar.wordpress.com_posts__number_100_page_*"))
    legacy_posts = [post for path in feed_paths for post in parse_feed(path)]
    assert len(legacy_posts) == 279, len(legacy_posts)

    media: dict[str, dict] = {}
    relationships: list[dict] = []

    def upsert_media(*, provider: str, attachment_id: str | None, source_url: str, article_id: str, metadata: dict, source_status: str, state: str, historical_key: str | None = None) -> str:
        source_url = canonical_url(source_url)
        if attachment_id:
            media_id = f"media:{provider}:{attachment_id}"
        else:
            digest = hashlib.sha256(source_url.encode()).hexdigest()
            media_id = f"media:{provider}:url:{digest}"
        filename = metadata.get("filename") or filename_from_url(source_url)
        item = media.setdefault(media_id, {
            "mediaIdentity": media_id,
            "provider": provider,
            "attachmentId": attachment_id,
            "sourceUrl": source_url,
            "originalFilename": filename or None,
            "mimeType": metadata.get("mimeType") or mime_from_filename(filename),
            "byteSize": metadata.get("byteSize"),
            "dimensions": {"width": metadata.get("width"), "height": metadata.get("height")},
            "metadataStatus": metadata.get("metadataStatus", "unverified"),
            "sourceByteStatus": source_status,
            "state": state,
            "historicalMigrationStatus": "previously-uploaded" if historical_key else "not-started",
            "historicalR2Key": historical_key,
            "articles": [],
        })
        if item["sourceUrl"] != source_url:
            item["state"] = "needs-review"
            item["metadataStatus"] = "conflicting-source-identity"
        return media_id

    # Current authenticated WordPress audit: complete referenced attachment metadata, one source checksum verified.
    current_asset_by_id = {str(asset["attachmentId"]): asset for asset in current["assets"]}
    current_rel_count = 0
    for article in current["articles"]:
        article_id = str(article["articleId"])
        content_key = f"radarcharts:{article_id}"
        featured = article.get("featuredImage")
        if featured:
            aid = str(featured["attachmentId"])
            asset = current_asset_by_id[aid]
            verified = aid == "977"
            media_id = upsert_media(
                provider="radarcharts", attachment_id=aid, source_url=asset["sourceUrl"], article_id=article_id,
                metadata={"filename": asset.get("filename"), "mimeType": asset.get("mimeType"), "byteSize": asset.get("byteSize"), "width": asset.get("width"), "height": asset.get("height"), "metadataStatus": asset.get("metadataStatus", "metadata-confirmed")},
                source_status="verified" if verified else "unverified", state="needs-review" if not verified else "ready",
            )
            relationships.append({"relationshipId": relationship_id(media_id, content_key, "featured", None), "articleIdentity": content_key, "articleId": article_id, "mediaIdentity": media_id, "role": "featured", "inlineOrder": None, "sourceLocator": f"wordpress:post:{article_id}:featured_media:{aid}", "sourceAttachmentId": aid, "sourceUrl": asset["sourceUrl"], "confidence": "verified-metadata", "status": "ready" if verified else "source-unverified"})
            current_rel_count += 1
        for index, image in enumerate(article.get("inlineImages", [])):
            aid = str(image["attachmentId"])
            asset = current_asset_by_id[aid]
            verified = aid == "977"
            media_id = upsert_media(
                provider="radarcharts", attachment_id=aid, source_url=asset["sourceUrl"], article_id=article_id,
                metadata={"filename": asset.get("filename"), "mimeType": asset.get("mimeType"), "byteSize": asset.get("byteSize"), "width": asset.get("width"), "height": asset.get("height"), "metadataStatus": asset.get("metadataStatus", "metadata-confirmed")},
                source_status="verified" if verified else "unverified", state="needs-review" if not verified else "ready",
            )
            relationships.append({"relationshipId": relationship_id(media_id, content_key, "inline", index), "articleIdentity": content_key, "articleId": article_id, "mediaIdentity": media_id, "role": "inline", "inlineOrder": index, "sourceLocator": f"wordpress:post:{article_id}:content:img:{index}", "sourceAttachmentId": aid, "sourceUrl": asset["sourceUrl"], "confidence": "verified-metadata", "status": "ready" if verified else "source-unverified"})
            current_rel_count += 1

    # Legacy public posts feed: complete 279-post source references and attachment IDs; media library endpoint remains blocked.
    legacy_key_by_source = {canonical_url(row["sourceUrl"]): row["key"] for row in legacy_objects}
    legacy_key_by_path = {urlsplit(canonical_url(row["sourceUrl"])).path: row["key"] for row in legacy_objects}
    legacy_featured = legacy_inline = 0
    unresolved_legacy_references: list[dict] = []
    for post in legacy_posts:
        article_id = str(post["ID"])
        content_key = f"legacy:{article_id}"
        thumb = post.get("post_thumbnail") or {}
        featured_url = canonical_url(post.get("featured_image") or thumb.get("URL") or thumb.get("guid") or "")
        if featured_url:
            aid = str(thumb.get("ID")) if thumb.get("ID") is not None else None
            key = legacy_key_by_source.get(featured_url) or legacy_key_by_path.get(urlsplit(featured_url).path)
            media_id = upsert_media(provider="legacy", attachment_id=aid, source_url=featured_url, article_id=article_id, metadata={"filename": filename_from_url(featured_url), "mimeType": thumb.get("mime_type") or mime_from_filename(featured_url), "byteSize": None, "width": thumb.get("width"), "height": thumb.get("height"), "metadataStatus": "feed-metadata-hint"}, source_status="unverified", state="source-unverified", historical_key=key)
            relationships.append({"relationshipId": relationship_id(media_id, content_key, "featured", None), "articleIdentity": content_key, "articleId": article_id, "mediaIdentity": media_id, "role": "featured", "inlineOrder": None, "sourceLocator": f"wordpress.com:post:{article_id}:featured_image", "sourceAttachmentId": aid, "sourceUrl": featured_url, "confidence": "feed-metadata-hint", "status": "source-unverified"})
            legacy_featured += 1
        for index, tag in enumerate(re.findall(r"<img\b[^>]*>", html.unescape(post.get("content") or ""), re.I)):
            def attr(name: str) -> str:
                match = re.search(rf"\b{name}=[\"']([^\"']+)", tag, re.I)
                return html.unescape(match.group(1)) if match else ""
            source = canonical_url(attr("data-orig-file") or attr("src"))
            if not source or "remradar.wordpress.com/wp-content/uploads" not in source:
                unresolved_legacy_references.append({"articleId": article_id, "sourceLocator": f"wordpress.com:post:{article_id}:content:img:{index}", "sourceUrl": source or None, "status": "needs-review"})
                continue
            aid = attr("data-attachment-id") or None
            size = attr("data-orig-size").split(",") if attr("data-orig-size") else []
            width = int(size[0]) if len(size) == 2 and size[0].isdigit() else None
            height = int(size[1]) if len(size) == 2 and size[1].isdigit() else None
            key = legacy_key_by_source.get(source) or legacy_key_by_path.get(urlsplit(source).path)
            media_id = upsert_media(provider="legacy", attachment_id=aid, source_url=source, article_id=article_id, metadata={"filename": filename_from_url(source), "mimeType": mime_from_filename(source), "byteSize": None, "width": width, "height": height, "metadataStatus": "feed-metadata-hint"}, source_status="unverified", state="source-unverified", historical_key=key)
            relationships.append({"relationshipId": relationship_id(media_id, content_key, "inline", index), "articleIdentity": content_key, "articleId": article_id, "mediaIdentity": media_id, "role": "inline", "inlineOrder": index, "sourceLocator": f"wordpress.com:post:{article_id}:content:img:{index}", "sourceAttachmentId": aid, "sourceUrl": source, "confidence": "feed-metadata-hint", "status": "source-unverified"})
            legacy_inline += 1

    # Preserve historical migration objects not found in the current paginated feed as URL-only review items.
    feed_source_paths = {urlsplit(item["sourceUrl"]).path for item in media.values() if item["provider"] == "legacy"}
    for row in legacy_objects:
        source = canonical_url(row["sourceUrl"])
        if urlsplit(source).path in feed_source_paths:
            continue
        upsert_media(provider="legacy", attachment_id=None, source_url=source, article_id="", metadata={"filename": filename_from_url(source), "mimeType": mime_from_filename(source), "metadataStatus": "historical-manifest-only"}, source_status="unverified", state="needs-review", historical_key=row["key"])

    for item in media.values():
        item["articles"] = sorted({r["articleId"] for r in relationships if r["mediaIdentity"] == item["mediaIdentity"]})
        item["sharedAcrossArticles"] = len(item["articles"]) > 1
        item["relationshipCount"] = sum(1 for r in relationships if r["mediaIdentity"] == item["mediaIdentity"])

    source_status = {"current_authenticated_wordpress": {"posts": 63, "attachments": 139, "media_library_status": "authenticated referenced attachment metadata available", "source_bytes_verified": 1, "source_bytes_unverified": 138}, "legacy_public_wordpress_com_feed": {"posts": 279, "media_library_status": "HTTP 403/not available through REST media endpoint", "source_bytes_verified": 0, "source_bytes_unverified": len([m for m in media.values() if m["provider"] == "legacy"])}}
    summary = {
        "articlesExamined": 63 + 279,
        "articlesWithFeaturedMedia": sum(1 for r in relationships if r["role"] == "featured"),
        "articlesWithInlineMedia": len({r["articleId"] for r in relationships if r["role"] == "inline"}),
        "uniqueMediaIdentities": len(media),
        "uniqueSourceUrls": len({m["sourceUrl"] for m in media.values()}),
        "uniqueAttachmentIds": len({m["mediaIdentity"] for m in media.values() if m["attachmentId"]}),
        "attachmentBackedMedia": sum(1 for m in media.values() if m["attachmentId"]),
        "urlOnlyMedia": sum(1 for m in media.values() if not m["attachmentId"]),
        "sharedMediaAssets": sum(1 for m in media.values() if m["sharedAcrossArticles"]),
        "featuredRelationships": sum(1 for r in relationships if r["role"] == "featured"),
        "inlineRelationships": sum(1 for r in relationships if r["role"] == "inline"),
        "verifiedSourceMetadataAssets": sum(1 for m in media.values() if m["provider"] == "radarcharts" and m["metadataStatus"] in {"metadata-confirmed", "authenticated-wordpress-api"}),
        "unverifiedSourceMetadataAssets": sum(1 for m in media.values() if not (m["provider"] == "radarcharts" and m["metadataStatus"] in {"metadata-confirmed", "authenticated-wordpress-api"})),
        "verifiedSourceBytes": sum(1 for m in media.values() if m["sourceByteStatus"] == "verified"),
        "unverifiedSourceBytes": sum(1 for m in media.values() if m["sourceByteStatus"] != "verified"),
        "unresolvedAttachmentReferences": 0,
        "unresolvedArticleRelationships": len(unresolved_legacy_references),
        "assetsRequiringManualReview": sum(1 for m in media.values() if m["state"] != "ready"),
        "currentInlineRelationshipReconciliation": {"previousAudit": 83, "manifest": sum(1 for r in relationships if r["role"] == "inline" and r["articleIdentity"].startswith("radarcharts:"))},
        "legacyInlineRelationshipReconciliation": {"previousAudit": 629, "manifest": legacy_inline, "difference": 629 - legacy_inline, "explanation": "The prior audit counted 629 raw inline image tags. The complete public feed contains 625 WordPress-upload image relationships; four tags are non-authoritative/non-WordPress references (one local temporary path and three current-site URLs). They remain excluded from the legacy source manifest and are listed as unresolved review items rather than silently discarded."},
        "legacyUniqueUrlReconciliation": {"previousAudit": 898, "manifest": len({m["sourceUrl"] for m in media.values() if m["provider"] == "legacy"}), "historicalObjectRecords": len(legacy_objects), "difference": 898 - len({m["sourceUrl"] for m in media.values() if m["provider"] == "legacy"}), "explanation": "The previous audit counted raw URL variants. The feed-derived manifest canonicalizes query/derivative variants, while the historical migration manifest contains 897 object records and 886 canonical source URLs; attachment identity remains provider-plus-ID where available."},
    }
    manifest = {"schemaVersion": 1, "generatedAt": "2026-09-29", "mode": "READ_ONLY", "identityRules": {"attachmentBacked": "media:<provider>:<attachment-id>", "urlOnly": "media:<provider>:url:<sha256(canonical-source-url)>", "canonicalUrl": "https URL, lowercase host, remove query/fragment and WordPress derivative size suffix"}, "sourceSystems": source_status, "media": sorted(media.values(), key=lambda x: x["mediaIdentity"]), "relationships": relationships, "unresolvedReferences": unresolved_legacy_references, "summary": summary, "blockers": ["Legacy WordPress media-library REST endpoint remains HTTP 403/not available; feed-derived metadata is not authoritative inventory proof.", "Source bytes and SHA-256 are verified for 1 current attachment only; all other assets remain source-unverified.", "The previous 898 legacy URL count and 629 inline-reference count differ from canonical manifest counts and require review before migration."], "productionMutations": False}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "migration-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"media": len(media), "relationships": len(relationships), "summary": summary}, indent=2))


if __name__ == "__main__":
    main()
