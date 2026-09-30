import type { CmsRecord } from "@/lib/content-server";
import { deriveEditorialTaxonomy, type EditorialType, type MagazineSubtype } from "@/lib/cms-taxonomy";

export const EDITORIAL_ARCHIVE_PAGE_SIZE = 10;

type PublishedRecord = CmsRecord & { slug: string };

function timestamp(record: CmsRecord) {
  const value = record.publishedAt || record.date || "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCurrentRadarImport(record: CmsRecord) {
  const sourceUrl = typeof record.sourceUrl === "string" ? record.sourceUrl : "";
  const sourceProvider = typeof record.sourceProvider === "string" ? record.sourceProvider : "";
  try {
    return /(^|\.)radarcharts\.net$/i.test(new URL(sourceUrl || "https://invalid.local").hostname) || /radarcharts/i.test(sourceProvider);
  } catch {
    return /radarcharts/i.test(sourceProvider);
  }
}

export function sortEditorialRecords<T extends PublishedRecord>(records: T[]) {
  return [...records].sort((a, b) => {
    const currentGroup = Number(isCurrentRadarImport(b)) - Number(isCurrentRadarImport(a));
    return currentGroup || timestamp(b) - timestamp(a) || a.slug.localeCompare(b.slug);
  });
}

export function canonicalEditorialRecords<T extends PublishedRecord>(records: T[], type?: EditorialType) {
  return sortEditorialRecords(records.filter((record) => {
    if (record.status === "draft" || record.status === "archived") return false;
    const taxonomy = deriveEditorialTaxonomy(record);
    return taxonomy.editorialType !== "" && (!type || taxonomy.editorialType === type);
  }));
}

export function recordsForEditorialType<T extends PublishedRecord>(records: T[], type: EditorialType) {
  return canonicalEditorialRecords(records, type);
}

export function recordsForProject<T extends PublishedRecord>(records: T[], project = "Motherland") {
  return sortEditorialRecords(records.filter((record) => {
    if (record.status === "draft" || record.status === "archived") return false;
    const taxonomy = deriveEditorialTaxonomy(record);
    return taxonomy.projectSection === project || record.categories?.some((category) => new RegExp(`^${project}$`, "i").test(category)) || record.tags?.some((tag) => new RegExp(`^${project}$`, "i").test(tag));
  }));
}

export function recordsForMagazineSubtype<T extends PublishedRecord>(records: T[], subtype: MagazineSubtype) {
  return recordsForEditorialType(records, "Magazine").filter((record) => deriveEditorialTaxonomy(record).magazineSubtype === subtype);
}

export function paginateRecords<T>(records: T[], page: number, pageSize = EDITORIAL_ARCHIVE_PAGE_SIZE) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(records.length / safePageSize));
  const currentPage = Math.min(Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1), pageCount);
  return { items: records.slice((currentPage - 1) * safePageSize, currentPage * safePageSize), page: currentPage, pageSize: safePageSize, total: records.length, pageCount };
}

export function parseArchivePage(value: string | undefined) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
