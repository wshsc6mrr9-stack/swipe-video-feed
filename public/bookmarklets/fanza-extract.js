(() => {
  try {
    const ADMIN = "https://swipe-video-feed.vercel.app/admin";

    const pageUrl = location.href;

    const meta = (sel) => (document.querySelector(sel)?.getAttribute("content") || "").trim();
    const text = (sel) => (document.querySelector(sel)?.textContent || "").trim();

    const title =
      text("h1") ||
      meta('meta[property="og:title"]') ||
      meta('meta[name="twitter:title"]') ||
      document.title.trim();

    // #タグ抽出
    let genres = [...document.querySelectorAll("a")]
      .map((a) => (a.textContent || "").trim())
      .filter((t) => t.startsWith("#") || t.startsWith("＃"))
      .map((t) => t.replace(/^#+/, "").replace(/^＃+/, "").trim())
      .filter(Boolean);

    genres = Array.from(new Set(genres)).slice(0, 12);

    // 動画URL（取れるときだけ）
    let videoUrl = "";
    const v = document.querySelector("video");
    if (v) {
      videoUrl = (v.getAttribute("src") || "").trim();
      if (!videoUrl) {
        const s = document.querySelector("video source");
        if (s) videoUrl = (s.getAttribute("src") || "").trim();
      }
    }
    if (!videoUrl) {
      videoUrl =
        meta('meta[property="og:video"]') ||
        meta('meta[property="og:video:url"]') ||
        meta('meta[name="twitter:player:stream"]') ||
        "";
    }

    const data = {
      source: location.hostname,
      pageUrl,
      title,
      genres,
      videoUrl,
      affUrl: pageUrl,
    };

    const enc = encodeURIComponent(JSON.stringify(data));
    const url = `${ADMIN}#import=${enc}`;

    alert(
      `抽出OK\nタイトル: ${title}\nジャンル数: ${genres.length}\nvideoUrl: ${
        videoUrl ? "あり" : "空"
      }\n\nAdminを開くで`
    );

    // 新規タブがブロックされる場合は同タブ遷移
    const w = window.open(url, "_blank");
    if (!w) location.href = url;
  } catch (e) {
    alert("bookmarklet error: " + e);
  }
})();
