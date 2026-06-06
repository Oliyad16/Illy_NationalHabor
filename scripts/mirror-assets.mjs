import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import https from "node:https";

const root = fileURLToPath(new URL("..", import.meta.url));
const indexPath = join(root, "index.html");
const sourceBackupPath = join(root, "source-capture.html");
const manifestPath = join(root, "asset-manifest.json");
const assetRoot = join(root, "assets");

const assetExts = new Set([
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".mp4",
  ".webm"
]);

function normalizeUrl(raw) {
  return raw.split("&quot")[0]
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/g, "&")
    .replace(/\\+$/g, "")
    .replace(/[),.;]+$/g, "");
}

function isAsset(url) {
  try {
    const parsed = new URL(url);
    const extension = extname(parsed.pathname).toLowerCase();

    return (
      assetExts.has(extension) ||
      parsed.pathname.includes("/dw/image/") ||
      parsed.pathname.includes("/livestory/video/") ||
      parsed.pathname.includes("/livestory/assets/")
    );
  } catch {
    return false;
  }
}

function localPathFor(url) {
  const parsed = new URL(url);
  const extension = extname(parsed.pathname) || ".asset";
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);
  const cleanPath = parsed.pathname
    .replace(/^\/+/, "")
    .replace(/[^a-zA-Z0-9._/-]/g, "_")
    .replace(/\/+/g, "/");
  const withoutExt = cleanPath.slice(0, cleanPath.length - extension.length);
  return join("assets", parsed.hostname, `${withoutExt}.${hash}${extension}`);
}

function localReferenceFor(url) {
  const parsed = new URL(url);
  return localPathFor(url) + parsed.hash;
}

function download(url, destination, redirectCount = 0) {
  if (redirectCount > 5) {
    return Promise.reject(new Error(`Too many redirects for ${url}`));
  }

  const parsed = new URL(url);
  const client = parsed.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const request = client.get(
      parsed,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 static clone asset mirror"
        }
      },
      async (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          const redirected = new URL(response.headers.location, parsed).href;
          try {
            await download(redirected, destination, redirectCount + 1);
            resolve();
          } catch (error) {
            reject(error);
          }
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        await mkdir(dirname(destination), { recursive: true });
        const file = createWriteStream(destination);
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
        file.on("error", reject);
      }
    );

    request.setTimeout(30000, () => {
      request.destroy(new Error(`Timed out downloading ${url}`));
    });
    request.on("error", reject);
  });
}

function collectUrls(text) {
  const urls = new Set();

  for (const match of text.matchAll(/(?:href|src|content|action|data-url|data-action-url|data-reject|data-accept)=["']([^"']+)["']/g)) {
    const value = normalizeUrl(match[1]);
    if (value.startsWith("http") && isAsset(value)) {
      urls.add(value);
    }
  }

  for (const match of text.matchAll(/https?:\/\/[^"'\s<>)]+/g)) {
    const url = normalizeUrl(match[0]);
    if (isAsset(url)) {
      urls.add(url);
    }
  }
  return urls;
}

function rewriteText(text, manifest) {
  let rewritten = text;
  for (const [remote, local] of Object.entries(manifest.assets)) {
    rewritten = rewritten.split(remote).join(local);
    rewritten = rewritten.split(remote.replace(/&/g, "&amp;")).join(local);
  }
  return rewritten;
}

async function main() {
  let originalHtml;

  try {
    await access(sourceBackupPath);
    originalHtml = await readFile(sourceBackupPath, "utf8");
  } catch {
    originalHtml = await readFile(indexPath, "utf8");
    await writeFile(sourceBackupPath, originalHtml);
  }

  const queue = [...collectUrls(originalHtml)];
  const seen = new Set(queue);
  const manifest = {
    source: "https://www.illy.com/en-us",
    mirroredAt: new Date().toISOString(),
    assets: {},
    failures: {}
  };

  for (let index = 0; index < queue.length; index += 1) {
    const url = queue[index];
    const local = localPathFor(url);
    const localReference = localReferenceFor(url);
    const absoluteLocal = join(root, local);
    manifest.assets[url] = localReference;

    try {
      await download(url, absoluteLocal);

      if (local.endsWith(".css")) {
        const css = await readFile(absoluteLocal, "utf8");
        const rewrittenCss = rewriteText(css, manifest);
        await writeFile(absoluteLocal, rewrittenCss);

        for (const match of css.matchAll(/url\((["']?)(.*?)\1\)/g)) {
          const raw = match[2];
          if (!raw || raw.startsWith("data:")) {
            continue;
          }

          const nested = new URL(raw, url).href;
          if (isAsset(nested) && !seen.has(nested)) {
            seen.add(nested);
            queue.push(nested);
          }
        }
      }

      console.log(`mirrored ${index + 1}/${queue.length}: ${url}`);
    } catch (error) {
      manifest.failures[url] = error.message;
      console.warn(`failed ${url}: ${error.message}`);
    }
  }

  for (const localReference of Object.values(manifest.assets)) {
    const local = localReference.split("#")[0];
    if (!local.endsWith(".css")) {
      continue;
    }

    const absoluteLocal = join(root, local);
    const css = await readFile(absoluteLocal, "utf8");
    await writeFile(absoluteLocal, rewriteText(css, manifest));
  }

  const rewrittenHtml = rewriteText(originalHtml, manifest);
  await writeFile(indexPath, rewrittenHtml);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    `Done. Mirrored ${Object.keys(manifest.assets).length} assets with ${Object.keys(manifest.failures).length} failures.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
