"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";
import GenreMenu from "@/components/GenreMenu";
import MoreMenu from "@/components/MoreMenu";
import { GENRE_ALL, GENRE_LIKES, GENRE_FAVORITES, type GenreKey } from "@/lib/genres";

// ===== 日本語ジャンル → DBの実データに完全対応した究極のGENRE_MAP =====
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
  const loadingRef = useRef(false);
  
  const [page, setPage] = useState(1);
  const [seed, setSeed] = useState(() => typeof window !== "undefined" ? Math.floor(Math.random() * 1000000) : 0);
  const [hasMore, setHasMore] = useState(true);

  const [vh, setVh] = useState<number>(() =>
    typeof window !== "undefined" ? Math.round(window.innerHeight) : 0
  );

  const [genres, setGenres] = useState<GenreKey[]>(() => {
    if (initialGenre) {
      try { return [decodeURIComponent(initialGenre)]; } catch { return [initialGenre]; }
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
    if (loadingRef.current || !hasMore) return; 
    loadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      const activeGenres = genres.filter(Boolean);

      const apiGenres = activeGenres.flatMap((g) => {
        if (g === GENRE_FAVORITES || g === GENRE_LIKES) return [g];
        return GENRE_MAP[g] || []; 
      });

      if (apiGenres.length > 0) {
        params.set("genres", apiGenres.join(","));
      }
      
      if (query) params.set("query", query);
      params.set("page", String(page));
      params.set("seed", String(seed));
      params.set("_t", Date.now().toString());

      if (activeGenres.includes(GENRE_FAVORITES)) {
        const likedIds = Array.from(readLikedSet());
        if (likedIds.length === 0) {
           setItems([]);
           setHasMore(false);
           return;
        }
        params.set("ids", likedIds.join(","));
      }

      const res = await fetch(`/api/feed?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const list = (Array.isArray(json) ? json : json?.items ?? []) as any[];
      
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
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnly = normalized.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newOnly];
      });

      setPage((p) => p + 1);

    } catch (e) {
      console.error("Load Error:", e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, genres, query, page, seed]);

  const viewItems = useMemo(() => {
    if (genres.includes(GENRE_ALL)) return items;

    let base = items;

    if (genres.length === 1 && genres[0] === GENRE_LIKES) {
       base = items.slice().sort((a, b) => Number(b.likeCount ?? 0) - Number(a.likeCount ?? 0));
    } else if (genres.length === 1 && genres[0] === GENRE_FAVORITES) {
       base = items;
    } else {
       const wantList = genres.flatMap((g) => GENRE_MAP[g] || []);
       if (wantList.length > 0) {
         base = items.filter((v) => {
           const tags = [
              ...(Array.isArray(v.genres) ? v.genres : []),
              v.genre
           ].filter(Boolean).map(String);
           
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
      const affLabel = normalizeText(v.affLabel ?? v.affiliateLabel ?? "");
      const id = normalizeText(v.id);
      return title.includes(q) || affLabel.includes(q) || id.includes(q);
    });
  }, [items, genres, query]);

  useEffect(() => {
    if (!hasMore) return;
    if (items.length === 0) {
      loadMoreVideos();
    } else {
      const remainingViews = viewItems.length - index;
      if (remainingViews <= 5) {
        loadMoreVideos();
      }
    }
  }, [index, items.length, viewItems.length, hasMore, loadMoreVideos]);

  useEffect(() => {
    if (initialGenre) {
      let g = initialGenre;
      try { g = decodeURIComponent(initialGenre); } catch {}
      setGenres([g]);
      setItems([]); 
      setIndex(0);
      setPage(1);
      setSeed(Math.floor(Math.random() * 1000000));
      setHasMore(true);
      setTranslate(0, "none");
    }
  }, [initialGenre, setTranslate]);

  useEffect(() => {
    const on = (ev: Event) => {
      const e = ev as CustomEvent<{ videoId: string; count: number }>;
      if (!e?.detail) return;
      setItems((prev) =>
        prev.map((v) => v.id === e.detail.videoId ? { ...v, likeCount: Number(e.detail.count) } : v)
      );
    };
    window.addEventListener(EVT_LIKES, on as any);
    return () => window.removeEventListener(EVT_LIKES, on as any);
  }, []);

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

  const clampIndex = useCallback((next: number) => {
      if (!count) return 0;
      return Math.max(0, Math.min(count - 1, next));
    }, [count]);

  const finishSlide = useCallback((dir: -1 | 1) => {
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
    }, [clampIndex, h, setTranslate]);

  const applyRubberBand = useCallback((dy: number) => {
      if (!h) return dy;
      const atTop = index <= 0;
      const atBottom = index >= Math.max(0, count - 1);
      if (atTop && dy > 0) return dy * 0.35;
      if (atBottom && dy < 0) return dy * 0.35;
      return dy;
    }, [h, index, count]);

  const beginDrag = useCallback((clientY: number) => {
      if (animatingRef.current) return;
      draggingRef.current = true;
      startYRef.current = clientY;
      dyRef.current = 0;
      startTimeRef.current = performance.now();
      setTranslate(0, "none");
    }, [setTranslate]);

  const moveDrag = useCallback((clientY: number) => {
      if (!draggingRef.current || animatingRef.current) return;
      const dy = applyRubberBand(clientY - startYRef.current);
      dyRef.current = dy;
      setTranslate(dy, "none");
    }, [applyRubberBand, setTranslate]);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (animatingRef.current) { setTranslate(0, "none"); return; }
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

  const onPointerDown = useCallback((e: React.PointerEvent) => {
      if (isInteractiveTarget(e.target)) return;
      if (animatingRef.current) return;
      if (typeof e.button === "number" && e.button !== 0) return;
      pointerIdRef.current = e.pointerId;
      beginDrag(e.clientY);
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
      e.preventDefault();
    }, [beginDrag]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId || !draggingRef.current) return;
      moveDrag(e.clientY);
      e.preventDefault();
    }, [moveDrag]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = null;
      endDrag();
      e.preventDefault();
    }, [endDrag]);

  const SAFE_PAD = 12;
  const safeTop = `calc(env(safe-area-inset-top) + ${SAFE_PAD}px)`;
  const safeLeft = `calc(env(safe-area-inset-left) + ${SAFE_PAD}px)`;
  const safeRight = `calc(env(safe-area-inset-right) + ${SAFE_PAD}px)`;

  const isInitialLoading = items.length === 0 && loading;
  const isNoResults = !loading && !hasMore && items.length > 0 && viewItems.length === 0;

  return (
    <div className="relative w-full bg-black overflow-hidden" style={{ height: "100svh", touchAction: "none" }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {isInitialLoading && (
        <div style={{ position: "absolute", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "black", color: "rgba(255,255,255,0.8)", touchAction: "none", pointerEvents: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 20 }}>動画を読み込み中...</div>
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 2, textAlign: "center" }}><div>⬆︎ 上にスワイプで次の動画</div><div>ダブルタップで5秒スキップ</div></div>
        </div>
      )}

      {isNoResults && (
        <div style={{ position: "absolute", inset: 0, zIndex: 9000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "black", color: "white", padding: "20px", textAlign: "center", touchAction: "none", pointerEvents: "auto" }}>
          <p style={{ fontSize: 16, fontWeight: "bold", marginBottom: 24, lineHeight: 1.5 }}>
            現在、このジャンルの<br/>動画はありません 😢
          </p>
          <button 
            onClick={() => {
              setGenres([GENRE_ALL]);
              setItems([]);
              setIndex(0);
              setPage(1);
              setHasMore(true);
            }} 
            style={{ padding: "12px 24px", background: "white", color: "black", borderRadius: "30px", fontWeight: "bold", border: "none" }}
          >
            すべての動画を見る
          </button>
        </div>
      )}

      {!hideGenreMenu && (
        <div className="absolute z-40" data-no-swipe="1" style={{ top: safeTop, left: safeLeft }}>
          <GenreMenu value={genres} onChange={(v) => { setGenres(v); setItems([]); setIndex(0); setPage(1); setSeed(Math.floor(Math.random() * 1000000)); setHasMore(true); setTranslate(0, "none"); }} query={query} onChangeQuery={(s) => { setQuery(s); setItems([]); setIndex(0); setPage(1); setSeed(Math.floor(Math.random() * 1000000)); setHasMore(true); setTranslate(0, "none"); }} />
        </div>
      )}
      <div className="absolute z-40" data-no-swipe="1" style={{ top: `calc(${safeTop} - 8px)`, right: safeRight }}><MoreMenu /></div>
      <div ref={trackRef} style={{ position: "relative", height: `${vh}px` }}>
        {windowItems.map(({ item, pos, absIndex }) => (
          <div key={`${item.id}:${absIndex}`} style={{ position: "absolute", inset: 0, top: `${pos * h + PEEK}px`, height: `${cardH}px` }}>
            <VideoCard video={item} isActive={absIndex === index} />
          </div>
        ))}
      </div>
    </div>
  );
}