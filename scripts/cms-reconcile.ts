import { contentReconciliation, importWordPressArchive, type SourceProvider } from "../src/lib/editorial-migration";
import { hasContentDatabase, readContent } from "../src/lib/content-server";

const args = new Set(process.argv.slice(2));
const sourceArg = process.argv.find((arg) => arg.startsWith("--source="))?.split("=")[1] || "radarcharts.net";
const sourceProvider: SourceProvider = sourceArg.includes("wordpress.com") ? "legacy" : "radarcharts";
const apply = args.has("--apply");
if (apply && !args.has("--confirm-production")) throw new Error("Production writes require both --apply and --confirm-production.");

async function main() {
  const content = await readContent();
  const before = contentReconciliation(content);
  const result = await importWordPressArchive({ dryRun: !apply, updateExisting: true, sourceProvider });
  console.log(JSON.stringify({ sourceProvider, databaseConfigured: hasContentDatabase(), writesPerformed: apply, before, result }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
