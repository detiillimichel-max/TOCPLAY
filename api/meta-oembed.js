const META_OEMBED_ENDPOINT = "https://graph.facebook.com/v26.0/oembed_video";
const CACHE_CONTROL = "public, s-maxage=600, stale-while-revalidate=1200";

function jsonError(res, status, code, message) {
  return res.status(status).json({ ok: false, error: code, message });
}

function validateFacebookUrl(value) {
  if (typeof value !== "string" || value.length > 2000) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const isFacebookHost = host === "facebook.com" || host.endsWith(".facebook.com");
    const isVideoPath =
      url.pathname.startsWith("/share/v/") ||
      url.pathname.startsWith("/share/r/") ||
      url.pathname.startsWith("/reel/") ||
      url.pathname.startsWith("/watch/") ||
      url.pathname.startsWith("/videos/");

    if (url.protocol !== "https:" || !isFacebookHost || !isVideoPath) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", CACHE_CONTROL);
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return jsonError(res, 405, "METHOD_NOT_ALLOWED", "Use uma solicitação GET.");
  }

  const facebookUrl = validateFacebookUrl(req.query.url);
  if (!facebookUrl) {
    return jsonError(
      res,
      400,
      "INVALID_FACEBOOK_URL",
      "Informe uma URL HTTPS válida de um Reel ou vídeo do Facebook."
    );
  }

  const params = new URLSearchParams({
    url: facebookUrl,
    useiframe: "true",
    omitscript: "true",
    maxwidth: "500"
  });
  const endpoint = META_OEMBED_ENDPOINT + "?" + params.toString();

  try {
    const upstream = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000)
    });

    const payload = await upstream.json().catch(() => null);

    if (!upstream.ok || !payload || payload.type !== "video" || !payload.html) {
      const metaError = payload && payload.error
        ? {
            type: payload.error.type || null,
            code: payload.error.code || null,
            message: payload.error.message || null
          }
        : null;

      // Meta's generic HTTP 500 / OAuthException code 1 is inconclusive:
      // do not label the video private or permanently reject it.
      const transientMetaError =
        upstream.status >= 500 ||
        (metaError && Number(metaError.code) === 1);

      return res.status(transientMetaError ? 503 : 502).json({
        ok: false,
        error: transientMetaError ? "META_TEMPORARY_ERROR" : "META_OEMBED_REJECTED",
        retryable: Boolean(transientMetaError),
        message: transientMetaError
          ? "A Meta retornou um erro temporário ou inconclusivo. Não é possível concluir que o vídeo seja privado; tente validar novamente mais tarde."
          : "A Meta não aceitou a incorporação deste vídeo. Ele só deve ser excluído definitivamente após uma validação conclusiva.",
        metaStatus: upstream.status,
        metaError
      });
    }

    return res.status(200).json({
      ok: true,
      source: "Facebook",
      provider_name: payload.provider_name || "Facebook",
      provider_url: payload.provider_url || "https://www.facebook.com",
      type: payload.type,
      version: payload.version || "1.0",
      width: payload.width || null,
      height: payload.height || null,
      title: payload.title || null,
      author_name: payload.author_name || null,
      author_url: payload.author_url || null,
      html: payload.html,
      original_url: facebookUrl
    });
  } catch (error) {
    const timedOut = error && error.name === "TimeoutError";
    return jsonError(
      res,
      502,
      timedOut ? "META_TIMEOUT" : "META_UNAVAILABLE",
      timedOut
        ? "A Meta demorou demais para responder. Tente novamente."
        : "Não foi possível consultar a API oEmbed da Meta agora."
    );
  }
};
