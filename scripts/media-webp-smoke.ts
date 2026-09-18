import { createWebpDerivatives } from "../src/lib/media-storage";

async function main() {
  const source = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#101010"/><circle cx="600" cy="400" r="240" fill="#f2c14e"/></svg>`);
  const result = await createWebpDerivatives({ source, keyPrefix: "site-assets/smoke", width: 1200, quality: 82 });
  console.log(JSON.stringify({ sourceMimeType: result.sourceMimeType, sourceWidth: result.sourceWidth, sourceHeight: result.sourceHeight, derivatives: result.derivatives.map((item) => ({ key: item.key, contentType: item.contentType, width: item.width, height: item.height, bytes: item.body.byteLength })) }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
