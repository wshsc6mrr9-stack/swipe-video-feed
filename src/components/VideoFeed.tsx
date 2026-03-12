"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";
import GenreMenu from "@/components/GenreMenu";
import MoreMenu from "@/components/MoreMenu";
import { GENRE_ALL, GENRE_LIKES, GENRE_FAVORITES, type GenreKey } from "@/lib/genres";

// ===== 日本語ジャンル → DBの実データに完全対応した究極 of GENRE_MAP =====
const GENRE_MAP: Record<string, string[]> = {
  // ---- タイプ ----
  "ギャル": ["promiscuous", "hardcore"],
  "可愛い": ["bishoujo", "beautiful-style", "idol-celebrity", "cute"],
  "クール": ["cool", "beautiful-style"],
  "セクシー": ["seductress", "sexy"],
  "清楚": ["innocent", "beautiful-style"],
  "グラマラス": ["seductress", "huge-breasts", "beautiful-style"],
  "スレンダー": ["slender"],
  "グラマー": ["big-breasts"],
  "小柄": ["petite", "mini"],
  "長身": ["tall"],
  "アスリート": ["athlete", "muscular"],
  "筋肉": ["muscular", "athlete"],
  "ぽっちゃり": ["chubby"],
  "巨乳": ["big-breasts", "huge-breasts", "big-breasts-fetish"],
  "微乳・貧乳": ["small-breasts"],
  "超乳": ["huge-breasts", "big-breasts"],
  "巨尻": ["big-butt", "butt-fetish"],
  "むっちり": ["chubby", "big-butt"],
  "大人っぽい": ["mature-mother", "seductress"],
  "お姉さん": ["oneesan"],
  "モデル系": ["beautiful-style"],
  "アジア系": [],
  "欧美系": [],
  "巨乳フェチ": ["big-breasts-fetish"],
  "尻フェチ": ["butt-fetish"],
  "パイパン": ["shaved"],
  "ミニ系": ["mini", "petite"],
  "主観": ["pov"],
  "汗だく": ["sweaty"],
  "美少女": ["bishoujo", "beautiful-style"],
  "その他（タイプ）": ["other"],
  "色白": ["fair-skin"],
  "清潔": ["innocent"],
  "美乳": ["beautiful-style", "big-breasts"],

  // ---- コスチューム ----
  "コスプレ": ["cosplay"],
  "制服": ["uniform", "student-uniform-adult"],
  "セーラー服": ["sailor-uniform"],
  "水着": ["swimsuit"],
  "競泳・スクール水着": ["school-swimsuit"],
  "ボディコン": ["bodycon"],
  "ランジェリー": ["lingerie"],
  "エプロン": ["apron", "naked-apron"],
  "裸エプロン": ["naked-apron"],
  "バニー": ["bunny"],
  "覆面・マスク": ["mask"],
  "めがね": ["glasses"],
  "パンスト・タイツ": ["pantyhose"],
  "ニーソックス": ["knee-socks"],
  "レオタード": ["leotard"],
  "和服・浴衣": ["kimono"],
  "体操着": ["gym-uniform", "bloomers"],
  "ビジネススーツ": ["business-suit", "office-mix"],
  "その他（コス）": ["other"],
  "学生服": ["student-adult", "school-adult", "student-uniform-adult"],
  "秘書": ["secretary"],
  "女装・男の娘": ["crossdress"],
  "チャイナドレス": ["china-dress"],
  "ルーズソックス": ["loose-socks"],
  "レースクィーン": ["race-queen"],
  "チアガール": ["cheerleader"],
  "ブルマ": ["bloomers"],
  "スチュワーデス": ["stewardess", "cabin-attendant"],

  // ---- ジャンル ----
  "コラボ作品": ["collab"],
  "ベスト・総集編": ["best-compilation"],
  "デビュー作品": ["debut"],
  "単体作品": ["solo"],
  "SF": ["sf"],
  "イメージビデオ": ["image-video"],
  "イメージビデオ（男性）": ["image-video"],
  "フェチ": ["fetish"],
  "脚・足フェチ": ["leg-foot-fetish"],
  "ドキュメント系": ["documentary"],
  "素人": ["amateur"],
  "企画": ["planning"],
  "その他フェチ": ["other-fetish"],
  "その他（ジャンル）": ["other"],
  "アクション": ["action"],
  "アニメ": ["anime"],
  "クラシック": ["classic"],
  "SM": ["sm", "hardcore"],
  "ギャグ・コメディ": ["gag-comedy"],
  "学園もの": ["school-adult", "student-adult"],
  "恋愛": ["romance"],
  "痴女": ["seductress", "promiscuous"],
  "淫語": ["obscene-talk", "dirty-talk"],
  "ハーレム": ["harem"],
  "童貞": ["virgin-theme"],
  "辱め": ["humiliation", "humiliation-strong"],
  "近親相姦": ["incest-taboo"],
  "イタズラ": ["prank"],
  "ドラマ": ["story-drama"],
  "寝取り・寝取られ・NTR": ["ntr"],
  "乱行": ["multiple-play", "4p", "3p"],
  "淫乱": ["promiscuous", "hardcore"],
  "淫乱・ハード系": ["hardcore", "promiscuous"],
  "レズビアン": ["lesbian"],
  "ナンパ": ["pickup"],
  "即ハメ": ["instant"],
  "不倫": ["affair"],
  "BL（ボーイズラブ）": [],
  "オタク": ["otaku"],
  "お姫様": ["princess"],
  "ギリモザ": ["giri-mosaic"],
  "コンパニオン": ["companion"],
  "セレブ": ["celebrity"],
  "盗撮・のぞき": ["voyeur"],
  "複数話": ["multiple-episodes"],
  "放置": ["hands-off", "neglect"],
  "ビッチ": ["bitch"],
  "触手": ["tentacle"],
  "時間停止": ["time-stop"],

  // ---- 職業いろいろ ----
  "アイドル・芸能人": ["idol-celebrity", "celebrity"],
  "オフィス": ["office-mix", "office"],
  "上司": ["boss"],
  "部下・同僚": ["subordinate-colleague"],
  "面接": ["interview"],
  "医者": ["hospital-clinic"],
  "看護師": ["nurse"],
  "教師": ["teacher", "teacher-adult"],
  "インストラクター": ["instructor"],
  "ウェイトレス": ["waitress"],
  "メイド": ["maid"],
  "CA・スチュワーデス": ["stewardess", "cabin-attendant"],
  "受付嬢": ["receptionist"],
  "マッサージ": ["massage", "massage-play"],
  "エステ": ["esthetic"],
  "病院・クリニック": ["hospital-clinic"],
  "ホテル": ["hotel"],
  "温泉": ["hot-spring"],
  "お風呂": ["bath"],
  "自宅": ["home"],
  "野外・屋外": ["outdoor"],
  "旅行": ["travel"],
  "デート": ["date"],
  "飲み会・合コン": ["drinking-party"],
  "近所・ご近所": [],
  "カップル": ["couple"],
  "人妻": ["married-woman", "housewife"],
  "熟女": ["milf", "mature-mother"],
  "ママ友": ["mom-friend"],
  "姉・妹": ["sisters"],
  "キャバ嬢・風俗嬢": ["hostess-service"],
  "主婦": ["housewife", "married-woman"],
  "義母": ["stepmother"],
  "女教師": ["teacher", "teacher-adult"],
  "OL・職業色々": ["office-mix", "business-suit"],
  "女子大生": ["college-student"],
  "お母さん": ["mature-mother"],
  "女子校生": ["student-adult", "school-adult"],

  // ---- プレイ ----
  "キス": ["kiss"],
  "マッサージプレイ": ["massage-play"],
  "ロールプレイ": ["cosplay"],
  "おもちゃ": ["toys", "electric-toy"],
  "コスプレプレイ": ["cosplay"],
  "3P": ["3p"],
  "複数プレイ": ["multiple-play", "4p"],
  "シャワー": ["shower", "bath"],
  "ローション": ["lotion"],
  "オイル": ["oil-play"],
  "焦らし": ["tease"],
  "言葉責め": ["obscene-talk", "dirty-talk"],
  "フェラ": ["blowjob"],
  "パイズリ": ["titjob"],
  "手コキ": ["handjob"],
  "クンニ": ["cunnilingus"],
  "オナニー": ["masturbation"],
  "シックスナイン": ["sixty-nine"],
  "アナルセックス": ["anal-sex"],
  "イマラチオ": ["iramachio"],
  "イラマチオ": ["irrumatio", "iramachio"],
  "中出し": ["creampie"],
  "顔射": ["facial"],
  "縛り・緊縛": ["bondage", "restraint"],
  "騎乗位": ["cowgirl"],
  "潮吹き": ["squirting"],
  "放尿・お漏らし": ["urination"],
  "飲尿": ["drink-urine"],
  "羞恥": ["humiliation"],
  "羞め": ["humiliation-strong"],
  "4P": ["4p"],
  "デカチン・巨根": ["big-dick"],
  "その他（プレイ）": ["other-fetish"],
  "電マ": ["electric-toy"],
  "拘束": ["restraint", "bondage"],
  "ぶっかけ": ["finish"],
  "パンチラ": ["panty-shot"],
  "胸チラ": ["boob-slip"],
  "スパンキング": ["spanking"],
  "カーセックス": ["car-sex"],
  "スカトロ": ["scat"],
  "ヨガ": ["yoga"],
  "オナサポ": ["support-masturbation"],

  // ---- その他 ----
  "VR": ["vr", "vr-only"],
  "ハイクオリティVR": ["high-quality-vr"],
  "スマホ推奨": [],
  "短尺": [],
  "4時間以上": ["over-4-hours"],
  "16時間以上": ["over-16-hours"],
  "シリーズ": ["set"],
  "セット商品": ["set"],
  "デジモ": ["digimo"],
  "独占配信": ["exclusive"],
  "AI生成作品": ["ai-generated"],
  "FANZA配信限定": ["fanza-exclusive"],
  "4K": ["4k"],
  "3D": ["3d"],
  "その他": ["other"],
  "VR専用": ["vr-only"],
  "縦動画": [],
};

type VideoItem = {
  id: string;
  title: string;
  url?: string;
  src?: string;
  poster?: string;
  srcType?: "mp4" | "hls";
  affUrl?: string;
  affLabel?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;
  genres?: string[];
  genre?: string;
  likeCount?: number;
  duration?: number;
  pageUrl?: string;
};

const EVT_LIKES = "likes_changed_v1";
const KEY_LIKED = "liked_videos_v1";
const FEED_CACHE_PREFIX = "video_feed_cache_v3";
const INITIAL_COUNT = 6;
const NORMAL_COUNT = 10;
const INITIAL_LOADING_DELAY_MS = 220;
const SCROLL_SETTLE_MS = 90;

function readLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY_LIKED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
  } catch {}
  return new Set();
}

function normalizeText(s: any) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGenreKey(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildFeedCacheKey(genres: string[], query: string) {
  const g = [...genres].map(normalizeGenreKey).sort().join("|");
  const q = normalizeText(query);
  return `${FEED_CACHE_PREFIX}:${g}::${q}`;
}

type Props = {
  initialGenre?: GenreKey;
  hideGenreMenu?: boolean;
  startId?: string;
};

export default function VideoFeed({
  initialGenre,
  hideGenreMenu,
  startId,
}: Props = {}) {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(false);
  const loadingRef = useRef(false);

  const [page, setPage] = useState(1);
  const [seed, setSeed] = useState(() =>
    typeof window !== "undefined" ? Math.floor(Math.random() * 1000000) : 0
  );
  const [hasMore, setHasMore] = useState(true);

  const [genres, setGenres] = useState<GenreKey[]>(() => {
    if (initialGenre) {
      try {
        return [decodeURIComponent(initialGenre)];
      } catch {
        return [initialGenre];
      }
    }
    return [GENRE_ALL];
  });

  const [query, setQuery] = useState("");
  const [hasWarmCache, setHasWarmCache] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startIdAppliedRef = useRef(false);
  const indexRef = useRef(index);
  const hydratedCacheKeyRef = useRef<string>("");
  const currentCacheKeyRef = useRef<string>("");
  const settleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const cacheKey = useMemo(() => {
    return buildFeedCacheKey(genres.map(String), query);
  }, [genres, query]);

  useEffect(() => {
    currentCacheKeyRef.current = cacheKey;
  }, [cacheKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydratedCacheKeyRef.current === cacheKey) return;

    hydratedCacheKeyRef.current = cacheKey;
    setHasWarmCache(false);

    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const cachedItems = Array.isArray(parsed?.items) ? parsed.items : [];
      const cachedPage = Number(parsed?.page ?? 1);
      const cachedSeed = Number(parsed?.seed ?? seed);
      const cachedHasMore =
        typeof parsed?.hasMore === "boolean" ? parsed.hasMore : true;

      if (cachedItems.length === 0) return;

      setItems(
        cachedItems.filter((v: any) => v && typeof v.id === "string")
      );
      setPage(Math.max(1, cachedPage));
      setSeed(Number.isFinite(cachedSeed) ? cachedSeed : seed);
      setHasMore(cachedHasMore);
      setHasWarmCache(true);
    } catch {}
  }, [cacheKey, seed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (items.length === 0) return;
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          items,
          page,
          seed,
          hasMore,
          savedAt: Date.now(),
        })
      );
    } catch {}
  }, [cacheKey, items, page, seed, hasMore]);

  useEffect(() => {
    if (!(items.length === 0 && loading && !hasWarmCache)) {
      setShowInitialLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowInitialLoading(true);
    }, INITIAL_LOADING_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [items.length, loading, hasWarmCache]);

  const loadMoreVideos = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      const activeGenres = genres.filter(Boolean);
      const isFavMode = activeGenres.includes(GENRE_FAVORITES);

      if (isFavMode) {
        const likedSet = readLikedSet();
        if (likedSet.size === 0) {
          setItems([]);
          setHasMore(false);
          loadingRef.current = false;
          setLoading(false);
          return;
        }
        params.set("ids", Array.from(likedSet).join(","));
      } else {
        const apiGenres = activeGenres.flatMap((g) => {
          if (g === GENRE_FAVORITES || g === GENRE_LIKES) return [g];
          return GENRE_MAP[g] || [];
        });

        if (apiGenres.length > 0) {
          params.set("genres", apiGenres.join(","));
        }

        params.set("page", String(page));
        params.set("seed", String(seed));
      }

      params.set(
        "count",
        String(page === 1 && items.length === 0 ? INITIAL_COUNT : NORMAL_COUNT)
      );

      if (query) params.set("query", query);
      params.set("_t", Date.now().toString());

      const res = await fetch(`/api/feed?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const list = (Array.isArray(json) ? json : json?.items ?? []) as any[];

      if (!list || list.length === 0) {
        setHasMore(false);
        loadingRef.current = false;
        setLoading(false);
        return;
      }

      const normalized: VideoItem[] = list
        .map((v) => ({
          id: String(v.id ?? ""),
          title: String(v.title ?? ""),
          url: v.url ?? v.src,
          src: v.src ?? v.url,
          poster: v.poster,
          srcType: v.srcType,
          affUrl: v.affUrl ?? v.affiliateUrl,
          affLabel: v.affLabel ?? v.affiliateLabel,
          affiliateUrl: v.affiliateUrl ?? v.affUrl,
          affiliateLabel: v.affiliateLabel ?? v.affLabel,
          genres: Array.isArray(v.genres) ? v.genres : undefined,
          genre: typeof v.genre === "string" ? v.genre : undefined,
          likeCount: Number(v.likeCount ?? 0),
          duration: Number(v.duration ?? 0) || undefined,
          pageUrl: typeof v.pageUrl === "string" ? v.pageUrl : undefined,
        }))
        .filter((v) => !!v.id);

      setItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...normalized.filter((n) => !existingIds.has(n.id))];
      });

      setPage((p) => p + 1);
    } catch (e) {
      console.error("Load Error:", e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [genres, hasMore, page, query, seed, items.length]);

  const viewItems = useMemo(() => {
    if (genres.includes(GENRE_FAVORITES)) {
      const likedSet = readLikedSet();
      return items.filter((v) => likedSet.has(v.id));
    }

    if (genres.includes(GENRE_ALL)) return items;

    let base = items;

    if (genres.length === 1 && genres[0] === GENRE_LIKES) {
      base = items
        .slice()
        .sort((a, b) => Number(b.likeCount ?? 0) - Number(a.likeCount ?? 0));
    } else {
      const wantList = genres.flatMap((g) => GENRE_MAP[g] || []);
      if (wantList.length > 0) {
        base = items.filter((v) => {
          const tags = [
            ...(Array.isArray(v.genres) ? v.genres : []),
            v.genre,
          ]
            .filter(Boolean)
            .map(String);

          return tags.some((t) => {
            const lowerT = t.toLowerCase();
            const parts = lowerT.split(/[-_\s]/);
            return wantList.some((w) => {
              const lowerW = w.toLowerCase();
              return lowerT === lowerW || parts.includes(lowerW);
            });
          });
        });
      }
    }

    const q = normalizeText(query);
    if (!q) return base;

    return base.filter((v) => {
      const title = normalizeText(v.title);
      const id = normalizeText(v.id);
      return title.includes(q) || id.includes(q);
    });
  }, [items, genres, query]);

  useEffect(() => {
    if (!hasMore) return;

    if (items.length === 0) {
      loadMoreVideos();
      return;
    }

    const remainingViews = viewItems.length - index;
    if (remainingViews <= 5) {
      loadMoreVideos();
    }
  }, [hasMore, index, items.length, loadMoreVideos, viewItems.length]);

  useEffect(() => {
    if (!initialGenre) return;

    let g = initialGenre;
    try {
      g = decodeURIComponent(initialGenre);
    } catch {}

    setGenres([g]);
    setItems([]);
    setIndex(0);
    setPage(1);
    setSeed(Math.floor(Math.random() * 1000000));
    setHasMore(true);
    setHasWarmCache(false);
    startIdAppliedRef.current = false;
    hydratedCacheKeyRef.current = "";

    const el = containerRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "auto" });
  }, [initialGenre]);

  useEffect(() => {
    const on = (ev: Event) => {
      const e = ev as CustomEvent<{ videoId: string; count: number }>;
      if (!e?.detail) return;

      setItems((prev) =>
        prev.map((v) =>
          v.id === e.detail.videoId
            ? { ...v, likeCount: Number(e.detail.count) }
            : v
        )
      );
    };

    window.addEventListener(EVT_LIKES, on as any);
    return () => window.removeEventListener(EVT_LIKES, on as any);
  }, []);

  useEffect(() => {
    if (!startId || startIdAppliedRef.current || viewItems.length === 0) return;

    const found = viewItems.findIndex((v) => v.id === startId);
    if (found < 0) return;

    const el = containerRef.current;
    if (!el) return;

    startIdAppliedRef.current = true;
    setIndex(found);

    requestAnimationFrame(() => {
      const pageHeight = el.clientHeight || window.innerHeight || 1;
      el.scrollTo({
        top: found * pageHeight,
        behavior: "auto",
      });
    });
  }, [startId, viewItems]);

  const handleResetFeed = useCallback((nextGenres?: GenreKey[], nextQuery?: string) => {
    const resolvedGenres = nextGenres ?? [GENRE_ALL];

    setGenres(resolvedGenres);
    if (typeof nextQuery === "string") setQuery(nextQuery);
    setItems([]);
    setIndex(0);
    setPage(1);
    setSeed(Math.floor(Math.random() * 1000000));
    setHasMore(true);
    setHasWarmCache(false);
    startIdAppliedRef.current = false;
    hydratedCacheKeyRef.current = "";

    const el = containerRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resolveNearestIndex = () => {
      const pageHeight = el.clientHeight || window.innerHeight || 1;
      const raw = el.scrollTop / pageHeight;
      const nearest = Math.round(raw);
      const clamped = Math.max(0, Math.min(nearest, Math.max(0, viewItems.length - 1)));

      if (indexRef.current !== clamped) {
        setIndex(clamped);
      }
    };

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        resolveNearestIndex();
        ticking = false;
      });

      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
      }

      settleTimerRef.current = window.setTimeout(() => {
        resolveNearestIndex();
      }, SCROLL_SETTLE_MS);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [viewItems.length]);

  const SAFE_PAD = 12;
  const safeTop = `calc(env(safe-area-inset-top) + ${SAFE_PAD}px)`;
  const safeLeft = `calc(env(safe-area-inset-left) + ${SAFE_PAD}px)`;
  const safeRight = `calc(env(safe-area-inset-right) + ${SAFE_PAD}px)`;

  const isInitialLoading = items.length === 0 && loading && !hasWarmCache && showInitialLoading;
  const isNoResults = !loading && !hasMore && items.length > 0 && viewItems.length === 0;

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{ height: "100svh" }}
    >
      {isInitialLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "black",
            color: "rgba(255,255,255,0.8)",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 20 }}>
            動画を読み込み中...
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.8,
              lineHeight: 2,
              textAlign: "center",
            }}
          >
            <div>⬆︎ 上にスワイプで次の動画</div>
            <div>ダブルタップで5秒スキップ</div>
          </div>
        </div>
      )}

      {isNoResults && (
        <div className="absolute inset-0 z-[9000] flex flex-col items-center justify-center bg-black text-white p-6 text-center pointer-events-auto">
          <p className="text-base font-bold mb-6 leading-relaxed">
            現在、このジャンルの
            <br />
            動画はありません 😢
          </p>
          <button
            onClick={() => handleResetFeed([GENRE_ALL])}
            style={{
              padding: "12px 24px",
              background: "white",
              color: "black",
              borderRadius: "30px",
              fontWeight: "bold",
              border: "none",
            }}
          >
            すべての動画を見る
          </button>
        </div>
      )}

      {!hideGenreMenu && (
        <div
          className="absolute z-40"
          data-no-swipe="1"
          style={{ top: safeTop, left: safeLeft }}
        >
          <GenreMenu
            value={genres}
            onChange={(v) => handleResetFeed(v)}
            query={query}
            onChangeQuery={(s) => handleResetFeed(genres, s)}
          />
        </div>
      )}

      <div
        className="absolute z-40"
        data-no-swipe="1"
        style={{ top: `calc(${safeTop} - 8px)`, right: safeRight }}
      >
        <MoreMenu />
      </div>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          background: "#000",
        }}
      >
        {viewItems.map((item, absIndex) => {
          const distance = Math.abs(absIndex - index);
          const shouldRenderPlayer = distance <= 1;

          return (
            <section
              key={`${item.id}:${absIndex}`}
              style={{
                position: "relative",
                width: "100%",
                height: "100svh",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                background: "#000",
                overflow: "hidden",
              }}
            >
              {shouldRenderPlayer ? (
                <VideoCard
                  video={item}
                  isActive={absIndex === index}
                  isNeighbor={distance === 1}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#000",
                  }}
                />
              )}
            </section>
          );
        })}

        {loading && items.length > 0 && (
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.55)",
              background: "#000",
              fontSize: 12,
            }}
          >
            読み込み中...
          </div>
        )}
      </div>
    </div>
  );
}