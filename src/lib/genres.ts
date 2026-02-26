// src/lib/genres.ts

export const GENRE_ALL = "all" as const;
export const GENRE_LIKES = "__likes__" as const;
export const GENRE_FAVORITES = "__favorites__" as const; // ★追加

export type GenreKey = string;

export type GenreItem = { key: string; label: string };
export type GenreGroup = { title: string; items: GenreItem[] };

export const GENRE_GROUPS: GenreGroup[] = [
  // ---- タイプ（見た目/属性） ----
  {
    title: "タイプ",
    items: [
      { key: "cute", label: "可愛い" },
      { key: "cool", label: "クール" },
      { key: "sexy", label: "セクシー" },
      { key: "innocent", label: "清楚" },
      { key: "glamorous", label: "グラマラス" },
      { key: "slender", label: "スレンダー" },
      { key: "curvy", label: "グラマー" },
      { key: "petite", label: "小柄" },
      { key: "tall", label: "長身" },
      { key: "athlete", label: "アスリート" },
      { key: "muscular", label: "筋肉" },
      { key: "chubby", label: "ぽっちゃり" },
      { key: "big-breasts", label: "巨乳" },
      { key: "small-breasts", label: "微乳・貧乳" },
      { key: "huge-breasts", label: "超乳" },
      { key: "big-butt", label: "巨尻" },
      { key: "plump", label: "むっちり" },
      { key: "mature", label: "大人っぽい" },
      { key: "oneesan", label: "お姉さん" },
      { key: "model", label: "モデル系" },
      { key: "asian", label: "アジア系" },
      { key: "western", label: "欧美系" },
      { key: "big-breasts-fetish", label: "巨乳フェチ" },
      { key: "butt-fetish", label: "尻フェチ" },
      { key: "shaved", label: "パイパン" },
      { key: "mini", label: "ミニ系" },
      { key: "pov", label: "主観" },
      { key: "sweaty", label: "汗だく" },
      { key: "bishoujo", label: "美少女" },
      { key: "other-type", label: "その他（タイプ）" },
      { key: "fair-skin", label: "色白" },
      { key: "clean", label: "清潔" },
      { key: "beautiful-style", label: "美乳" },
    ],
  },

  // ---- コスチューム ----
  {
    title: "コスチューム",
    items: [
      { key: "cosplay", label: "コスプレ" },
      { key: "uniform", label: "制服" },
      { key: "sailor-uniform", label: "セーラー服" },
      { key: "swimsuit", label: "水着" },
      { key: "school-swimsuit", label: "競泳・スクール水着" },
      { key: "bodycon", label: "ボディコン" },
      { key: "lingerie", label: "ランジェリー" },
      { key: "apron", label: "エプロン" },
      { key: "naked-apron", label: "裸エプロン" },
      { key: "bunny", label: "バニー" },
      { key: "mask", label: "覆面・マスク" },
      { key: "glasses", label: "めがね" },
      { key: "pantyhose", label: "パンスト・タイツ" },
      { key: "knee-socks", label: "ニーソックス" },
      { key: "leotard", label: "レオタード" },
      { key: "kimono", label: "和服・浴衣" },
      { key: "gym-uniform", label: "体操着" },
      { key: "business-suit", label: "ビジネススーツ" },
      { key: "other-costume", label: "その他（コス）" },
      { key: "student-uniform-adult", label: "学生服" },
      { key: "secretary", label: "秘書" },
      { key: "crossdress", label: "女装・男の娘" },
      { key: "china-dress", label: "チャイナドレス" },
      { key: "loose-socks", label: "ルーズソックス" },
      { key: "race-queen", label: "レースクィーン" },
      { key: "cheerleader", label: "チアガール" },
      { key: "bloomers", label: "ブルマ" },
      { key: "stewardess", label: "スチュワーデス" },
    ],
  },

  // ---- 作品/ジャンル ----
  {
    title: "ジャンル",
    items: [
      { key: "collab", label: "コラボ作品" },
      { key: "best-compilation", label: "ベスト・総集編" },
      { key: "debut", label: "デビュー作品" },
      { key: "solo", label: "単体作品" },
      { key: "sf", label: "SF" },
      { key: "image-video", label: "イメージビデオ" },
      { key: "image-video-male", label: "イメージビデオ（男性）" },
      { key: "fetish", label: "フェチ" },
      { key: "leg-foot-fetish", label: "脚・足フェチ" },
      { key: "documentary", label: "ドキュメント系" },
      { key: "amateur", label: "素人" },
      { key: "planning", label: "企画" },
      { key: "other-fetish", label: "その他フェチ" },
      { key: "other-genre", label: "その他（ジャンル）" },
      { key: "action", label: "アクション" },
      { key: "anime", label: "アニメ" },
      { key: "classic", label: "クラシック" },
      { key: "sm", label: "SM" },
      { key: "gag-comedy", label: "ギャグ・コメディ" },
      { key: "school-adult", label: "学園もの" },
      { key: "romance", label: "恋愛" },
      { key: "seductress", label: "痴女" },
      { key: "obscene-talk", label: "淫語" },
      { key: "harem", label: "ハーレム" },
      { key: "virgin-theme", label: "童貞" },
      { key: "humiliation-strong", label: "辱め" },
      { key: "incest-taboo", label: "近親相姦" },
      { key: "prank", label: "イタズラ" },
      { key: "story-drama", label: "ドラマ" },
      { key: "ntr", label: "寝取り・寝取られ・NTR" },
      { key: "group-play", label: "乱行" },
      { key: "promiscuous", label: "淫乱" },
      { key: "hardcore", label: "淫乱・ハード系" },
      { key: "lesbian", label: "レズビアン" },
      { key: "pickup", label: "ナンパ" },
      { key: "instant", label: "即ハメ" },
      { key: "affair", label: "不倫" },
      { key: "bl", label: "BL（ボーイズラブ）" },
      { key: "otaku", label: "オタク" },
      { key: "princess", label: "お姫様" },
      { key: "giri-mosaic", label: "ギリモザ" },
      { key: "companion", label: "コンパニオン" },
      { key: "celebrity", label: "セレブ" },
      { key: "voyeur", label: "盗撮・のぞき" },
      { key: "multiple-episodes", label: "複数話" },
      { key: "hands-off", label: "放置" },
      { key: "bitch", label: "ビッチ" },
      { key: "tentacle", label: "触手" },
      { key: "time-stop", label: "時間停止" },
    ],
  },

  // ---- 職業いろいろ ----
  {
    title: "職業いろいろ",
    items: [
      { key: "idol-celebrity", label: "アイドル・芸能人" },
      { key: "office", label: "オフィス" },
      { key: "boss", label: "上司" },
      { key: "subordinate-colleague", label: "部下・同僚" },
      { key: "interview", label: "面接" },
      { key: "doctor", label: "医者" },
      { key: "nurse", label: "看護師" },
      { key: "teacher", label: "教師" },
      { key: "instructor", label: "インストラクター" },
      { key: "waitress", label: "ウェイトレス" },
      { key: "maid", label: "メイド" },
      { key: "cabin-attendant", label: "CA・スチュワーデス" },
      { key: "receptionist", label: "受付嬢" },
      { key: "massage", label: "マッサージ" },
      { key: "esthetic", label: "エステ" },
      { key: "hospital-clinic", label: "病院・クリニック" },
      { key: "hotel", label: "ホテル" },
      { key: "hot-spring", label: "温泉" },
      { key: "bath", label: "お風呂" },
      { key: "home", label: "自宅" },
      { key: "outdoor", label: "野外・屋外" },
      { key: "travel", label: "旅行" },
      { key: "date", label: "デート" },
      { key: "drinking-party", label: "飲み会・合コン" },
      { key: "neighborhood", label: "近所・ご近所" },
      { key: "couple", label: "カップル" },
      { key: "married-woman", label: "人妻" },
      { key: "milf", label: "熟女" },
      { key: "mom-friend", label: "ママ友" },
      { key: "sisters", label: "姉・妹" },
      { key: "hostess-service", label: "キャバ嬢・風俗嬢" },
      { key: "housewife", label: "主婦" },
      { key: "stepmother", label: "義母" },
      { key: "teacher-adult", label: "女教師" },
      { key: "office-mix", label: "OL・職業色々" },
      { key: "college-student", label: "女子大生" },
      { key: "mature-mother", label: "お母さん" },
      { key: "student-adult", label: "女子校生" },
    ],
  },

  // ---- プレイ ----
  {
    title: "プレイ",
    items: [
      { key: "kiss", label: "キス" },
      { key: "massage-play", label: "マッサージプレイ" },
      { key: "roleplay", label: "ロールプレイ" },
      { key: "toys", label: "おもちゃ" },
      { key: "cosplay-play", label: "コスプレプレイ" },
      { key: "3p", label: "3P" },
      { key: "multiple-play", label: "複数プレイ" },
      { key: "shower", label: "シャワー" },
      { key: "lotion", label: "ローション" },
      { key: "oil-play", label: "オイル" },
      { key: "tease", label: "焦らし" },
      { key: "dirty-talk", label: "言葉責め" },
      { key: "blowjob", label: "フェラ" },
      { key: "titjob", label: "パイズリ" },
      { key: "handjob", label: "手コキ" },
      { key: "cunnilingus", label: "クンニ" },
      { key: "masturbation", label: "オナニー" },
      { key: "sixty-nine", label: "シックスナイン" },
      { key: "anal-sex", label: "アナルセックス" },
      { key: "irrumatio", label: "イマラチオ" },
      { key: "iramachio", label: "イラマチオ" },
      { key: "creampie", label: "中出し" },
      { key: "facial", label: "顔射" },
      { key: "bondage", label: "縛り・緊縛" },
      { key: "cowgirl", label: "騎乗位" },
      { key: "squirting", label: "潮吹き" },
      { key: "urination", label: "放尿・お漏らし" },
      { key: "drink-urine", label: "飲尿" },
      { key: "humiliation", label: "羞恥" },
      { key: "shame", label: "羞め" },
      { key: "4p", label: "4P" },
      { key: "big-dick", label: "デカチン・巨根" },
      { key: "other-play", label: "その他（プレイ）" },
      { key: "electric-toy", label: "電マ" },
      { key: "restraint", label: "拘束" },
      { key: "finish", label: "ぶっかけ" },
      { key: "panty-shot", label: "パンチラ" },
      { key: "boob-slip", label: "胸チラ" },
      { key: "spanking", label: "スパンキング" },
      { key: "car-sex", label: "カーセックス" },
      { key: "scat", label: "スカトロ" },
      { key: "yoga", label: "ヨガ" },
      { key: "support-masturbation", label: "オナサポ" },
    ],
  },

  // ---- その他 ----
  {
    title: "その他",
    items: [
      { key: "vr", label: "VR" },
      { key: "high-quality-vr", label: "ハイクオリティVR" },
      { key: "mobile-recommended", label: "スマホ推奨" },
      { key: "short", label: "短尺" },
      { key: "over-4-hours", label: "4時間以上" },
      { key: "over-16-hours", label: "16時間以上" },
      { key: "series", label: "シリーズ" },
      { key: "set", label: "セット商品" },
      { key: "digimo", label: "デジモ" },
      { key: "exclusive", label: "独占配信" },
      { key: "ai-generated", label: "AI生成作品" },
      { key: "fanza-exclusive", label: "FANZA配信限定" },
      { key: "4k", label: "4K" },
      { key: "3d", label: "3D" },
      { key: "other", label: "その他" },
      { key: "vr-only", label: "VR専用" },
      { key: "vertical-video", label: "縦動画" },
    ],
  },
];

export const GENRE_LIST: GenreItem[] = [
  { key: GENRE_ALL, label: "ランダム" },
  ...GENRE_GROUPS.flatMap((g) => g.items),
];

// ---- SEO説明文テンプレ（薄いページ対策） ----
function genreDesc(label: string): string {
  return `${label}をテーマにした短尺動画をまとめています。
スマートフォンでの視聴に最適化された縦型動画を中心に掲載し、スワイプ操作で次々に楽しめます。
テンポよく作品をチェックしたい方におすすめのジャンルです。`;
}

// ---- SEO用マップ（/genre/[slug] 用） ----
export const GENRE_SEO_MAP: Record<
  string,
  { key: GenreKey; label: string; desc: string }
> = Object.fromEntries(
  GENRE_GROUPS.flatMap((g) =>
    g.items.map((it) => {
      const k = String(it.key).toLowerCase();
      return [
        k,
        {
          key: k,
          label: it.label,
          desc: genreDesc(it.label),
        },
      ] as const;
    })
  )
);

export function genreLabel(key: string): string {
  const k = String(key ?? "").toLowerCase();
  if (k === GENRE_ALL) return "ランダム";
  return GENRE_SEO_MAP[k]?.label ?? key;
}

export function isGenreKey(v: any): v is GenreKey {
  if (v === GENRE_ALL) return true;
  return typeof v === "string";
}

export function normalizeGenreKey(v: any): string {
  if (v == null) return "";
  return String(v).trim().toLowerCase();
}