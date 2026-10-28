export default function sharpUnavailable() {
  throw new Error("Sharp image processing is unavailable in the Cloudflare Worker runtime; use the media batch processor for derivatives.");
}
