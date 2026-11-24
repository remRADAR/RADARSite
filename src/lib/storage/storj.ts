/**
 * Storj adapter.
 *
 * Storj exposes an S3-compatible gateway, so this is a thin configuration
 * layer over the shared S3 transport. Nothing about Storj's protocol is
 * special-cased beyond:
 *
 *  - path-style addressing (the gateway's documented mode)
 *  - a configurable region (Storj accepts any region string; "us-east-1" is
 *    the conventional default)
 *  - an optional public base URL for delivery (a Storj "shared" / Linksharing
 *    prefix, or a CDN in front of the bucket)
 *
 * Credentials come from the environment only — see docs/storage-adapter.md.
 */

import type { StorageAdapter } from "./types";
import type { StorjStorageConfig } from "./config";
import { createS3Adapter } from "./s3";

export function createStorjAdapter(config: StorjStorageConfig): StorageAdapter {
  return createS3Adapter({
    provider: "storj",
    bucket: config.bucket,
    endpoint: config.endpoint,
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    publicBaseUrl: config.publicBaseUrl,
    // Storj's S3 gateway is addressed path-style: {endpoint}/{bucket}/{key}
    forcePathStyle: true,
  });
}
