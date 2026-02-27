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
      { key: "ギャル", label: "ギャル" },
      { key: "可愛い", label: "可愛い" },
      { key: "クール", label: "クール" },
      { key: "セクシー", label: "セクシー" },
      { key: "清楚", label: "清楚" },
      { key: "グラマラス", label: "グラマラス" },
      { key: "スレンダー", label: "スレンダー" },
      { key: "グラマー", label: "グラマー" },
      { key: "小柄", label: "小柄" },
      { key: "長身", label: "長身" },
      { key: "アスリート", label: "アスリート" },
      { key: "筋肉", label: "筋肉" },
      { key: "ぽっちゃり", label: "ぽっちゃり" },
      { key: "巨乳", label: "巨乳" },
      { key: "微乳・貧乳", label: "微乳・貧乳" },
      { key: "超乳", label: "超乳" },
      { key: "巨尻", label: "巨尻" },
      { key: "むっちり", label: "むっちり" },
      { key: "大人っぽい", label: "大人っぽい" },
      { key: "お姉さん", label: "お姉さん" },
      { key: "モデル系", label: "モデル系" },
      { key: "アジア系", label: "アジア系" },
      { key: "欧美系", label: "欧美系" },
      { key: "巨乳フェチ", label: "巨乳フェチ" },
      { key: "尻フェチ", label: "尻フェチ" },
      { key: "パイパン", label: "パイパン" },
      { key: "ミニ系", label: "ミニ系" },
      { key: "主観", label: "主観" },
      { key: "汗だく", label: "汗だく" },
      { key: "美少女", label: "美少女" },
      { key: "その他（タイプ）", label: "その他（タイプ）" },
      { key: "色白", label: "色白" },
      { key: "清潔", label: "清潔" },
      { key: "美乳", label: "美乳" },
    ],
  },

  // ---- コスチューム ----
  {
    title: "コスチューム",
    items: [
      { key: "コスプレ", label: "コスプレ" },
      { key: "制服", label: "制服" },
      { key: "セーラー服", label: "セーラー服" },
      { key: "水着", label: "水着" },
      { key: "競泳・スクール水着", label: "競泳・スクール水着" },
      { key: "ボディコン", label: "ボディコン" },
      { key: "ランジェリー", label: "ランジェリー" },
      { key: "エプロン", label: "エプロン" },
      { key: "裸エプロン", label: "裸エプロン" },
      { key: "バニー", label: "バニー" },
      { key: "覆面・マスク", label: "覆面・マスク" },
      { key: "めがね", label: "めがね" },
      { key: "パンスト・タイツ", label: "パンスト・タイツ" },
      { key: "ニーソックス", label: "ニーソックス" },
      { key: "レオタード", label: "レオタード" },
      { key: "和服・浴衣", label: "和服・浴衣" },
      { key: "体操着", label: "体操着" },
      { key: "ビジネススーツ", label: "ビジネススーツ" },
      { key: "その他（コス）", label: "その他（コス）" },
      { key: "学生服", label: "学生服" },
      { key: "秘書", label: "秘書" },
      { key: "女装・男の娘", label: "女装・男の娘" },
      { key: "チャイナドレス", label: "チャイナドレス" },
      { key: "ルーズソックス", label: "ルーズソックス" },
      { key: "レースクィーン", label: "レースクィーン" },
      { key: "チアガール", label: "チアガール" },
      { key: "ブルマ", label: "ブルマ" },
      { key: "スチュワーデス", label: "スチュワーデス" },
    ],
  },

  // ---- 作品/ジャンル ----
  {
    title: "ジャンル",
    items: [
      { key: "コラボ作品", label: "コラボ作品" },
      { key: "ベスト・総集編", label: "ベスト・総集編" },
      { key: "デビュー作品", label: "デビュー作品" },
      { key: "単体作品", label: "単体作品" },
      { key: "SF", label: "SF" },
      { key: "イメージビデオ", label: "イメージビデオ" },
      { key: "イメージビデオ（男性）", label: "イメージビデオ（男性）" },
      { key: "フェチ", label: "フェチ" },
      { key: "脚・足フェチ", label: "脚・足フェチ" },
      { key: "ドキュメント系", label: "ドキュメント系" },
      { key: "素人", label: "素人" },
      { key: "企画", label: "企画" },
      { key: "その他フェチ", label: "その他フェチ" },
      { key: "その他（ジャンル）", label: "その他（ジャンル）" },
      { key: "アクション", label: "アクション" },
      { key: "アニメ", label: "アニメ" },
      { key: "クラシック", label: "クラシック" },
      { key: "SM", label: "SM" },
      { key: "ギャグ・コメディ", label: "ギャグ・コメディ" },
      { key: "学園もの", label: "学園もの" },
      { key: "恋愛", label: "恋愛" },
      { key: "痴女", label: "痴女" },
      { key: "淫語", label: "淫語" },
      { key: "ハーレム", label: "ハーレム" },
      { key: "童貞", label: "童貞" },
      { key: "辱め", label: "辱め" },
      { key: "近親相姦", label: "近親相姦" },
      { key: "イタズラ", label: "イタズラ" },
      { key: "ドラマ", label: "ドラマ" },
      { key: "寝取り・寝取られ・NTR", label: "寝取り・寝取られ・NTR" },
      { key: "乱行", label: "乱行" },
      { key: "淫乱", label: "淫乱" },
      { key: "淫乱・ハード系", label: "淫乱・ハード系" },
      { key: "レズビアン", label: "レズビアン" },
      { key: "ナンパ", label: "ナンパ" },
      { key: "即ハメ", label: "即ハメ" },
      { key: "不倫", label: "不倫" },
      { key: "BL（ボーイズラブ）", label: "BL（ボーイズラブ）" },
      { key: "オタク", label: "オタク" },
      { key: "お姫様", label: "お姫様" },
      { key: "ギリモザ", label: "ギリモザ" },
      { key: "コンパニオン", label: "コンパニオン" },
      { key: "セレブ", label: "セレブ" },
      { key: "盗撮・のぞき", label: "盗撮・のぞき" },
      { key: "複数話", label: "複数話" },
      { key: "放置", label: "放置" },
      { key: "ビッチ", label: "ビッチ" },
      { key: "触手", label: "触手" },
      { key: "時間停止", label: "時間停止" },
    ],
  },

  // ---- 職業いろいろ ----
  {
    title: "職業いろいろ",
    items: [
      { key: "アイドル・芸能人", label: "アイドル・芸能人" },
      { key: "オフィス", label: "オフィス" },
      { key: "上司", label: "上司" },
      { key: "部下・同僚", label: "部下・同僚" },
      { key: "面接", label: "面接" },
      { key: "医者", label: "医者" },
      { key: "看護師", label: "看護師" },
      { key: "教師", label: "教師" },
      { key: "インストラクター", label: "インストラクター" },
      { key: "ウェイトレス", label: "ウェイトレス" },
      { key: "メイド", label: "メイド" },
      { key: "CA・スチュワーデス", label: "CA・スチュワーデス" },
      { key: "受付嬢", label: "受付嬢" },
      { key: "マッサージ", label: "マッサージ" },
      { key: "エステ", label: "エステ" },
      { key: "病院・クリニック", label: "病院・クリニック" },
      { key: "ホテル", label: "ホテル" },
      { key: "温泉", label: "温泉" },
      { key: "お風呂", label: "お風呂" },
      { key: "自宅", label: "自宅" },
      { key: "野外・屋外", label: "野外・屋外" },
      { key: "旅行", label: "旅行" },
      { key: "デート", label: "デート" },
      { key: "飲み会・合コン", label: "飲み会・合コン" },
      { key: "近所・ご近所", label: "近所・ご近所" },
      { key: "カップル", label: "カップル" },
      { key: "人妻", label: "人妻" },
      { key: "熟女", label: "熟女" },
      { key: "ママ友", label: "ママ友" },
      { key: "姉・妹", label: "姉・妹" },
      { key: "キャバ嬢・風俗嬢", label: "キャバ嬢・風俗嬢" },
      { key: "主婦", label: "主婦" },
      { key: "義母", label: "義母" },
      { key: "女教師", label: "女教師" },
      { key: "OL・職業色々", label: "OL・職業色々" },
      { key: "女子大生", label: "女子大生" },
      { key: "お母さん", label: "お母さん" },
      { key: "女子校生", label: "女子校生" },
    ],
  },

  // ---- プレイ ----
  {
    title: "プレイ",
    items: [
      { key: "キス", label: "キス" },
      { key: "マッサージプレイ", label: "マッサージプレイ" },
      { key: "ロールプレイ", label: "ロールプレイ" },
      { key: "おもちゃ", label: "おもちゃ" },
      { key: "コスプレプレイ", label: "コスプレプレイ" },
      { key: "3P", label: "3P" },
      { key: "複数プレイ", label: "複数プレイ" },
      { key: "シャワー", label: "シャワー" },
      { key: "ローション", label: "ローション" },
      { key: "オイル", label: "オイル" },
      { key: "焦らし", label: "焦らし" },
      { key: "言葉責め", label: "言葉責め" },
      { key: "フェラ", label: "フェラ" },
      { key: "パイズリ", label: "パイズリ" },
      { key: "手コキ", label: "手コキ" },
      { key: "クンニ", label: "クンニ" },
      { key: "オナニー", label: "オナニー" },
      { key: "シックスナイン", label: "シックスナイン" },
      { key: "アナルセックス", label: "アナルセックス" },
      { key: "イマラチオ", label: "イマラチオ" },
      { key: "イラマチオ", label: "イラマチオ" },
      { key: "中出し", label: "中出し" },
      { key: "顔射", label: "顔射" },
      { key: "縛り・緊縛", label: "縛り・緊縛" },
      { key: "騎乗位", label: "騎乗位" },
      { key: "潮吹き", label: "潮吹き" },
      { key: "放尿・お漏らし", label: "放尿・お漏らし" },
      { key: "飲尿", label: "飲尿" },
      { key: "羞恥", label: "羞恥" },
      { key: "羞め", label: "羞め" },
      { key: "4P", label: "4P" },
      { key: "デカチン・巨根", label: "デカチン・巨根" },
      { key: "その他（プレイ）", label: "その他（プレイ）" },
      { key: "電マ", label: "電マ" },
      { key: "拘束", label: "拘束" },
      { key: "ぶっかけ", label: "ぶっかけ" },
      { key: "パンチラ", label: "パンチラ" },
      { key: "胸チラ", label: "胸チラ" },
      { key: "スパンキング", label: "スパンキング" },
      { key: "カーセックス", label: "カーセックス" },
      { key: "スカトロ", label: "スカトロ" },
      { key: "ヨガ", label: "ヨガ" },
      { key: "オナサポ", label: "オナサポ" },
    ],
  },

  // ---- その他 ----
  {
    title: "その他",
    items: [
      { key: "VR", label: "VR" },
      { key: "ハイクオリティVR", label: "ハイクオリティVR" },
      { key: "スマホ推奨", label: "スマホ推奨" },
      { key: "短尺", label: "短尺" },
      { key: "4時間以上", label: "4時間以上" },
      { key: "16時間以上", label: "16時間以上" },
      { key: "シリーズ", label: "シリーズ" },
      { key: "セット商品", label: "セット商品" },
      { key: "デジモ", label: "デジモ" },
      { key: "独占配信", label: "独占配信" },
      { key: "AI生成作品", label: "AI生成作品" },
      { key: "FANZA配信限定", label: "FANZA配信限定" },
      { key: "4K", label: "4K" },
      { key: "3D", label: "3D" },
      { key: "その他", label: "その他" },
      { key: "VR専用", label: "VR専用" },
      { key: "縦動画", label: "縦動画" },
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
      // 日本語をそのままキーとして扱う
      const k = String(it.key); 
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
  const k = String(key ?? "");
  if (k === GENRE_ALL) return "ランダム";
  return GENRE_SEO_MAP[k]?.label ?? key;
}

export function isGenreKey(v: any): v is GenreKey {
  if (v === GENRE_ALL) return true;
  return typeof v === "string";
}

export function normalizeGenreKey(v: any): string {
  if (v == null) return "";
  // 小文字化をやめてトリムのみにする
  return String(v).trim();
}