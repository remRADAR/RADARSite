export type EditorialAuthorInput = Record<string, unknown>;

export type EditorialAuthorProfile = {
  byline: string;
  name: string;
  schemaType: "Organization" | "Person";
  profilePath: string;
  jobTitle?: string;
  affiliation?: string;
};

export const EDITORIAL_AUTHOR_PROFILES = {
  editorialTeam: {
    byline: "Editorial Team, REM",
    name: "Editorial Team, REM",
    schemaType: "Organization",
    profilePath: "/ontheradar/articles",
  },
  founder: {
    byline: "CZA OF REM, Founder",
    name: "CZA OF REM",
    schemaType: "Person",
    profilePath: "/remradar",
    jobTitle: "Founder",
    affiliation: "Adhoc web team for remRADAR",
  },
} satisfies Record<string, EditorialAuthorProfile>;

export function isNewsletterEditorial(record: EditorialAuthorInput): boolean {
  const values: unknown[] = [
    record.slug,
    record.title,
    record.metaTitle,
    record.editorialType,
    ...(Array.isArray(record.categories) ? record.categories : []),
    ...(Array.isArray(record.tags) ? record.tags : []),
  ];

  return values.some((value) => typeof value === "string" && /\bnewsletters?\b/i.test(value));
}

export function editorialAuthorProfile(record: EditorialAuthorInput): EditorialAuthorProfile {
  return isNewsletterEditorial(record)
    ? EDITORIAL_AUTHOR_PROFILES.founder
    : EDITORIAL_AUTHOR_PROFILES.editorialTeam;
}
