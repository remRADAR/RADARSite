export type PlaylistGalleryItem = {
  src: string;
  label: string;
  category: "curated" | "editorial" | "legacy-code-plus";
};

export const playlistGalleryItems: PlaylistGalleryItem[] = [
  { src: "/images/radarmusic/playlists/curated-1.webp", label: "Curated Playlist 01", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-2.webp", label: "Curated Playlist 02", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-3.webp", label: "Curated Playlist 03", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-4.webp", label: "Curated Playlist 04", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-5.webp", label: "Curated Playlist 05", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-6.webp", label: "Curated Playlist 06", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-7.webp", label: "Curated Playlist 07", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-8.webp", label: "Curated Playlist 08", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-9.webp", label: "Curated Playlist 09", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-10.webp", label: "Curated Playlist 10", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-11.webp", label: "Curated Playlist 11", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-12.webp", label: "Curated Playlist 12", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-13.webp", label: "Curated Playlist 13", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-14.webp", label: "Curated Playlist 14", category: "curated" },
  { src: "/images/radarmusic/playlists/curated-15.webp", label: "Curated Playlist 15", category: "curated" },
  { src: "/images/radarmusic/playlists/editorial-1.webp", label: "Editorial Playlist 01", category: "editorial" },
  { src: "/images/radarmusic/playlists/editorial-2.webp", label: "Editorial Playlist 02", category: "editorial" },
  { src: "/images/radarmusic/playlists/editorial-4.webp", label: "Editorial Playlist 04", category: "editorial" },
  { src: "/images/radarmusic/playlists/editorial-5.webp", label: "Editorial Playlist 05", category: "editorial" },
  { src: "/images/radarmusic/playlists/editorial-8.webp", label: "Editorial Playlist 08", category: "editorial" },
  ...Array.from({ length: 24 }, (_, index) => index + 1).filter((index) => ![13, 14, 22].includes(index)).flatMap((index) => {
    const suffix = String(index);
    return [
      { src: `/images/radarmusic/playlists/legacy-code-plus-${suffix}.webp`, label: `Legacy Code+ Playlist ${suffix}`, category: "legacy-code-plus" as const },
      ...(index === 19 || index === 20 ? [{ src: `/images/radarmusic/playlists/legacy-code-plus-${suffix}-2.webp`, label: `Legacy Code+ Playlist ${suffix} / 02`, category: "legacy-code-plus" as const }] : []),
    ];
  }),
  { src: "/images/radarmusic/playlists/legacy-code-plus--2.webp", label: "Legacy Code+ Playlist / 02", category: "legacy-code-plus" },
];
