# Object storage adapter (R2 + Storj)

`src/lib/storage/` is a provider-agnostic object storage layer. Callers ask for
"the storage adapter" and get whichever backend the environment selects — no
caller branches on the provider.

```ts
import { getStorageAdapter } from "@/lib/storage";

const storage = await getStorageAdapter();
await storage.put("site-assets/x.webp", bytes, { contentType: "image/webp" });
const url = storage.publicUrl("site-assets/x.webp");
```

## Interface

Every backend implements `StorageAdapter` (`src/lib/storage/types.ts`):

| Method | Purpose |
| --- | --- |
| `check()` | Cheap reachability probe; throws when the bucket is unusable |
| `put(key, body, options)` | Upload; supports `ifMatch` / `ifNoneMatch` conditional writes |
| `get(key)` | Download; returns `null` when absent |
| `head(key)` | Metadata only; returns `null` when absent |
| `delete(key)` | Remove an object |
| `list({ prefix, limit, cursor })` | Paginated listing |
| `publicUrl(key)` | Delivery URL, or `undefined` when no public base URL is set |

`publicUrl` never invents a URL: with no public base URL configured it returns
`undefined` rather than guessing an endpoint path.

## Provider selection

The provider is chosen by `STORAGE_PROVIDER`:

| `STORAGE_PROVIDER` | Backend |
| --- | --- |
| unset, or `r2` | Cloudflare R2 — **the default, and current production behaviour** |
| `storj` | Storj S3-compatible gateway |

An unrecognised value throws rather than silently falling back, so a typo
cannot quietly point production at the wrong bucket.

**R2 remains the default.** An environment with no `STORAGE_PROVIDER` set
behaves exactly as it did before this adapter existed, including the native
`RADARSITE_MEDIA` Workers binding path.

## Environment variables

### R2 (default — unchanged)

| Variable | Required | Notes |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | yes | 32-char hex Cloudflare account ID |
| `R2_BUCKET` | yes | `radarsite-media` in production |
| `R2_ACCESS_KEY_ID` | yes | Server-only |
| `R2_SECRET_ACCESS_KEY` | yes | Server-only |
| `R2_ENDPOINT` | no | Defaults to `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | no | Public delivery origin, e.g. `https://cdn.radarcharts.net` |

### Storj

| Variable | Required | Notes |
| --- | --- | --- |
| `STORAGE_PROVIDER` | yes | Must be `storj` to activate this backend |
| `STORJ_ENDPOINT` | yes | S3 gateway, e.g. `https://gateway.storjshare.io` |
| `STORJ_BUCKET` | yes | Target bucket name |
| `STORJ_ACCESS_KEY_ID` | yes | Server-only |
| `STORJ_SECRET_ACCESS_KEY` | yes | Server-only |
| `STORJ_REGION` | no | Defaults to `us-east-1` |
| `STORJ_PUBLIC_BASE_URL` | no | Public delivery prefix (Linksharing / CDN). Without it `publicUrl()` returns `undefined` |

No credentials are hardcoded anywhere in the adapter. Every value is read from
the environment at call time.

## Runtime notes

- **Cloudflare Worker:** the R2 backend prefers the native `RADARSITE_MEDIA`
  binding when the runtime provides one, and falls back to the R2 S3 API
  otherwise. Storj always uses the S3 API.
- **S3 client:** `@aws-sdk/client-s3` is fetch-based and works in the Workers
  runtime; no Node sockets are required.
- **Addressing:** R2 uses virtual-hosted-style (`forcePathStyle: false`);
  Storj uses path-style (`forcePathStyle: true`), which is its documented mode.
- **Caching:** the adapter is cached per provider for the process lifetime. A
  failed construction is not cached, so one bad config cannot poison later
  requests. `resetStorageAdapter()` clears the cache (used by tests).

## Diagnostics

`storageDiagnostics()` returns a non-throwing description of the active
configuration. It never includes secret values — only booleans such as
`credentialsPresent` and `endpointFormatValid`.

## Tests

```bash
npx tsx scripts/storage-adapter-contract-test.ts
```

Covers: R2 default with no `STORAGE_PROVIDER`, explicit `r2` parity, Storj
selection, Storj independence from R2 variables, region defaulting, unknown
provider rejection, named missing-variable errors, secret non-leakage in
diagnostics, public URL joining, and interface completeness.

The test is static — it does not contact a real bucket. Live verification
requires real Storj credentials.
