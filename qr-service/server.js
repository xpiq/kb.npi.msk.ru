"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const pathModule = require("node:path");
const QRCode = require("qrcode");

const port = 3001;
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN || "https://kb.it-help.online");
const publicUpstream = new URL(process.env.PUBLIC_UPSTREAM || "http://outline:3000");
const editorOrigin = new URL(process.env.EDITOR_ORIGIN || "https://wiki.npi.msk.ru");
const linkCreationHosts = new Set([editorOrigin.hostname, publicOrigin.hostname]);
const registryPath = process.env.LINK_REGISTRY_PATH || "/data/links.json";
const documentCodePattern = /^[A-Za-z0-9]{10}$/;
const publicCodePattern = /^kb[0-9]{9}$/;
let registry = { version: 1, documents: {}, codes: {} };

async function loadRegistry() {
  await fs.mkdir(pathModule.dirname(registryPath), { recursive: true });
  try {
    const parsed = JSON.parse(await fs.readFile(registryPath, "utf8"));
    if (
      parsed.version !== 1 ||
      typeof parsed.documents !== "object" ||
      typeof parsed.codes !== "object"
    ) {
      throw new Error("Unsupported link registry format");
    }
    registry = parsed;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await persistRegistry();
  }
}

async function persistRegistry() {
  const temporaryPath = `${registryPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporaryPath, registryPath);
}

const registryReady = loadRegistry();
let registryMutation = Promise.resolve();

function getOrCreatePublicCode(documentCode) {
  const operation = registryMutation.then(async () => {
    await registryReady;
    if (registry.documents[documentCode]) return registry.documents[documentCode];

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const publicCode = `kb${String(crypto.randomInt(1, 1_000_000_000)).padStart(9, "0")}`;
      if (registry.codes[publicCode]) continue;
      registry.documents[documentCode] = publicCode;
      registry.codes[publicCode] = documentCode;
      await persistRegistry();
      return publicCode;
    }
    throw new Error("Unable to allocate a unique public instruction code");
  });
  registryMutation = operation.catch(() => {});
  return operation;
}

function canonicalPathFromHtml(html, documentCode) {
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  const canonicalTag = linkTags.find(tag => /\brel=["']canonical["']/i.test(tag));
  const href = canonicalTag?.match(/\bhref=["']([^"']+)["']/i)?.[1];
  if (!href) return null;

  const target = new URL(href, publicOrigin);
  const documentSlug = target.pathname.match(/^\/doc\/([^/]+)\/?$/)?.[1];
  if (
    target.origin !== publicOrigin.origin ||
    (documentSlug !== documentCode && !documentSlug?.endsWith(`-${documentCode}`))
  ) {
    return null;
  }
  return target.pathname;
}

async function getPublicDocumentPath(documentCode) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const request = http.request(new URL(`/doc/${documentCode}`, publicUpstream), {
      method: "GET",
      headers: {
        Host: publicOrigin.host,
        "X-Forwarded-Proto": publicOrigin.protocol.slice(0, -1),
      },
    }, response => {
      if (response.statusCode !== 200) {
        response.resume();
        finish(null);
        return;
      }

      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => {
        if (settled) return;
        body += chunk;
        const canonicalPath = canonicalPathFromHtml(body, documentCode);
        if (canonicalPath) {
          finish(canonicalPath);
        } else if (body.length > 128 * 1024) {
          finish(null);
        }
      });
      response.on("end", () => finish(canonicalPathFromHtml(body, documentCode)));
      response.on("error", fail);
    });
    request.setTimeout(5000, () => request.destroy(new Error("Public document check timed out")));
    request.on("error", fail);
    request.end();
  });
}

async function isPublicDocument(documentCode) {
  return Boolean(await getPublicDocumentPath(documentCode));
}

const uiScript = String.raw`(() => {
  if (window.top !== window) return;
  const publicOrigin = "${publicOrigin.origin}";
  const editorOrigin = "${editorOrigin.origin}";
  const documentCodePattern = /\/doc\/(?:[^/]*-)?([A-Za-z0-9]{10})(?:\/)?$/;

  const getDocumentCode = () => {
    const match = location.pathname.match(documentCodePattern);
    return match ? match[1] : null;
  };

  const mount = () => {
  if (document.querySelector("[data-it-help-qr]")) return;

  const style = document.createElement("style");
  style.textContent = [
    ".ih-qr-button{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:2147483000;border:0;border-radius:999px;background:#1769e0;color:#fff;box-shadow:0 6px 24px #0004;padding:13px 17px;font:600 16px/1 system-ui,-apple-system,sans-serif;cursor:pointer;touch-action:manipulation}",
    ".ih-qr-button[hidden]{display:none}",
    ".ih-qr-dialog{width:min(92vw,390px);border:0;border-radius:20px;padding:0;box-shadow:0 18px 60px #0006;color:#172033;font-family:system-ui,-apple-system,sans-serif}",
    ".ih-qr-dialog::backdrop{background:#10182899;backdrop-filter:blur(3px)}",
    ".ih-qr-card{padding:22px;text-align:center}.ih-qr-card h2{margin:0 34px 6px;font-size:22px}.ih-qr-card p{margin:0 0 16px;color:#667085;font-size:14px}.ih-qr-card img{display:block;width:min(72vw,280px);height:auto;margin:0 auto 12px}.ih-qr-code{display:block;color:#1769e0;font:700 14px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace;margin-bottom:7px}.ih-qr-url{display:block;overflow-wrap:anywhere;color:#344054;font-size:12px;margin-bottom:16px}.ih-qr-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ih-qr-actions a,.ih-qr-actions button{border:1px solid #d0d5dd;border-radius:12px;background:#fff;color:#172033;padding:11px 8px;text-decoration:none;font:600 14px/1 system-ui,-apple-system,sans-serif;cursor:pointer}.ih-qr-close{position:absolute;top:12px;right:12px;border:0;background:transparent;font-size:28px;line-height:1;color:#667085;cursor:pointer}",
    "@media print{.ih-qr-button{display:none!important}.ih-qr-dialog{box-shadow:none}}",
  ].join("");
  document.head.append(style);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ih-qr-button";
  button.dataset.itHelpQr = "";
  button.setAttribute("aria-label", "Показать QR-код этой инструкции");
  button.textContent = "QR";

  const dialog = document.createElement("dialog");
  dialog.className = "ih-qr-dialog";
  dialog.innerHTML = '<div class="ih-qr-card"><button class="ih-qr-close" type="button" aria-label="Закрыть">×</button><h2>Открыть инструкцию</h2><p class="ih-qr-status">Отсканируйте камерой телефона</p><img alt="QR-код этой инструкции" width="280" height="280"><span class="ih-qr-code"></span><span class="ih-qr-url"></span><div class="ih-qr-actions"><a>Скачать QR</a><button type="button" data-copy>Скопировать ссылку</button></div></div>';
  dialog.querySelector(".ih-qr-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector("[data-copy]").addEventListener("click", async event => {
    const pageUrl = dialog.dataset.pageUrl;
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      event.currentTarget.textContent = "Скопировано";
    } catch (error) {
      event.currentTarget.textContent = "Не удалось скопировать";
    }
  });
  button.addEventListener("click", async () => {
    const documentCode = getDocumentCode();
    if (!documentCode) return;
    const image = dialog.querySelector("img");
    const status = dialog.querySelector(".ih-qr-status");
    const actions = dialog.querySelector(".ih-qr-actions");
    image.hidden = true;
    actions.hidden = true;
    dialog.querySelector(".ih-qr-code").textContent = "";
    dialog.querySelector(".ih-qr-url").textContent = "";
    status.textContent = "Создаём постоянный код…";
    dialog.showModal();

    try {
      const response = await fetch("/__qr/link?document=" + encodeURIComponent(documentCode), {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      let instruction;
      let scope = "public";
      if (!response.ok) {
        if (response.status === 403) {
          const path = "/doc/" + documentCode;
          instruction = { path, url: editorOrigin + path };
          scope = "editor";
        } else {
          throw new Error("Link service returned " + response.status);
        }
      } else {
        instruction = await response.json();
      }
      const qrUrl = location.origin + "/__qr/code.svg?scope=" + scope + "&path=" + encodeURIComponent(instruction.path);
      image.src = qrUrl;
      image.hidden = false;
      status.textContent = scope === "public"
        ? "Анонимная ссылка на публичную инструкцию"
        : "Внутренняя ссылка — потребуется вход";
      dialog.querySelector(".ih-qr-code").textContent = scope === "public"
        ? "Код: " + instruction.code
        : "Внутренняя инструкция";
      dialog.querySelector(".ih-qr-url").textContent = instruction.url;
      dialog.dataset.pageUrl = instruction.url;
      actions.hidden = false;
      const download = dialog.querySelector("a");
      download.href = qrUrl;
      download.download = scope === "public"
        ? "instruction-" + instruction.code + "-qr.svg"
        : "internal-instruction-" + documentCode + "-qr.svg";
      dialog.querySelector("[data-copy]").textContent = "Скопировать ссылку";
    } catch (error) {
      console.error(error);
      status.textContent = "Не удалось создать постоянный код";
    }
  });
  document.body.append(dialog, button);

  const updateVisibility = () => { button.hidden = !getDocumentCode(); };
  updateVisibility();
  window.addEventListener("popstate", updateVisibility);
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function(...args) { originalPushState.apply(this, args); updateVisibility(); };
  history.replaceState = function(...args) { originalReplaceState.apply(this, args); updateVisibility(); };
  };
  setTimeout(mount, 1200);
})();`;

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "public, max-age=300",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(body);
}

function isValidPath(path) {
  return path.startsWith("/") && !path.startsWith("//") && path.length <= 2048;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, "text/plain; charset=utf-8", "ok\n", { "Cache-Control": "no-store" });
    }
    if (req.method === "GET" && url.pathname === "/ui.js") {
      return send(res, 200, "application/javascript; charset=utf-8", uiScript);
    }
    if (req.method === "POST" && url.pathname === "/link") {
      if (!linkCreationHosts.has((req.headers.host || "").split(":")[0])) {
        return send(res, 403, "application/json; charset=utf-8", '{"error":"Forbidden"}\n', { "Cache-Control": "no-store" });
      }
      const documentCode = url.searchParams.get("document") || "";
      if (!documentCodePattern.test(documentCode)) {
        return send(res, 400, "application/json; charset=utf-8", '{"error":"Invalid document code"}\n', { "Cache-Control": "no-store" });
      }
      if (!(await isPublicDocument(documentCode))) {
        return send(res, 403, "application/json; charset=utf-8", '{"error":"Document is not public"}\n', { "Cache-Control": "no-store" });
      }
      const code = await getOrCreatePublicCode(documentCode);
      const path = `/${code}`;
      return send(res, 200, "application/json; charset=utf-8", `${JSON.stringify({ code, path, url: new URL(path, publicOrigin).toString() })}\n`, { "Cache-Control": "no-store" });
    }
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/resolve") {
      await registryReady;
      const code = url.searchParams.get("code") || "";
      if (!publicCodePattern.test(code) || !registry.codes[code]) {
        return send(res, 404, "text/plain; charset=utf-8", "Instruction not found\n", { "Cache-Control": "no-store" });
      }
      const documentCode = registry.codes[code];
      const canonicalPath = await getPublicDocumentPath(documentCode);
      if (!canonicalPath) {
        return send(res, 404, "text/plain; charset=utf-8", "Instruction not found\n", { "Cache-Control": "no-store" });
      }
      return send(res, 302, "text/plain; charset=utf-8", "Redirecting\n", {
        "Cache-Control": "no-store",
        Location: canonicalPath,
      });
    }
    if (req.method === "GET" && url.pathname === "/view") {
      const path = url.searchParams.get("path") || "/";
      if (!isValidPath(path)) {
        return send(res, 400, "text/plain; charset=utf-8", "Invalid path\n");
      }
      const target = new URL(path, publicOrigin).toString();
      const encodedPath = encodeURIComponent(path);
      const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>QR-код инструкции</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f4f7fb;color:#172033;font-family:system-ui,-apple-system,sans-serif}.card{box-sizing:border-box;width:min(92vw,420px);padding:24px;border-radius:22px;background:#fff;text-align:center;box-shadow:0 16px 54px #15213a26}.card h1{margin:0 0 6px;font-size:24px}.card p{margin:0 0 18px;color:#667085}.card img{display:block;width:min(76vw,320px);height:auto;margin:0 auto 14px}.url{display:block;margin-bottom:18px;overflow-wrap:anywhere;color:#475467;font-size:12px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.actions a{padding:12px 8px;border:1px solid #d0d5dd;border-radius:12px;color:#172033;text-decoration:none;font-weight:650}.actions a:first-child{border-color:#1769e0;background:#1769e0;color:#fff}@media(prefers-color-scheme:dark){body{background:#111827}.card{background:#1f2937;color:#f9fafb}.card p,.url{color:#cbd5e1}.actions a{color:#f9fafb}}</style></head><body><main class="card"><h1>QR-код инструкции</h1><p>Отсканируйте камерой телефона</p><img src="/code.svg?path=${encodedPath}" alt="QR-код инструкции" width="320" height="320"><span class="url">${escapeHtml(target)}</span><div class="actions"><a href="/code.svg?path=${encodedPath}" download="instruction-qr.svg">Скачать SVG</a><a href="${escapeHtml(path)}">К инструкции</a></div></main></body></html>`;
      return send(res, 200, "text/html; charset=utf-8", html, { "Cache-Control": "no-store" });
    }
    if (req.method === "GET" && url.pathname === "/code.svg") {
      const path = url.searchParams.get("path") || "/";
      if (!isValidPath(path)) {
        return send(res, 400, "text/plain; charset=utf-8", "Invalid path\n");
      }
      const targetOrigin = url.searchParams.get("scope") === "editor" ? editorOrigin : publicOrigin;
      const target = new URL(path, targetOrigin).toString();
      const svg = await QRCode.toString(target, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 2,
        width: 512,
      });
      return send(res, 200, "image/svg+xml; charset=utf-8", svg);
    }
    return send(res, 404, "text/plain; charset=utf-8", "Not found\n", { "Cache-Control": "no-store" });
  } catch (error) {
    console.error(error);
    return send(res, 500, "text/plain; charset=utf-8", "Internal error\n", { "Cache-Control": "no-store" });
  }
});

registryReady
  .then(() => server.listen(port, "0.0.0.0", () => {
    console.log(`QR service listening on :${port} for ${publicOrigin.origin}`);
  }))
  .catch(error => {
    console.error("Unable to load link registry", error);
    process.exit(1);
  });
