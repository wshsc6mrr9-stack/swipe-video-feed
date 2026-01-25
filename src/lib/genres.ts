// src/lib/genres.ts

export const GENRE_ALL = "ALL" as const;

/**
 * ✅ ここだけ増やせば UI も Admin も増える
 * - “未成年を連想させるワード” は入れない（安全運用）
 * - 追加したいキーがあればここに足してOK
 */
const GENRE_MAP = {
  // --- シチュエーション ---
  idol: "アイドル・芸能人",
  office: "オフィス",
  boss: "上司",
  subordinate: "部下・同僚",
  interview: "面接",
  doctor: "医者",
  nurse: "看護師",
  teacher: "教師",
  trainer: "インストラクター",
  waitress: "ウェイトレス",
  maid: "メイド",
  stewardess: "CA・スチュワーデス",
  receptionist: "受付嬢",
  masseuse: "マッサージ",
  therapist: "セラピスト",
  beauty: "エステ",
  salon: "美容室",
  clinic: "病院・クリニック",
  hotel: "ホテル",
  spa: "温泉",
  bath: "お風呂",
  home: "自宅",
  outdoor: "野外・屋外",
  travel: "旅行",
  date: "デート",
  party: "飲み会・合コン",
  neighbor: "近所・ご近所",
  family: "家族",
  couple: "カップル",
  wife: "人妻",
  milf: "熟女",
  mamaFriend: "ママ友",
  sister: "姉・妹",
  aunt: "叔母",
  stepmom: "義母",
  companion: "コンパニオン",
  cosplayCafe: "コンカフェ",
  bar: "バー",
  gym: "ジム",
  yoga: "ヨガ",
  dance: "ダンス",
  drama: "ドラマ",
  documentary: "ドキュメンタリー",
  fantasy: "ファンタジー",
  horror: "ホラー",
  parody: "パロディ",
  howto: "How To",
  prank: "イタズラ",
  otaku: "オタク",
  yanki: "ヤンキー",
  gal: "ギャル",
  queen: "女王様",
  princess: "お姫様",
  queen2: "女王",
  secret: "秘密",
  consultation: "相談",
  affair: "不倫",
  cheating: "浮気",
  otherSituation: "その他（シチュ）",

  // ✅ 追加（シチュ/属性寄り）
  housewife: "主婦",
  mother: "お母さん",
  ntr: "寝取り・寝取られ・NTR",
  jobsVarious: "職業いろいろ",
  refreshAdult: "リフレ（成人）",
  femaleInvestigator: "女捜査官",
  romance: "恋愛",

  // --- タイプ（体型・雰囲気など） ---
  cute: "可愛い",
  cool: "クール",
  sexy: "セクシー",
  innocent: "清楚",
  glamorous: "グラマラス",
  slender: "スレンダー",
  curvy: "グラマー",
  petite: "小柄",
  tall: "長身",
  athletic: "アスリート",
  muscular: "筋肉",
  chubby: "ぽっちゃり",
  bigBreasts: "巨乳",
  smallBreasts: "微乳・貧乳",
  bigButt: "巨尻",
  thick: "むっちり",
  mature: "大人っぽい",
  model: "モデル系",
  asian: "アジア系",
  western: "欧米系",
  otherType: "その他（タイプ）",

  // ✅ 追加（タイプ/フェチ寄り）
  bigBoobsFetish: "巨乳フェチ",
  assFetish: "尻フェチ",
  shaved: "パイパン",
  miniType: "ミニ系",
  pov: "主観",
  sweaty: "汗だく",

  // ✅ 追加（今回の抜け）
  oneesan: "お姉さん",
  superBreasts: "超乳",

  // --- コスチューム ---
  cosplay: "コスプレ",
  uniform: "制服",
  sailor: "セーラー服",
  swimsuit: "水着",
  schoolSwim: "競泳・スクール水着",
  bodysuit: "ボディコン",
  lingerie: "ランジェリー",
  apron: "エプロン",
  nudeApron: "裸エプロン",
  bunny: "バニー",
  mask: "覆面・マスク",
  glasses: "めがね",
  tights: "パンスト・タイツ",
  kneeSocks: "ニーソックス",
  leotard: "レオタード",
  kimono: "和服・浴衣",
  sportswear: "体操着",
  businessSuit: "ビジネススーツ",
  otherCostume: "その他（コス）",

  // --- ジャンル（作品の方向性） ---
  action: "アクション",
  anime: "アニメ",
  classic: "クラシック",
  sm: "SM",
  gag: "ギャグ・コメディ",
  schoolGenre: "学園もの（成人設定）",
  collaboration: "コラボ作品",
  compilation: "ベスト・総集編",
  debut: "デビュー作品",
  single: "単体作品",
  sf: "SF",
  imageVideo: "イメージビデオ",
  imageVideoMale: "イメージビデオ（男性）",
  fetish: "フェチ",
  footFetish: "脚・足フェチ",
  documentary2: "ドキュメント系",
  otherGenre: "その他（ジャンル）",

  // ✅ 追加（方向性）
  amateur: "素人",
  planned: "企画",
  otherFetish: "その他フェチ",

  // --- プレイ（※強いワードは避けて“一般寄り”に） ---
  kiss: "キス",
  massagePlay: "マッサージプレイ",
  roleplay: "ロールプレイ",
  toys: "おもちゃ",
  cosplayPlay: "コスプレプレイ",
  threesome: "3P",
  orgy: "複数プレイ",
  shower: "シャワー",
  lotion: "ローション",
  oil: "オイル",
  teasing: "焦らし",
  dirtyTalk: "言葉責め",
  otherPlay: "その他（プレイ）",

  // ✅ 追加（プレイ）
  fellatio: "フェラ",
  paizuri: "パイズリ",
  handjob: "手コキ",
  cunnilingus: "クンニ",
  masturbation: "オナニー",
  sixtyNine: "シックスナイン",
  analSex: "アナルセックス",
  deepthroat: "イマラチオ",

  creampie: "中出し",
  facial: "顔射",

  bondage: "縛り・緊縛",
  cowgirl: "騎乗位",
  squirting: "潮吹き",

  urination: "放尿・お漏らし",
  drinkingUrine: "飲尿",

  humiliation: "羞恥",
  miserable: "惨め",

  fourP: "4P",
  bigCock: "デカチン・巨根",

  // --- その他 ---
  vr: "VR",
  highQualityVR: "ハイクオリティVR",
  smartphone: "スマホ推奨",
  short: "短尺",
  long4h: "4時間以上",
  long16h: "16時間以上",
  series: "シリーズ",
  set: "セット商品",
  demo: "デジモ",
  exclusive: "独占配信",
  ai: "AI生成作品",
  fanzaLimited: "FANZA配信限定",
  fourK: "4K",
  threeD: "3D",
  other: "その他",

  // ✅ 置き換え（成人明記：誤解されやすい単語は安全側へ）
  tabooAdult: "淫乱",
  cuteAdult: "美少女",
  schoolStyleAdult: "女子校",
} as const;

export type GenreKey = typeof GENRE_ALL | keyof typeof GENRE_MAP;

export type GenreGroup = {
  title: string;
  items: { key: Exclude<GenreKey, typeof GENRE_ALL>; label: string }[];
};

// ✅ 表（グリッド）に出す並びはここ
export const GENRE_GROUPS: GenreGroup[] = [
  {
    title: "シチュエーション",
    items: [
      { key: "idol", label: GENRE_MAP.idol },
      { key: "office", label: GENRE_MAP.office },
      { key: "boss", label: GENRE_MAP.boss },
      { key: "subordinate", label: GENRE_MAP.subordinate },
      { key: "interview", label: GENRE_MAP.interview },
      { key: "doctor", label: GENRE_MAP.doctor },
      { key: "nurse", label: GENRE_MAP.nurse },
      { key: "teacher", label: GENRE_MAP.teacher },
      { key: "trainer", label: GENRE_MAP.trainer },
      { key: "waitress", label: GENRE_MAP.waitress },
      { key: "maid", label: GENRE_MAP.maid },
      { key: "stewardess", label: GENRE_MAP.stewardess },
      { key: "receptionist", label: GENRE_MAP.receptionist },
      { key: "masseuse", label: GENRE_MAP.masseuse },
      { key: "beauty", label: GENRE_MAP.beauty },
      { key: "clinic", label: GENRE_MAP.clinic },
      { key: "hotel", label: GENRE_MAP.hotel },
      { key: "spa", label: GENRE_MAP.spa },
      { key: "bath", label: GENRE_MAP.bath },
      { key: "home", label: GENRE_MAP.home },
      { key: "outdoor", label: GENRE_MAP.outdoor },
      { key: "travel", label: GENRE_MAP.travel },
      { key: "date", label: GENRE_MAP.date },
      { key: "party", label: GENRE_MAP.party },
      { key: "neighbor", label: GENRE_MAP.neighbor },
      { key: "couple", label: GENRE_MAP.couple },
      { key: "wife", label: GENRE_MAP.wife },
      { key: "milf", label: GENRE_MAP.milf },
      { key: "mamaFriend", label: GENRE_MAP.mamaFriend },
      { key: "sister", label: GENRE_MAP.sister },
      { key: "aunt", label: GENRE_MAP.aunt },
      { key: "stepmom", label: GENRE_MAP.stepmom },
      { key: "companion", label: GENRE_MAP.companion },
      { key: "cosplayCafe", label: GENRE_MAP.cosplayCafe },
      { key: "drama", label: GENRE_MAP.drama },
      { key: "documentary", label: GENRE_MAP.documentary },
      { key: "fantasy", label: GENRE_MAP.fantasy },
      { key: "horror", label: GENRE_MAP.horror },
      { key: "parody", label: GENRE_MAP.parody },
      { key: "howto", label: GENRE_MAP.howto },
      { key: "prank", label: GENRE_MAP.prank },
      { key: "otaku", label: GENRE_MAP.otaku },
      { key: "yanki", label: GENRE_MAP.yanki },
      { key: "gal", label: GENRE_MAP.gal },
      { key: "queen", label: GENRE_MAP.queen },
      { key: "princess", label: GENRE_MAP.princess },
      { key: "secret", label: GENRE_MAP.secret },
      { key: "consultation", label: GENRE_MAP.consultation },
      { key: "affair", label: GENRE_MAP.affair },
      { key: "cheating", label: GENRE_MAP.cheating },

      // ✅ 追加（シチュ/属性）
      { key: "housewife", label: GENRE_MAP.housewife },
      { key: "mother", label: GENRE_MAP.mother },
      { key: "ntr", label: GENRE_MAP.ntr },
      { key: "jobsVarious", label: GENRE_MAP.jobsVarious },
      { key: "refreshAdult", label: GENRE_MAP.refreshAdult },
      { key: "femaleInvestigator", label: GENRE_MAP.femaleInvestigator },
      { key: "romance", label: GENRE_MAP.romance },

      // ✅ 置き換え（成人明記）
      { key: "tabooAdult", label: GENRE_MAP.tabooAdult },
      { key: "schoolStyleAdult", label: GENRE_MAP.schoolStyleAdult },

      { key: "otherSituation", label: GENRE_MAP.otherSituation },
    ],
  },
  {
    title: "タイプ",
    items: [
      { key: "cute", label: GENRE_MAP.cute },
      { key: "cool", label: GENRE_MAP.cool },
      { key: "sexy", label: GENRE_MAP.sexy },
      { key: "innocent", label: GENRE_MAP.innocent },
      { key: "glamorous", label: GENRE_MAP.glamorous },
      { key: "slender", label: GENRE_MAP.slender },
      { key: "curvy", label: GENRE_MAP.curvy },
      { key: "petite", label: GENRE_MAP.petite },
      { key: "tall", label: GENRE_MAP.tall },
      { key: "athletic", label: GENRE_MAP.athletic },
      { key: "muscular", label: GENRE_MAP.muscular },
      { key: "chubby", label: GENRE_MAP.chubby },
      { key: "bigBreasts", label: GENRE_MAP.bigBreasts },
      { key: "smallBreasts", label: GENRE_MAP.smallBreasts },

      // ✅ 追加（今回の抜け）
      { key: "superBreasts", label: GENRE_MAP.superBreasts },

      { key: "bigButt", label: GENRE_MAP.bigButt },
      { key: "thick", label: GENRE_MAP.thick },
      { key: "mature", label: GENRE_MAP.mature },

      // ✅ 追加（今回の抜け）
      { key: "oneesan", label: GENRE_MAP.oneesan },

      { key: "model", label: GENRE_MAP.model },
      { key: "asian", label: GENRE_MAP.asian },
      { key: "western", label: GENRE_MAP.western },

      // ✅ 追加（タイプ/フェチ）
      { key: "bigBoobsFetish", label: GENRE_MAP.bigBoobsFetish },
      { key: "assFetish", label: GENRE_MAP.assFetish },
      { key: "shaved", label: GENRE_MAP.shaved },
      { key: "miniType", label: GENRE_MAP.miniType },
      { key: "pov", label: GENRE_MAP.pov },
      { key: "sweaty", label: GENRE_MAP.sweaty },

      // ✅ 置き換え（成人明記）
      { key: "cuteAdult", label: GENRE_MAP.cuteAdult },

      { key: "otherType", label: GENRE_MAP.otherType },
    ],
  },
  {
    title: "コスチューム",
    items: [
      { key: "cosplay", label: GENRE_MAP.cosplay },
      { key: "uniform", label: GENRE_MAP.uniform },
      { key: "sailor", label: GENRE_MAP.sailor },
      { key: "swimsuit", label: GENRE_MAP.swimsuit },
      { key: "schoolSwim", label: GENRE_MAP.schoolSwim },
      { key: "bodysuit", label: GENRE_MAP.bodysuit },
      { key: "lingerie", label: GENRE_MAP.lingerie },
      { key: "apron", label: GENRE_MAP.apron },
      { key: "nudeApron", label: GENRE_MAP.nudeApron },
      { key: "bunny", label: GENRE_MAP.bunny },
      { key: "mask", label: GENRE_MAP.mask },
      { key: "glasses", label: GENRE_MAP.glasses },
      { key: "tights", label: GENRE_MAP.tights },
      { key: "kneeSocks", label: GENRE_MAP.kneeSocks },
      { key: "leotard", label: GENRE_MAP.leotard },
      { key: "kimono", label: GENRE_MAP.kimono },
      { key: "sportswear", label: GENRE_MAP.sportswear },
      { key: "businessSuit", label: GENRE_MAP.businessSuit },
      { key: "otherCostume", label: GENRE_MAP.otherCostume },
    ],
  },
  {
    title: "ジャンル",
    items: [
      { key: "action", label: GENRE_MAP.action },
      { key: "anime", label: GENRE_MAP.anime },
      { key: "classic", label: GENRE_MAP.classic },
      { key: "sm", label: GENRE_MAP.sm },
      { key: "gag", label: GENRE_MAP.gag },
      { key: "schoolGenre", label: GENRE_MAP.schoolGenre },
      { key: "collaboration", label: GENRE_MAP.collaboration },
      { key: "compilation", label: GENRE_MAP.compilation },
      { key: "debut", label: GENRE_MAP.debut },
      { key: "single", label: GENRE_MAP.single },
      { key: "sf", label: GENRE_MAP.sf },
      { key: "imageVideo", label: GENRE_MAP.imageVideo },
      { key: "imageVideoMale", label: GENRE_MAP.imageVideoMale },
      { key: "fetish", label: GENRE_MAP.fetish },
      { key: "footFetish", label: GENRE_MAP.footFetish },
      { key: "documentary2", label: GENRE_MAP.documentary2 },

      // ✅ 追加
      { key: "amateur", label: GENRE_MAP.amateur },
      { key: "planned", label: GENRE_MAP.planned },
      { key: "otherFetish", label: GENRE_MAP.otherFetish },

      { key: "otherGenre", label: GENRE_MAP.otherGenre },
    ],
  },
  {
    title: "プレイ",
    items: [
      { key: "kiss", label: GENRE_MAP.kiss },
      { key: "massagePlay", label: GENRE_MAP.massagePlay },
      { key: "roleplay", label: GENRE_MAP.roleplay },
      { key: "toys", label: GENRE_MAP.toys },
      { key: "cosplayPlay", label: GENRE_MAP.cosplayPlay },
      { key: "threesome", label: GENRE_MAP.threesome },
      { key: "orgy", label: GENRE_MAP.orgy },
      { key: "shower", label: GENRE_MAP.shower },
      { key: "lotion", label: GENRE_MAP.lotion },
      { key: "oil", label: GENRE_MAP.oil },
      { key: "teasing", label: GENRE_MAP.teasing },
      { key: "dirtyTalk", label: GENRE_MAP.dirtyTalk },

      // ✅ 追加（プレイ）
      { key: "fellatio", label: GENRE_MAP.fellatio },
      { key: "paizuri", label: GENRE_MAP.paizuri },
      { key: "handjob", label: GENRE_MAP.handjob },
      { key: "cunnilingus", label: GENRE_MAP.cunnilingus },
      { key: "masturbation", label: GENRE_MAP.masturbation },
      { key: "sixtyNine", label: GENRE_MAP.sixtyNine },
      { key: "analSex", label: GENRE_MAP.analSex },
      { key: "deepthroat", label: GENRE_MAP.deepthroat },

      { key: "creampie", label: GENRE_MAP.creampie },
      { key: "facial", label: GENRE_MAP.facial },

      { key: "bondage", label: GENRE_MAP.bondage },
      { key: "cowgirl", label: GENRE_MAP.cowgirl },
      { key: "squirting", label: GENRE_MAP.squirting },

      { key: "urination", label: GENRE_MAP.urination },
      { key: "drinkingUrine", label: GENRE_MAP.drinkingUrine },

      { key: "humiliation", label: GENRE_MAP.humiliation },
      { key: "miserable", label: GENRE_MAP.miserable },

      { key: "fourP", label: GENRE_MAP.fourP },
      { key: "bigCock", label: GENRE_MAP.bigCock },

      { key: "otherPlay", label: GENRE_MAP.otherPlay },
    ],
  },
  {
    title: "その他",
    items: [
      { key: "vr", label: GENRE_MAP.vr },
      { key: "highQualityVR", label: GENRE_MAP.highQualityVR },
      { key: "smartphone", label: GENRE_MAP.smartphone },
      { key: "short", label: GENRE_MAP.short },
      { key: "long4h", label: GENRE_MAP.long4h },
      { key: "long16h", label: GENRE_MAP.long16h },
      { key: "series", label: GENRE_MAP.series },
      { key: "set", label: GENRE_MAP.set },
      { key: "demo", label: GENRE_MAP.demo },
      { key: "exclusive", label: GENRE_MAP.exclusive },
      { key: "ai", label: GENRE_MAP.ai },
      { key: "fanzaLimited", label: GENRE_MAP.fanzaLimited },
      { key: "fourK", label: GENRE_MAP.fourK },
      { key: "threeD", label: GENRE_MAP.threeD },
      { key: "other", label: GENRE_MAP.other },
    ],
  },
];

export function genreLabel(key: GenreKey) {
  if (key === GENRE_ALL) return "ランダム";
  return (GENRE_MAP as any)[key] ?? String(key);
}

export function isGenreKey(v: any): v is GenreKey {
  if (v === GENRE_ALL) return true;
  return (
    typeof v === "string" && Object.prototype.hasOwnProperty.call(GENRE_MAP, v)
  );
}
