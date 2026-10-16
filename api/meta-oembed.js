const META_OEMBED_ENDPOINT = "https://graph.facebook.com/v26.0/oembed_video";
const CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=1200";

function jsonError(res, status, code, message, extra = {}) {
  return res.status(status).json({ ok: false, error: code, message, ...extra });
}

function parseFacebookUrl(value) {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !(host === "facebook.com" || host.endsWith(".facebook.com"))) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function isShareUrl(url) {
  return url.pathname.startsWith("/share/v/") || url.pathname.startsWith("/share/r/");
}

function isCanonicalVideoUrl(url) {
  return url.pathname.startsWith("/reel/") ||
    url.pathname.startsWith("/watch/") ||
    url.pathname.startsWith("/videos/") ||
    url.pathname.includes("/videos/") ||
    url.pathname === "/video.php";
}

// Do not try to resolve share links server-side: Facebook may return a login
// page with client-side navigation rather than an HTTP redirect.
function resolveFacebookUrl(inputUrl) {
  const parsed = parseFacebookUrl(inputUrl);
  if (!parsed || isShareUrl(parsed)) return null;
  return isCanonicalVideoUrl(parsed) ? parsed.toString() : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", CACHE_CONTROL);
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return jsonError(res, 405, "METHOD_NOT_ALLOWED", "Use uma solicitação GET.");
  }

  const original = parseFacebookUrl(req.query.url);
  if (!original || !(isShareUrl(original) || isCanonicalVideoUrl(original))) {
    return jsonError(res, 400, "INVALID_FACEBOOK_URL", "Informe uma URL canônica de Reel ou vídeo do Facebook.");
  }

  if (isShareUrl(original)) {
    return jsonError(
      res,
      400,
      "SHARE_URL_NOT_EMBEDDABLE",
      "O link /share/ não é aceito para incorporação. Abra o Reel no Facebook e copie a URL canônica que começa com /reel/ ou /watch/.",
      { original_url: original.toString() }
    );
  }

  const canonicalUrl = resolveFacebookUrl(original.toString());
  if (!canonicalUrl) {
    return jsonError(res, 400, "INVALID_CANONICAL_URL", "Informe a URL canônica de um vídeo do Facebook.");
  }

  try {
    const params = new URLSearchParams({
      url: canonicalUrl,
      useiframe: "true",
      omitscript: "true",
      maxwidth: "500"
    });
    // Optional Meta app access token stored only in Vercel environment variables.
    if (process.env.FB_APP_TOKEN) params.set("access_token", process.env.FB_APP_TOKEN);

    const upstream = await fetch(META_OEMBED_ENDPOINT + "?" + params.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });
    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok || !payload || payload.type !== "video" || !payload.html) {
      const metaError = payload && payload.error ? {
        type: payload.error.type || null,
        code: payload.error.code || null,
        message: payload.error.message || null
      } : null;
      const temporary = upstream.status >= 500 || (metaError && Number(metaError.code) === 1);
      return res.status(temporary ? 503 : 502).json({
        ok: false,
        error: temporary ? "META_TEMPORARY_ERROR" : "META_OEMBED_REJECTED",
        retryable: Boolean(temporary),
        message: temporary
          ? "A Meta retornou um erro temporário ou inconclusivo; isso não prova que o vídeo seja privado."
          : "A Meta não confirmou a incorporação deste vídeo. Mantenha disponível a opção de abrir o original.",
        metaStatus: upstream.status,
        metaError,
        original_url: original.toString(),
        embed_url: canonicalUrl
      });
    }

    // Always return an iframe URL from Facebook's official video plugin.
    const iframeSrc = "https://www.facebook.com/plugins/video.php?href=" +
      encodeURIComponent(canonicalUrl) + "&show_text=false&width=500";
    const html = '<iframe src="' + iframeSrc +
      '" width="500" height="700" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" title="Vídeo do Facebook"></iframe>';

    return res.status(200).json({
      ok: true,
      source: "Facebook",
      provider_name: payload.provider_name || "Facebook",
      type: "video",
      html,
      original_url: original.toString(),
      embed_url: canonicalUrl
    });
  } catch (error) {
    const timedOut = error && error.name === "TimeoutError";
    return jsonError(res, 502, timedOut ? "META_TIMEOUT" : "META_UNAVAILABLE",
      timedOut ? "A Meta demorou demais para responder. Tente novamente." : "Não foi possível consultar a API oEmbed da Meta agora.");
  }
};
