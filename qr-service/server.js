"use strict";

const http = require("node:http");
const QRCode = require("qrcode");

const port = 3001;
const publicOrigin = new URL(process.env.PUBLIC_ORIGIN || "https://kb.it-help.online");

const uiScript = String.raw`(() => {
  if (window.top !== window) return;
  const mount = () => {
  if (document.querySelector("[data-it-help-qr]")) return;

  const path = location.pathname + location.search;
  const qrUrl = "/__qr/code.svg?path=" + encodeURIComponent(path);
  const pageUrl = location.origin + path;
  const style = document.createElement("style");
  style.textContent = [
    ".ih-qr-button{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:2147483000;border:0;border-radius:999px;background:#1769e0;color:#fff;box-shadow:0 6px 24px #0004;padding:13px 17px;font:600 16px/1 system-ui,-apple-system,sans-serif;cursor:pointer;touch-action:manipulation}",
    ".ih-qr-dialog{width:min(92vw,390px);border:0;border-radius:20px;padding:0;box-shadow:0 18px 60px #0006;color:#172033;font-family:system-ui,-apple-system,sans-serif}",
    ".ih-qr-dialog::backdrop{background:#10182899;backdrop-filter:blur(3px)}",
    ".ih-qr-card{padding:22px;text-align:center}.ih-qr-card h2{margin:0 34px 6px;font-size:22px}.ih-qr-card p{margin:0 0 16px;color:#667085;font-size:14px}.ih-qr-card img{display:block;width:min(72vw,280px);height:auto;margin:0 auto 14px}.ih-qr-url{display:block;overflow-wrap:anywhere;color:#344054;font-size:12px;margin-bottom:16px}.ih-qr-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ih-qr-actions a,.ih-qr-actions button{border:1px solid #d0d5dd;border-radius:12px;background:#fff;color:#172033;padding:11px 8px;text-decoration:none;font:600 14px/1 system-ui,-apple-system,sans-serif;cursor:pointer}.ih-qr-close{position:absolute;top:12px;right:12px;border:0;background:transparent;font-size:28px;line-height:1;color:#667085;cursor:pointer}",
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
  dialog.innerHTML = '<div class="ih-qr-card"><button class="ih-qr-close" type="button" aria-label="Закрыть">×</button><h2>Открыть инструкцию</h2><p>Отсканируйте камерой телефона</p><img alt="QR-код этой инструкции" width="280" height="280"><span class="ih-qr-url"></span><div class="ih-qr-actions"><a download="instruction-qr.svg">Скачать QR</a><button type="button" data-copy>Скопировать ссылку</button></div></div>';
  dialog.querySelector("img").src = qrUrl;
  dialog.querySelector(".ih-qr-url").textContent = pageUrl;
  dialog.querySelector("a").href = qrUrl;
  dialog.querySelector(".ih-qr-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector("[data-copy]").addEventListener("click", async event => {
    await navigator.clipboard.writeText(pageUrl);
    event.currentTarget.textContent = "Скопировано";
  });
  button.addEventListener("click", () => dialog.showModal());
  document.body.append(dialog, button);
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
      const target = new URL(path, publicOrigin).toString();
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

server.listen(port, "0.0.0.0", () => {
  console.log(`QR service listening on :${port} for ${publicOrigin.origin}`);
});
