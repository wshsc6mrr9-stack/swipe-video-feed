"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";
import GenreMenu from "@/components/GenreMenu";
import MoreMenu from "@/components/MoreMenu";
import { GENRE_ALL, GENRE_LIKES, GENRE_FAVORITES, type GenreKey } from "@/lib/genres";

// ===== 日本語ジャンル → Redisタグ変換（完全網羅版） =====
const GENRE_MAP: Record<string, string[]> = {
  // ---- タイプ ----
  "ギャル": ["gal"],
  "可愛い": ["cute", "idol-celebrity"],
  "クール": ["cool"],
  "セクシー": ["sexy"],
  "清楚": ["innocent"],
  "グラマラス": ["glamorous"],
  "スレンダー": ["slender"],
  "グラマー": ["glamour"],
  "小柄": ["petite", "small"],
  "長身": ["tall"],
  "アスリート": ["athlete"],
  "筋肉": ["muscle"],
  "ぽっちゃり": ["chubby", "plump"],
  "巨乳": ["big-breasts", "huge-breasts"],
  "微乳・貧乳": ["small-breasts", "flat-chested"],
  "超乳": ["huge-breasts"],
  "巨尻": ["big-ass"],
  "むっちり": ["thick", "plump"],
  "大人っぽい": ["mature"],
  "お姉さん": ["older-sister", "mature"],
  "モデル系": ["model"],
  "アジア系": ["asian"],
  "欧美系": ["western"],
  "巨乳フェチ": ["big-breasts-fetish"],
  "尻フェチ": ["ass-fetish"],
  "パイパン": ["shaved"],
  "ミニ系": ["mini"],
  "主観": ["pov"],
  "汗だく": ["sweaty"],
  "美少女": ["bishoujo", "beautiful-girl"],
  "色白": ["fair-skin"],
  "美乳": ["beautiful-breasts"],

  // ---- コスチューム ----
  "コスプレ": ["cosplay"],
  "制服": ["uniform", "student-uniform-adult"],
  "セーラー服": ["sailor-suit"],
  "水着": ["swimsuit"],
  "競泳・スクール水着": ["school-swimsuit"],
  "ボディコン": ["bodycon"],
  "ランジェリー": ["lingerie"],
  "エプロン": ["apron"],
  "裸エプロン": ["naked-apron"],
  "バニー": ["bunny", "bunny-girl"],
  "覆面・マスク": ["mask"],
  "めがね": ["glasses"],
  "パンスト・タイツ": ["pantyhose", "tights"],
  "ニーソックス": ["knee-socks"],
  "レオタード": ["leotard"],
  "和服・浴衣": ["kimono", "yukata"],
  "体操着": ["gym-uniform"],
  "ビジネススーツ": ["business-suit"],
  "学生服": ["school-uniform", "student-adult"],
  "秘書": ["secretary"],
  "女装・男の娘": ["cross-dressing", "otoko-no-ko"],
  "チャイナドレス": ["china-dress"],
  "ルーズソックス": ["loose-socks"],
  "レースクィーン": ["race-queen"],
  "チアガール": ["cheerleader"],
  "ブルマ": ["bloomers"],
  "スチュワーデス": ["stewardess", "flight-attendant"],

  // ---- ジャンル ----
  "ベスト・総集編": ["best-compilation"],
  "デビュー作品": ["debut"],
  "単体作品": ["solo"],
  "SF": ["sci-fi"],
  "イメージビデオ": ["image-video"],
  "素人": ["amateur"],
  "企画": ["planning"],
  "アクション": ["action"],
  "アニメ": ["anime"],
  "SM": ["sm", "bdsm"],
  "ギャグ・コメディ": ["comedy"],
  "学園もの": ["school-stuff"],
  "痴女": ["chijo", "slut"],
  "淫語": ["dirty-talk"],
  "ハーレム": ["harem"],
  "童貞": ["virgin-theme"],
  "近親相姦": ["incest"],
  "イタズラ": ["mischief"],
  "ドラマ": ["drama"],
  "寝取り・寝取られ・NTR": ["cuckold", "ntr"],
  "乱行": ["orgy"],
  "淫乱": ["lewd"],
  "レズビアン": ["lesbian"],
  "ナンパ": ["pickup"],
  "即ハメ": ["instant-sex"],
  "不倫": ["affair"],
  "BL（ボーイズラブ）": ["bl", "boys-love"],
  "オタク": ["otaku"],
  "ギリモザ": ["barely-mosaic"],
  "盗撮・のぞき": ["voyeur"],
  "複数話": ["multi-episode"],
  "放置": ["neglect"],
  "ビッチ": ["bitch"],
  "触手": ["tentacle"],
  "時間停止": ["time-stop"],

  // ---- 職業いろいろ ----
  "アイドル・芸能人": ["idol", "entertainer"],
  "オフィス": ["office"],
  "上司": ["boss"],
  "部下・同僚": ["colleague"],
  "面接": ["interview"],
  "医者": ["doctor"],
  "看護師": ["nurse"],
  "教師": ["teacher"],
  "インストラクター": ["instructor"],
  "ウェイトレス": ["waitress"],
  "メイド": ["maid"],
  "CA・スチュワーデス": ["ca", "flight-attendant"],
  "受付嬢": ["receptionist"],
  "マッサージ": ["massage"],
  "エステ": ["esthetic"],
  "野外・屋外": ["outdoors"],
  "旅行": ["travel"],
  "デート": ["date"],
  "カップル": ["couple"],
  "人妻": ["married-woman", "housewife"],
  "熟女": ["mature-woman", "milf"],
  "ママ友": ["mom-friend"],
  "姉・妹": ["sister", "sisters"],
  "キャバ嬢・風俗嬢": ["hostess", "sex-worker"],
  "主婦": ["housewife"],
  "義母": ["mother-in-law", "stepmother"],
  "女教師": ["female-teacher", "teacher-adult"],
  "OL・職業色々": ["office-lady", "ol", "business-suit"],
  "女子大生": ["college-student"],
  "お母さん": ["mother"],
  "女子校生": ["high-school-girl", "student-adult", "school-adult"],

  // ---- プレイ ----
  "キス": ["kiss"],
  "マッサージプレイ": ["massage-play"],
  "おもちゃ": ["toys"],
  "3P": ["3p"],
  "複数プレイ": ["group-sex"],
  "シャワー": ["shower"],
  "ローション": ["lotion"],
  "オイル": ["oil"],
  "言葉責め": ["verbal-abuse"],
  "フェラ": ["blowjob"],
  "パイズリ": ["titjob"],
  "手コキ": ["handjob"],
  "クンニ": ["cunnilingus"],
  "オナニー": ["masturbation"],
  "シックスナイン": ["69", "sixty-nine"],
  "アナルセックス": ["anal"],
  "イマラチオ": ["irrumatio"],
  "イラマチオ": ["irrumatio", "iramachio"],
  "中出し": ["creampie"],
  "顔射": ["facial"],
  "縛り・緊縛": ["bondage"],
  "騎乗位": ["cowgirl"],
  "潮吹き": ["squirting"],
  "放尿・お漏らし": ["peeing", "omorashi"],
  "飲尿": ["drinking-urine"],
  "羞恥": ["shame"],
  "4P": ["4p"],
  "デカチン・巨根": ["big-cock"],
  "電マ": ["vibrator"],
  "拘束": ["restraint"],
  "ぶっかけ": ["bukkake"],
  "パンチラ": ["upskirt"],
  "胸チラ": ["cleavage"],
  "スパンキング": ["spanking"],
  "カーセックス": ["car-sex"],
  "スカトロ": ["scat"],
  "ヨガ": ["yoga"],
  "オナサポ": ["masturbation-support"],

  // ---- その他 ----
  "VR": ["vr", "vr-only", "high-quality-vr"],
  "ハイクオリティVR": ["high-quality-vr"],
  "スマホ推奨": ["smartphone-recommended"],
  "短尺": ["short"],
  "シリーズ": ["series"],
  "独占配信": ["exclusive"],
  "FANZA配信限定": ["fanza-exclusive"],
  "4K": ["4k"],
  "3D": ["3d"],
  "VR専用": ["vr-only"],
  "縦動画": ["vertical-video"],
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
};

const EVT_LIKES = "likes_changed_v1";
const KEY_LIKED = "liked_videos_v1";

function readLikedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY_LIKED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
  } catch {}
  return new Set();
}

function isInteractiveTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return !!el.closest(
    [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "[role='button']",
      "[data-no-swipe='1']",
      "[data-ui='controls']",
    ].join(",")
  );
}

function normalizeText(s: any) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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
  const [page, setPage] = useState(1);
  const [seed, setSeed] = useState(
    typeof window !== "undefined" ? Math.floor(Math.random() * 1_000_000) : 0
  );
  const [hasMore, setHasMore] = useState(true);

  const [vh, setVh] = useState<number>(() =>
    typeof window !== "undefined" ? Math.round(window.innerHeight) : 0
  );

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

  const trackRef = useRef<HTMLDivElement | null>(null);
  const setTranslate = useCallback((y: number, transition?: string) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = transition ?? "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }, []);

  const draggingRef = useRef(false);
  const animatingRef = useRef(false);
  const startYRef = useRef(0);
  const dyRef = useRef(0);
  const startTimeRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const appliedStartIdRef = useRef<string>("");

  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const update = () => {
      if (draggingRef.current) return;
      const vv = window.visualViewport;
      setVh(Math.round(vv?.height ?? window.innerHeight));
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const loadMoreVideos = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();

      const apiGenres = genres
        .filter(Boolean)
        .flatMap((g) => {
          if (g === GENRE_FAVORITES || g === GENRE_LIKES) return [g];
          return GENRE_MAP[g] || []; // マップにない場合は除外
        });

      // マップに該当がある場合のみパラメータ送信（該当なしなら送らない＝全件）
      if (apiGenres.length > 0) {
        params.set("genres", apiGenres.join(","));
      }

      if (query) params.set("query", query);
      params.set("page", String(page));
      params.set("seed", String(seed));
      params.set("_t", Date.now().toString());

      if (genres.includes(GENRE_FAVORITES)) {
        const likedIds = Array.from(readLikedSet());
        if (!likedIds.length) {
          setItems([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
        params.set("ids", likedIds.join(","));
      }

      const res = await fetch(`/api/feed?${params}`, { cache: "no-store" });
      const json = await res.json().catch(() => []);
      const list = Array.isArray(json) ? json : [];

      if (!list.length) {
        setHasMore(false);
        return;
      }

      const normalized: VideoItem[] = list
        .map((v) => {
          const affUrl = (v?.affUrl ?? v?.affiliateUrl) as string | undefined;
          const affLabel = (v?.affLabel ?? v?.affiliateLabel) as string | undefined;
          return {
            id: String(v.id ?? ""),
            title: String(v.title ?? ""),
            url: v.url ?? v.src,
            src: v.src ?? v.url,
            poster: v.poster,
            srcType: v.srcType,
            affUrl,
            affLabel,
            affiliateUrl: affUrl,
            affiliateLabel: affLabel,
            genres: Array.isArray(v.genres) ? v.genres : undefined,
            genre: typeof v.genre === "string" ? v.genre : undefined,
            likeCount: 0,
          };
        })
        .filter((v) => !!v.id);

      try {
        const ids = normalized.map((v) => v.id);
        if (ids.length) {
          const r2 = await fetch(
            `/api/likes?ids=${encodeURIComponent(ids.join(","))}`,
            { cache: "no-store" }
          );
          const j2 = await r2.json().catch(() => null);
          const counts = (j2?.counts ?? {}) as Record<string, number>;
          for (const v of normalized) v.likeCount = Number(counts[v.id] ?? 0);
        }
      } catch {}

      setItems((prev) => {
        const ids = new Set(prev.map((v) => v.id));
        return [...prev, ...normalized.filter((v) => !ids.has(v.id))];
      });

      setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, genres, query, page, seed]);

  useEffect(() => {
    if (items.length === 0 && hasMore) loadMoreVideos();
  }, [items.length, hasMore, loadMoreVideos]);

  useEffect(() => {
    if (items.length > 0 && index >= Math.max(0, items.length - 30) && hasMore) {
      loadMoreVideos();
    }
  }, [index, items.length, hasMore, loadMoreVideos]);

  useEffect(() => {
    if (initialGenre) {
      let g = initialGenre;
      try {
        g = decodeURIComponent(initialGenre);
      } catch {}
      setGenres([g]);
      setItems([]);
      setIndex(0);
      setPage(1);
      setSeed(Math.floor(Math.random() * 1_000_000));
      setHasMore(true);
      setTranslate(0, "none");
    }
  }, [initialGenre, setTranslate]);

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

  const viewItems = useMemo(() => {
    let base = items;

    // ソートだけ維持し、それ以外のフィルタリング（混ざり防止）はAPIの結果を信頼する
    if (genres.length === 1 && genres[0] === GENRE_LIKES) {
       base = items.slice().sort((a, b) => Number(b.likeCount ?? 0) - Number(a.likeCount ?? 0));
    } else if (genres.length === 1 && genres[0] === GENRE_FAVORITES) {
       base = items;
    }

    const q = normalizeText(query);
    if (!q) return base;

    return base.filter((v) => {
      const title = normalizeText(v.title);
      const affLabel = normalizeText(v.affLabel ?? v.affiliateLabel ?? "");
      const id = normalizeText(v.id);
      return title.includes(q) || affLabel.includes(q) || id.includes(q);
    });
  }, [items, genres, query]);

  const count = viewItems.length;
  const h = vh || 0;
  const PEEK = 14;
  const cardH = Math.max(0, h - PEEK * 2);

  const windowItems = useMemo(() => {
    const cur = viewItems[index];
    const prevItem = index > 0 ? viewItems[index - 1] : undefined;
    const nextItem =
      index + 1 < viewItems.length ? viewItems[index + 1] : undefined;
    const out: Array<{ item: VideoItem; pos: -1 | 0 | 1; absIndex: number }> =
      [];
    if (prevItem) out.push({ item: prevItem, pos: -1, absIndex: index - 1 });
    if (cur) out.push({ item: cur, pos: 0, absIndex: index });
    if (nextItem) out.push({ item: nextItem, pos: 1, absIndex: index + 1 });
    return out;
  }, [viewItems, index]);

  const clampIndex = useCallback(
    (next: number) => {
      if (!count) return 0;
      return Math.max(0, Math.min(count - 1, next));
    },
    [count]
  );

  const finishSlide = useCallback(
    (dir: -1 | 1) => {
      if (!h || animatingRef.current) return;
      animatingRef.current = true;
      const dur = 200;
      setTranslate(dir * h, `transform ${dur}ms cubic-bezier(0.22,0.61,0.36,1)`);
      window.setTimeout(() => {
        setIndex((cur) => {
          const next = clampIndex(cur + (dir === -1 ? 1 : -1));
          indexRef.current = next;
          return next;
        });
        requestAnimationFrame(() => {
          setTranslate(0, "none");
          window.setTimeout(() => setTranslate(0, "none"), 0);
          animatingRef.current = false;
        });
      }, dur);
    },
    [clampIndex, h, setTranslate]
  );

  const applyRubberBand = useCallback(
    (dy: number) => {
      if (!h) return dy;
      const atTop = index <= 0;
      const atBottom = index >= Math.max(0, count - 1);
      if (atTop && dy > 0) return dy * 0.35;
      if (atBottom && dy < 0) return dy * 0.35;
      return dy;
    },
    [h, index, count]
  );

  const beginDrag = useCallback(
    (clientY: number) => {
      if (animatingRef.current) return;
      draggingRef.current = true;
      startYRef.current = clientY;
      dyRef.current = 0;
      startTimeRef.current = performance.now();
      setTranslate(0, "none");
    },
    [setTranslate]
  );

  const moveDrag = useCallback(
    (clientY: number) => {
      if (!draggingRef.current || animatingRef.current) return;
      const dy = applyRubberBand(clientY - startYRef.current);
      dyRef.current = dy;
      setTranslate(dy, "none");
    },
    [applyRubberBand, setTranslate]
  );

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (animatingRef.current) {
      setTranslate(0, "none");
      return;
    }
    const dy = dyRef.current;
    const dt = performance.now() - startTimeRef.current;
    const v = dt > 0 ? Math.abs(dy) / dt : 0;
    const DIST = Math.max(55, h * 0.08);
    const VELO = 0.55;
    if ((dy < -DIST || (dy < -25 && v > VELO)) && index < count - 1) {
      finishSlide(-1);
      return;
    }
    if ((dy > DIST || (dy > 25 && v > VELO)) && index > 0) {
      finishSlide(1);
      return;
    }
    setTranslate(0, "transform 160ms ease-out");
    window.setTimeout(() => setTranslate(0, "none"), 170);
  }, [count, finishSlide, h, index, setTranslate]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isInteractiveTarget(e.target)) return;
      if (animatingRef.current) return;
      if (typeof e.button === "number" && e.button !== 0) return;
      pointerIdRef.current = e.pointerId;
      beginDrag(e.clientY);
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
      e.preventDefault();
    },
    [beginDrag]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId || !draggingRef.current) return;
      moveDrag(e.clientY);
      e.preventDefault();
    },
    [moveDrag]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = null;
      endDrag();
      e.preventDefault();
    },
    [endDrag]
  );

  const SAFE_PAD = 12;
  const safeTop = `calc(env(safe-area-inset-top) + ${SAFE_PAD}px)`;
  const safeLeft = `calc(env(safe-area-inset-left) + ${SAFE_PAD}px)`;
  const safeRight = `calc(env(safe-area-inset-right) + ${SAFE_PAD}px)`;

  const isInitialLoading = items.length === 0 && loading;

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{ height: "100svh", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
            touchAction: "none",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 20 }}>動画を読み込み中...</div>
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 2, textAlign: "center" }}>
            <div>⬆︎ 上にスワイプで次の動画</div>
            <div>ダブルタップで5秒スキップ</div>
          </div>
        </div>
      )}

      {!hideGenreMenu && (
        <div className="absolute z-40" data-no-swipe="1" style={{ top: safeTop, left: safeLeft }}>
          <GenreMenu
            value={genres}
            onChange={(v) => {
              setGenres(v);
              setItems([]);
              setIndex(0);
              setPage(1);
              setSeed(Math.floor(Math.random() * 1_000_000));
              setHasMore(true);
              setTranslate(0, "none");
            }}
            query={query}
            onChangeQuery={(s) => {
              setQuery(s);
              setItems([]);
              setIndex(0);
              setPage(1);
              setSeed(Math.floor(Math.random() * 1_000_000));
              setHasMore(true);
              setTranslate(0, "none");
            }}
          />
        </div>
      )}
      <div className="absolute z-40" data-no-swipe="1" style={{ top: `calc(${safeTop} - 8px)`, right: safeRight }}>
        <MoreMenu />
      </div>
      <div ref={trackRef} style={{ position: "relative", height: `${vh}px` }}>
        {windowItems.map(({ item, pos, absIndex }) => (
          <div
            key={`${item.id}:${absIndex}`}
            style={{
              position: "absolute",
              inset: 0,
              top: `${pos * h + PEEK}px`,
              height: `${cardH}px`,
            }}
          >
            <VideoCard video={item} isActive={absIndex === index} />
          </div>
        ))}
      </div>
    </div>
  );
}