import type { RadarSpotifyPlaylist } from "@/types/radar-playlists";

// The official RADARCharts Spotify playlists are the only chart sources.
// Track contents and order always come from Spotify synchronisation; these
// seeds carry only identity, display copy, and display order — never tracks.
export const RADAR_DEFAULT_PLAYLISTS: ReadonlyArray<Pick<RadarSpotifyPlaylist, "id" | "spotifyPlaylistId" | "spotifyUrl" | "title" | "description" | "visible" | "featured" | "sortOrder" | "ownerName">> = [
  {
    id: "top-10-radar",
    sortOrder: 0,
    spotifyPlaylistId: "2JQ5ULxBNkpEvGZLyxC9OC",
    spotifyUrl: "https://open.spotify.com/playlist/2JQ5ULxBNkpEvGZLyxC9OC",
    title: "TOP 10 RADAR",
    description: "The ten records currently moving the RADAR signal, in official Spotify order.",
    visible: true,
    featured: false,
    ownerName: "remRADAR",
  },
  {
    id: "top-100-abuja",
    sortOrder: 1,
    spotifyPlaylistId: "3QLLaIStWTq6I5ulyvc0FW",
    spotifyUrl: "https://open.spotify.com/playlist/3QLLaIStWTq6I5ulyvc0FW",
    title: "TOP 100 ABUJA",
    description: "The city chart. One hundred records counted out of Abuja, from the airwaves to the clubs and the streets, with grillhype.",
    visible: true,
    featured: true,
    ownerName: "remRADAR with grillhype",
  },
  {
    id: "the-great-wall-abuja",
    sortOrder: 2,
    spotifyPlaylistId: "6glXNqgtoTT73dKQuE7YbU",
    spotifyUrl: "https://open.spotify.com/playlist/6glXNqgtoTT73dKQuE7YbU",
    title: "THE GREAT WALL ABUJA",
    description: "The wall of sound from the capital — records holding the line, in official Spotify order.",
    visible: true,
    featured: false,
    ownerName: "remRADAR",
  },
];

// Fallback atmosphere per playlist. Used only when the playlist artwork has
// not been synchronised yet (or cannot be read on-device); once artwork is
// available the dashboard derives its palette from the artwork itself.
export const RADAR_DEFAULT_ATMOSPHERES: Record<string, { hue: number; accent: string }> = {
  "top-10-radar": { hue: 96, accent: "#b7ff00" },
  "top-100-abuja": { hue: 32, accent: "#ffb700" },
  "the-great-wall-abuja": { hue: 300, accent: "#c77dff" },
};
