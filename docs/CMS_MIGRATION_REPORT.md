# RADARSite CMS Migration Report

## Status

The RADARSite migration foundation is implemented and passes lint, TypeScript, and production-build validation. The live archive write was **not executed in this sandbox** because the repository environment does not contain `DATABASE_URL` or `STUDIO_ADMIN_PASSWORD`; no claim is made that production content has already been imported.

The live WordPress.com public API was verified independently and reports **279 posts**. The endpoint named in the original brief (`remradar.wordpress.com/wp-json/wp/v2/posts`) currently returns an HTML 404, so the importer uses the supported public WordPress.com REST endpoint instead:

`https://public-api.wordpress.com/rest/v1.1/sites/remradar.wordpress.com/posts/`

## Implemented

The existing `studio_content` architecture remains the source of truth. It now supports source identity, source URL, publication metadata, editorial type, SEO fields, long rich bodies, migration warnings, and a 20 MB content payload budget. No second CMS or unrelated content architecture was introduced.

The importer paginates through the complete WordPress archive, preserves IDs, source URLs, slugs, dates, titles, excerpts, HTML content, taxonomy labels, featured images, and author information. It is idempotent: source ID, source URL, or slug is used to update an existing record instead of creating a duplicate. It supports read-only dry runs and update/import runs.

Imported HTML passes through an allow-list normalizer. Scripts, event handlers, unsafe URLs, arbitrary attributes, and unapproved iframe hosts are removed. Supported editorial elements include headings, paragraphs, emphasis, lists, links, blockquotes, figures, images, captions, separators, and responsive iframes for approved providers such as YouTube, YouTube no-cookie, Spotify, and SoundCloud.

Public detail pages now use the same controlled rich renderer for migrated content and future content. Images remain responsive and embeds use a bounded aspect-ratio container to prevent horizontal overflow on mobile and iOS Safari.

The admin route now includes a migration control panel with **Dry run / reconcile** and **Import + update archive** actions. Both actions require the existing Studio session. The import endpoint is `/api/studio/migrate`.

## Verification

| Check | Result |
|---|---|
| WordPress archive discovery | 279 posts reported by live public API |
| Sample source fields | Verified title, slug, date, source URL, categories, tags, featured image, and HTML body |
| ESLint | Passed |
| TypeScript (`npx tsc --noEmit`) | Passed |
| Next.js production build | Passed; `/api/studio/migrate` included |
| Database import | Not run; required production environment variables are absent |
| Browser/device QA | Not run in this sandbox session |

## HOW TO PUBLISH A NEW RADAR ARTICLE

1. Open RADARSite and go to `/admin`, then authenticate in the existing RADAR Studio controls.
2. Use the editorial Studio area to create a new content record. Choose `article`, `interview`, `spotlight`, or `magazine` as appropriate.
3. Enter the headline in the title field and add the subtitle or excerpt used for listings and metadata.
4. Add the featured image URL or select the uploaded media asset supported by the deployment environment. Keep the original image URL when migrating historical content.
5. Write the article in the editorial body field. Rich content may include headings, paragraphs, bold and italic text, links, quotes, lists, images with captions, separators, and approved Spotify, YouTube, YouTube no-cookie, or SoundCloud embeds.
6. Choose categories and add tags. Select the editorial type rather than encoding it in the title.
7. Set the publication date, slug, SEO title, SEO description, and canonical URL where needed.
8. Save with status `draft`. Draft records are excluded from public listings.
9. Preview the draft using the same rich renderer used by the public article page. Check the title, image, body, links, embeds, and mobile layout.
10. Change status to `published` and save. The article appears in the relevant RADAR editorial listing and opens at `/ontheradar/articles/<slug>`; future type-specific routes can use the same stored editorial type.
11. To edit a published article, open the record in Studio, update the fields, and save again. To remove it from the primary public listing without deleting history, set status to `archived`.

The editorial team should not need WordPress, GitHub, code, or a database for normal future publishing. Production setup must first provide the existing shared database and Studio admin secret, then an administrator should run the dry run, review its counts and warnings, and only then run the import.
