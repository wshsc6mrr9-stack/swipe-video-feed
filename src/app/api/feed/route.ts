import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = "force-dynamic";

const GENRE_MAP: Record<string, string[]> = {
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
  "コラボ作品": ["collab"],
  "ベスト・総集編": ["best-compilation"],
  "デビュー作品": ["debut"],
  "単体作品": ["solo"],
  "SF": ["sf"],
  "イメージビデオ": ["image-video"],
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
  "レズビアン": ["lesbian"],
  "ナンパ": ["pickup"],
  "即ハメ": ["instant"],
  "不倫": ["affair"],
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
  "キス": ["kiss"],
  "おもちゃ": ["toys", "electric-toy"],
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
  "中出し": ["creampie"],
  "顔射": ["facial"],
  "縛り・緊縛": ["bondage", "restraint"],
  "騎乗位": ["cowgirl"],
  "潮吹き": ["squirting"],
  "放尿・お漏らし": ["urination"],
  "飲尿": ["drink-urine"],
  "羞恥": ["humiliation"],
  "4P": ["4p"],
  "デカチン・巨根": ["big-dick"],
  "電マ": ["electric-toy"],
  "拘束": ["restraint"],
  "ぶっかけ": ["finish"],
  "パンチラ": ["panty-shot"],
  "胸チラ": ["boob-slip"],
  "スパンキング": ["spanking"],
  "カーセックス": ["car-sex"],
  "スカトロ": ["scat"],
  "ヨガ": ["yoga"],
  "オナサポ": ["support-masturbation"],
  "VR": ["vr", "vr-only"],
  "ハイクオリティVR": ["high-quality-vr"],
  "4時間以上": ["over-4-hours"],
  "16時間以上": ["over-16-hours"],
  "セット商品": ["set"],
  "デジモ": ["digimo"],
  "独占配信": ["exclusive"],
  "AI生成作品": ["ai-generated"],
  "FANZA配信限定": ["fanza-exclusive"],
  "4K": ["4k"],
  "3D": ["3d"],
  "VR専用": ["vr-only"],
};

function toSafeNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawGenres =
      searchParams.get("genres") ??
      searchParams.get("genre") ??
      "";

    const genres = rawGenres
      .split(",")
      .map((s) => {
        try {
          return decodeURIComponent(s.trim());
        } catch {
          return s.trim();
        }
      })
      .filter(Boolean);

    const mappedGenres = genres.flatMap((g) => {
      if (g.startsWith("__")) return [g];
      return GENRE_MAP[g] ?? [];
    });

    const query = searchParams.get("query") || "";
    const count = parseInt(searchParams.get("count") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const seed = parseInt(searchParams.get("seed") || "0", 10);

    const idsParam = searchParams.get("ids");
    let targetIds: string[] | undefined = undefined;
    if (idsParam) {
      targetIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const videos = await getFilteredVideos(
      mappedGenres.length > 0 ? mappedGenres : undefined,
      query,
      count,
      page,
      seed,
      targetIds
    );

    const normalized = (Array.isArray(videos) ? videos : []).map((v: any) => ({
      ...v,
      id: String(v?.id ?? ""),
      title: String(v?.title ?? ""),
      url: v?.url ?? v?.src ?? "",
      src: v?.src ?? v?.url ?? "",
      poster: v?.poster ?? "",
      srcType: v?.srcType ?? undefined,
      affUrl: v?.affUrl ?? v?.affiliateUrl ?? "",
      affLabel: v?.affLabel ?? v?.affiliateLabel ?? "",
      affiliateUrl: v?.affiliateUrl ?? v?.affUrl ?? "",
      affiliateLabel: v?.affiliateLabel ?? v?.affLabel ?? "",
      genres: Array.isArray(v?.genres) ? v.genres : [],
      genre: typeof v?.genre === "string" ? v.genre : "",
      likeCount: Number(v?.likeCount ?? 0),
      duration:
        toSafeNumber(v?.duration) ??
        toSafeNumber(v?.videoDuration) ??
        toSafeNumber(v?.totalDuration) ??
        toSafeNumber(v?.lengthSec) ??
        toSafeNumber(v?.durationSec) ??
        undefined,
    }));

    return NextResponse.json(normalized, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json([], { status: 500 });
  }
}