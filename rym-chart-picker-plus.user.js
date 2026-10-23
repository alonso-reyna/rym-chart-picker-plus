// ==UserScript==
// @name         RYM Chart Picker+
// @namespace    https://github.com/alonso-reyna/rym-chart-picker-plus
// @version      1.3.1
// @homepageURL  https://github.com/alonso-reyna/rym-chart-picker-plus
// @supportURL   https://github.com/alonso-reyna/rym-chart-picker-plus/issues
// @updateURL    https://raw.githubusercontent.com/alonso-reyna/rym-chart-picker-plus/main/rym-chart-picker-plus.user.js
// @downloadURL  https://raw.githubusercontent.com/alonso-reyna/rym-chart-picker-plus/main/rym-chart-picker-plus.user.js
// @description  Pick release metadata on RYM, edit charts in place, filter by your most compatible users, and open a matching chart. Fork of Lin808's RYM Music Chart Picker.
// @author       alonsoreyna (fork of Lin808)
// @match        https://rateyourmusic.com/release/*
// @match        https://www.rateyourmusic.com/release/*
// @match        https://rateyourmusic.com/charts/*
// @match        https://www.rateyourmusic.com/charts/*
// @match        https://rateyourmusic.com/find_similar_users*
// @match        https://www.rateyourmusic.com/find_similar_users*
// @match        https://rateyourmusic.com/list/*
// @match        https://www.rateyourmusic.com/list/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @noframes
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  // Same key as the original script so existing settings carry over.
  const STORAGE_KEY = "rym_chart_picker_settings_v16";
  const COMPAT_KEY = "rym_chart_picker_compat_v1";
  const COMPAT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  // ---------------------------------------------------------------------------
  // Static tables
  // ---------------------------------------------------------------------------

  const LISTING_OPTIONS = [
    ["top", "Top"],
    ["popular", "Popular"],
    ["esoteric", "Esoteric"],
    ["diverse", "Diverse"]
  ];

  // One table for release types: the URL slug RYM uses, the label we show and
  // every spelling we may meet on a release page or in a URL.
  const RELEASE_TYPES = [
    { slug: "album", label: "Album", aliases: ["album"] },
    { slug: "ep", label: "EP", aliases: ["ep"] },
    { slug: "comp", label: "Compilation", aliases: ["compilation", "comp"] },
    { slug: "single", label: "Single", aliases: ["single"] },
    { slug: "video", label: "Video", aliases: ["video"] },
    {
      slug: "unauth",
      label: "Bootleg / Unauthorized",
      aliases: [
        "unauthorized", "unauthorised", "unauth", "bootleg",
        "bootleg unauthorized", "bootleg unauthorised",
        "unauthorized bootleg", "unauthorised bootleg"
      ]
    },
    { slug: "mixtape", label: "Mixtape", aliases: ["mixtape"] },
    { slug: "musicvideo", label: "Music video", aliases: ["music video", "musicvideo"] },
    { slug: "djmix", label: "DJ Mix", aliases: ["dj mix", "djmix"] },
    {
      slug: "additional",
      label: "Additional",
      aliases: ["additional", "additional release", "add release"]
    }
  ];

  const ALL_TYPE_SEGMENT = RELEASE_TYPES.map(type => type.slug).join(",");

  // Same grid and shortcuts RYM shows in its own chart filter ("Music releases").
  const TYPE_GRID = [
    ["album", "ep", "mixtape", "djmix"],
    ["single", "comp", "video", "unauth"],
    ["musicvideo", "additional"]
  ];
  const TYPE_PRESETS = {
    all: RELEASE_TYPES.map(type => type.slug),
    main: ["album", "ep", "mixtape", "djmix"],
    albums: ["album"],
    singles: ["single"]
  };

  const TYPE_BY_ALIAS = new Map();
  for (const type of RELEASE_TYPES) {
    TYPE_BY_ALIAS.set(type.slug, type);
    for (const alias of type.aliases) TYPE_BY_ALIAS.set(alias, type);
  }

  const HIGHLIGHT_COLORS = [
    ["#ffb000", "Amber"], ["#f6d32d", "Yellow"], ["#ff7a00", "Orange"],
    ["#e01b24", "Red"], ["#ff4f8b", "Pink"], ["#c061cb", "Purple"],
    ["#813d9c", "Deep purple"], ["#1c71d8", "Blue"], ["#3584e4", "Light blue"],
    ["#26a269", "Green"], ["#33d17a", "Light green"], ["#2ec27e", "Mint"],
    ["#00a79d", "Teal"], ["#62a0ea", "Sky"], ["#c0bfbc", "Silver"],
    ["#77767b", "Gray"], ["#f66151", "Coral"], ["#e66100", "Dark orange"],
    ["#b5835a", "Brown"], ["#99c1f1", "Soft blue"], ["#dc8add", "Soft purple"],
    ["#8ff0a4", "Soft green"], ["#f9f06b", "Soft yellow"], ["#ffffff", "White"]
  ];

  const LANGUAGE_DATA = `
aa|Afar|Afaraf|
am|Amharic|አማርኛ|
ar|Arabic|العربية|
ha|Hausa|Hausa, هَوُسَ|
he|Hebrew|עברית|Hebrew modern, Modern Hebrew
mt|Maltese|Malti|
om|Oromo|Afaan Oromoo|
so|Somali|Soomaaliga, af Soomaali|
ti|Tigrinya|ትግርኛ|
oj|Ojibwa|ᐊᓂᔑᓈᐯᒧᐎᓐ|
cr|Cree|ᓀᐦᐃᔭᐍᐏᐣ|
mn|Mongolian|монгол|
tk|Turkmen|Türkmen, Түркмен|
tr|Turkish|Türkçe|
tt|Tatar|татарча, tatarça, تاتارچا|
ug|Uyghur|Uyƣurqə, ئۇيغۇرچە|Uighur
uz|Uzbek|O'zbek, Ўзбек, أۇزبېك|
km|Khmer|ភាសាខ្មែរ|
vi|Vietnamese|Tiếng Việt|
ch|Chamorro|Chamoru|
fj|Fijian|vosa Vakaviti|
ho|Hiri Motu|Hiri Motu|
id|Indonesian|Bahasa Indonesia|
jv|Javanese|basa Jawa|
mg|Malagasy|Malagasy fiteny|
ms|Malay|bahasa Melayu, بهاس ملايو|
mi|Māori|te reo Māori|Maori
mh|Marshallese|Kajin M̧ajeļ|
na|Nauru|Ekakairũ Naoero|
sm|Samoan|gagana fa'a Samoa|
su|Sundanese|Basa Sunda|
tl|Tagalog|Wikang Tagalog|
to|Tonga|faka Tonga|Tonga Islands
ty|Tahitian|Reo Tahiti|
ay|Aymara|aymar aru|
eo|Esperanto|Esperanto|
ia|Interlingua|Interlingua|
ie|Interlingue|Occidental|
io|Ido|Ido|
vo|Volapük|Volapük|Volapuk
bi|Bislama|Bislama|
ht|Haitian Creole|Kreyòl ayisyen|Haitian
sg|Sango|yângâ tî sängö|
nv|Navajo|Diné bizaad|Navaho
kn|Kannada|ಕನ್ನಡ|
ml|Malayalam|മലയാളം|
ta|Tamil|தமிழ்|
te|Telugu|తెలుగు|
ik|Inupiaq|Iñupiaq, Iñupiatun|
iu|Inuktitut|ᐃᓄᒃᑎᑐᑦ|
kl|Kalaallisut|kalaallisut, kalaallit oqaasii|Greenlandic
et|Estonian|eesti, eesti keel|
fi|Finnish|suomi, suomen kieli|
hu|Hungarian|Magyar|
kv|Komi|коми кыв|
af|Afrikaans|Afrikaans|
sq|Albanian|Shqip|
an|Aragonese|Aragonés|
hy|Armenian|Հայերեն|
as|Assamese|অসমীয়া|
ae|Avestan|avesta|
be|Belarusian|Беларуская|
bn|Bengali|বাংলা|
bh|Bihari|भोजपुरी|
bs|Bosnian|bosanski jezik|
br|Breton|brezhoneg|
bg|Bulgarian|български език|
ca|Catalan|Català|Valencian
kw|Cornish|Kernewek|
co|Corsican|corsu, lingua corsa|
hr|Croatian|hrvatski|
cs|Czech|česky, čeština|
da|Danish|dansk|
dv|Divehi|ދިވެހި|Dhivehi, Maldivian
nl|Dutch|Nederlands, Vlaams|
en|English|English|
fo|Faroese|føroyskt|
fr|French|français, langue française|
gl|Galician|Galego|
de|German|Deutsch|
el|Greek|Ελληνικά|Greek Modern, Modern Greek
gu|Gujarati|ગુજરાતી|
hi|Hindi|हिन्दी, हिंदी|
ga|Irish|Gaeilge|
is|Icelandic|Íslenska|
it|Italian|Italiano|
ks|Kashmiri|कश्मीरी, كشميري|
ku|Kurdish|Kurdî, كوردی|
gv|Manx|Gaelg, Gailck|
mr|Marathi|मराठी|
nb|Norwegian Bokmål|Norsk bokmål|Norwegian Bokmal
cu|Old Church Slavonic|ѩзыкъ словѣньскъ|Church Slavic, Church Slavonic, Old Bulgarian, Old Slavonic
gd|Scottish Gaelic|Gàidhlig|Gaelic
es|Spanish|español, castellano|Castilian
sv|Swedish|svenska|
wa|Walloon|Walon|
la|Latin|latine, lingua latina|
lb|Luxembourgish|Lëtzebuergesch|Letzeburgesch
li|Limburgish|Limburgs|Limburgan, Limburger
lt|Lithuanian|lietuvių kalba|
lv|Latvian|latviešu valoda|
mk|Macedonian|македонски јазик|
ne|Nepali|नेपाली|
nn|Norwegian Nynorsk|Norsk nynorsk|
no|Norwegian|Norsk|
oc|Occitan|Occitan|
or|Oriya|ଓଡ଼ିଆ|
os|Ossetian|ирон æвзаг|Ossetic
pa|Punjabi|ਪੰਜਾਬੀ, پنجابی|Panjabi
pi|Pāli|पाऴि|Pali
fa|Persian|فارسی|
pl|Polish|polski|
ps|Pashto|پښتو|Pushto
pt|Portuguese|Português|
rm|Romansh|rumantsch grischun|
ro|Romanian|română|Moldavian, Moldovan
ru|Russian|русский язык|
sa|Sanskrit|संस्कृतम्|
sc|Sardinian|sardu|
sd|Sindhi|सिन्धी, سنڌي، سندھی|
sr|Serbian|српски језик|
si|Sinhala|සිංහල|Sinhalese
sk|Slovak|slovenčina|
sl|Slovene|slovenščina|
tg|Tajik|тоҷикӣ, toğikī, تاجیکی|
uk|Ukrainian|українська|
ur|Urdu|اردو|
cy|Welsh|Cymraeg|
fy|Western Frisian|Frysk|
yi|Yiddish|ייִדיש|
ja|Japanese|日本語|
eu|Basque|euskara, euskera|
ko|Korean|한국어, 조선말|
qu|Quechua|Runa Simi, Kichwa|
ak|Akan|Akan|
bm|Bambara|bamanankan|
ny|Chichewa|chiCheŵa, chinyanja|Chewa, Nyanja
ee|Ewe|Eʋegbe|
ff|Fula|Fulfulde, Pulaar, Pular|Fulah, Pulaar, Pular
hz|Herero|Otjiherero|
ig|Igbo|Asụsụ Igbo|
ki|Kikuyu|Gĩkũyũ|Gikuyu
rw|Kinyarwanda|Ikinyarwanda|
kg|Kongo|KiKongo|
kj|Kwanyama|Kuanyama|
lg|Luganda|Luganda|
ln|Lingala|Lingála|
lu|Luba-Katanga||
nd|North Ndebele|isiNdebele|
ng|Ndonga|Owambo|
nr|South Ndebele|isiNdebele|
rn|Kirundi|kiRundi|
sn|Shona|chiShona|
st|Southern Sotho|Sesotho|
sw|Swahili|Kiswahili|
ss|Swati|SiSwati|
tn|Tswana|Setswana|
ts|Tsonga|itsonga|
ve|Venda|Tshivenḓa|
wo|Wolof|Wollof|
xh|Xhosa|isiXhosa|
yo|Yoruba|Yorùbá|
zu|Zulu|isiZulu|
kr|Kanuri|Kanuri|
av|Avaric|авар мацӀ, магӀарул мацӀ|
ce|Chechen|нохчийн мотт|
ab|Abkhaz|аҧсуа|
my|Burmese|ဗမာစာ|
zh|Chinese|中文, 汉语, 漢語|
dz|Dzongkha|རྫོང་ཁ|
ii|Nuosu|ꆈꌠ꒿ Nuosuhxop|
bo|Tibetan|བོད་ཡིག|Tibetan Standard, Central Tibetan
ka|Georgian|ქართული|
lo|Lao|ພາສາລາວ|
th|Thai|ไทย|
za|Zhuang|Saɯ cueŋƅ, Saw cuengh|Chuang
gn|Guaraní|Avañe'ẽ|Guarani
az|Azerbaijani|azərbaycan dili|
ba|Bashkir|башҡорт теле|
cv|Chuvash|чӑваш чӗлхи|
kk|Kazakh|Қазақ тілі|
ky|Kyrgyz|кыргыз тили|Kirghiz
se|Northern Sami|Davvisámegiella|
  `;

  const ALL_LANGUAGE_OPTIONS = LANGUAGE_DATA
    .trim()
    .split("\n")
    .map(line => {
      const [code, name, nativeName = "", aliasesRaw = ""] = line.split("|");
      return {
        code: code.trim(),
        name: name.trim(),
        nativeName: nativeName.trim(),
        aliases: aliasesRaw.split(",").map(alias => alias.trim()).filter(Boolean)
      };
    });

  const POPULAR_LANGUAGE_CODES = [
    "en", "ja", "es", "da", "fr", "no", "de", "fi", "pt", "sv",
    "it", "nl", "ko", "pl", "zh", "tr", "ru", "ar", "id", "hi"
  ];

  const LANGUAGE_BY_CODE = new Map(ALL_LANGUAGE_OPTIONS.map(language => [language.code, language]));

  const POPULAR_LANGUAGE_OPTIONS = POPULAR_LANGUAGE_CODES
    .map(code => LANGUAGE_BY_CODE.get(code))
    .filter(Boolean);

  const LANGUAGE_MAP = buildLanguageMap();

  const DEFAULT_SETTINGS = {
    listingMode: "top",
    defaultTypeMode: "page",
    defaultTypeCustom: [],
    userFilters: ["all"],
    otherUsername: "",
    ownUsername: "",
    defaultLanguageMode: "all",
    defaultLanguageCustom: [],
    theme: "night",
    placementMode: "page",
    screenPosition: "top-right",
    selectionStyle: "text",
    highlightColor: "#ffb000",
    influencesAll: true,
    compatTopN: 10,
    compatMinScore: 0,
    compatMinScoreV2: true,
    compatIncludeMe: false,
    compatExcluded: [],
    listSearchType: "l",
    listFetchDelayMs: 3000,
    listFetchMax: 25
  };

  // ---------------------------------------------------------------------------
  // Pure helpers (no DOM). Exported for tests when loaded under node.
  // ---------------------------------------------------------------------------

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function cleanMetadataToken(value) {
    return cleanText(value).replace(/^,/, "").replace(/,$/, "").trim();
  }

  function cleanDescriptorToken(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/^descriptors\s*/i, "")
      .replace(/^,/, "")
      .replace(/,$/, "")
      .trim();
  }

  function cleanUsername(value) {
    return String(value || "").trim().replace(/^@/, "").replace(/[^a-zA-Z0-9._-]/g, "");
  }

  function normalizeTypeText(value) {
    return cleanText(value).toLowerCase().replace(/[\/_-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function typeFromText(value) {
    return TYPE_BY_ALIAS.get(normalizeTypeText(value)) || null;
  }

  function typeLabel(slug) {
    const type = TYPE_BY_ALIAS.get(slug);
    return type ? type.label : slug;
  }

  function rymSlug(value) {
    return String(value)
      .trim()
      .toLowerCase()
      // RYM glues "&" to its neighbours: "R&B" -> "randb", "Rock & Roll" -> "rock-and-roll".
      .replace(/&/g, "and")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  }

  function slugFromGenreHref(href) {
    const match = String(href || "").match(/\/genre\/([^/?#]+)/);
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
  }

  function labelFromSlug(slug) {
    return String(slug || "")
      .split("-")
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function extractYear(value) {
    const match = String(value || "").match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
  }

  function decadeOf(year) {
    return Math.floor(year / 10) * 10;
  }

  // Year filter model: { mode: "none" | "year" | "decade" | "range", from, to }
  function emptyYear() {
    return { mode: "none", from: null, to: null };
  }

  function yearSegment(year) {
    if (!year || year.mode === "none") return "all-time";
    if (year.mode === "year") return String(year.from);
    if (year.mode === "decade") return `${decadeOf(year.from)}s`;
    if (year.mode === "range") {
      const from = Math.min(year.from, year.to);
      const to = Math.max(year.from, year.to);
      return from === to ? String(from) : `${from}-${to}`;
    }
    return "all-time";
  }

  function yearLabel(year) {
    if (!year || year.mode === "none") return "";
    if (year.mode === "year") return String(year.from);
    if (year.mode === "decade") return `${decadeOf(year.from)}s`;
    const from = Math.min(year.from, year.to);
    const to = Math.max(year.from, year.to);
    return from === to ? String(from) : `${from}–${to}`;
  }

  function parseYearSegment(segment) {
    const value = String(segment || "").trim();
    let match;
    if ((match = value.match(/^(\d{4})$/))) {
      return { mode: "year", from: Number(match[1]), to: Number(match[1]) };
    }
    if ((match = value.match(/^(\d{3}0)s$/))) {
      const from = Number(match[1]);
      return { mode: "decade", from, to: from + 9 };
    }
    if ((match = value.match(/^(\d{4})-(\d{4})$/))) {
      return { mode: "range", from: Number(match[1]), to: Number(match[2]) };
    }
    return emptyYear();
  }

  // Click on a release year cycles: year -> decade -> all time -> year ...
  function cycleYear(current, clickedYear) {
    if (!current || current.mode === "none" || current.from !== clickedYear) {
      return { mode: "year", from: clickedYear, to: clickedYear };
    }
    if (current.mode === "year") {
      return { mode: "decade", from: clickedYear, to: clickedYear };
    }
    return emptyYear();
  }

  function rangeAround(year, span) {
    const y = parseInt(year, 10);
    if (!Number.isFinite(y)) return emptyYear();
    const n = Math.max(0, parseInt(span, 10) || 0);
    return { mode: "range", from: y - n, to: y + n };
  }

  function createState() {
    return {
      page: "release",
      active: false,
      bodyOpen: false,
      settingsOpen: false,
      releaseYear: null,
      types: new Set(),
      year: emptyYear(),
      primaryGenres: new Set(),
      secondaryGenres: new Set(),
      descriptors: new Set(),
      languages: new Set(),
      genreSlugs: new Map(),
      // RYM's "must contain all": written as a leading "all" token, e.g. s:all,cloud-rap,ambient-pop
      matchAll: { primary: false, secondary: false, descriptors: false },
      urlUsers: null,
      // true when the state was parsed from a chart URL: stored defaults must not sneak in.
      fromUrl: false,
      starredShowAll: false,
      extraSegments: []
    };
  }

  // Parse /charts/{listing}/{types}/{year}/{filters...}/ into a state object.
  function parseChartPath(pathname) {
    const state = createState();
    state.page = "chart";

    const parts = String(pathname || "")
      .split("/")
      .filter(Boolean)
      .map(part => {
        try { return decodeURIComponent(part); } catch { return part; }
      });

    if (parts[0] !== "charts") return { state, listing: null };
    state.urlUsers = [];

    const listing = LISTING_OPTIONS.some(([value]) => value === parts[1]) ? parts[1] : null;

    state.fromUrl = true;
    canonicalTypeSlugs((parts[2] || "").split(",")).forEach(slug => state.types.add(slug));

    state.year = parseYearSegment(parts[3]);

    for (const part of parts.slice(4)) {
      const colon = part.indexOf(":");
      const prefix = colon === -1 ? "" : part.slice(0, colon);
      const rest = colon === -1 ? "" : part.slice(colon + 1);
      let items = rest.split(",").map(item => item.trim()).filter(Boolean);

      const matchKey = { g: "primary", s: "secondary", d: "descriptors" }[prefix];
      if (matchKey && items[0] === "all") {
        state.matchAll[matchKey] = true;
        items = items.slice(1);
      }

      if (prefix === "g" || prefix === "s") {
        const target = prefix === "g" ? state.primaryGenres : state.secondaryGenres;
        for (const slug of items) {
          const label = labelFromSlug(slug.replace(/^-/, ""));
          const display = slug.startsWith("-") ? `-${label}` : label;
          target.add(display);
          state.genreSlugs.set(display, slug);
        }
      } else if (prefix === "d") {
        items.forEach(slug => state.descriptors.add(
          slug.startsWith("-") ? "-" + labelFromSlugKeepCase(slug.slice(1)) : labelFromSlugKeepCase(slug)
        ));
      } else if (prefix === "l") {
        items.forEach(code => state.languages.add(code));
      } else if (prefix === "u") {
        state.urlUsers = items;
      } else {
        state.extraSegments.push(encodeURIComponent(part).replace(/%3A/gi, ":").replace(/%2C/gi, ","));
      }
    }

    return { state, listing };
  }

  function canonicalTypeSlugs(values) {
    const out = [];
    for (const value of Array.isArray(values) ? values : []) {
      const type = TYPE_BY_ALIAS.get(String(value || "").trim().toLowerCase());
      if (type && !out.includes(type.slug)) out.push(type.slug);
    }
    return out;
  }

  function labelFromSlugKeepCase(slug) {
    return String(slug || "").replace(/-/g, " ");
  }

  function genreSlug(state, name) {
    const known = state.genreSlugs.get(name);
    if (known) return known;
    if (name.startsWith("-")) return "-" + rymSlug(name.slice(1));
    return rymSlug(name);
  }

  function descriptorSlug(name) {
    if (name.startsWith("-")) return "-" + rymSlug(name.slice(1));
    return rymSlug(name);
  }

  function languageCode(value) {
    const raw = String(value || "").trim();
    if (LANGUAGE_BY_CODE.has(raw.toLowerCase())) return raw.toLowerCase();
    const key = normalizeLanguageKey(raw);
    return LANGUAGE_MAP.get(key) || rymSlug(raw);
  }

  function languageLabelFromCode(code) {
    const language = LANGUAGE_BY_CODE.get(code);
    return language ? language.name : code;
  }

  function buildTypeSegment(state, settings, pageTypeSlug) {
    if (state.types.size > 0) return Array.from(state.types).join(",");
    if (state.fromUrl || settings.defaultTypeMode === "all") return ALL_TYPE_SEGMENT;

    if (settings.defaultTypeMode === "custom") {
      const valid = canonicalTypeSlugs(settings.defaultTypeCustom);
      if (valid.length > 0) return valid.join(",");
    }

    return pageTypeSlug || ALL_TYPE_SEGMENT;
  }

  function buildLanguageSegment(state, settings) {
    if (state.languages.size > 0) {
      return "l:" + Array.from(state.languages).map(languageCode).join(",");
    }

    if (!state.fromUrl && settings.defaultLanguageMode === "custom" && settings.defaultLanguageCustom.length > 0) {
      const valid = settings.defaultLanguageCustom.filter(code => LANGUAGE_BY_CODE.has(code));
      return valid.length > 0 ? "l:" + valid.join(",") : "";
    }

    return "";
  }

  // Compatible users after Top N, minimum score and manual exclusions.
  // Top N distinct, non-excluded users; the (optional) minimum relative score is applied first.
  function selectCompatUsers(compat, settings) {
    const users = sanitizeCompatUsers(compat && compat.users);
    const excluded = new Set((settings.compatExcluded || []).map(name => String(name).toLowerCase()));
    const minScore = Number(settings.compatMinScore) || 0;
    const topN = Math.max(1, Number(settings.compatTopN) || 10);
    const seen = new Set();
    const picked = [];

    for (const user of users) {
      const key = user.username.toLowerCase();
      if (user.score < minScore || excluded.has(key) || seen.has(key)) continue;
      seen.add(key);
      picked.push(user);
      if (picked.length >= topN) break;
    }
    return picked;
  }

  function sanitizeCompatUsers(users) {
    if (!Array.isArray(users)) return [];
    return users
      .filter(user => user && typeof user === "object" && typeof user.username === "string" && user.username.trim())
      .map(user => ({
        username: cleanUsername(user.username),
        score: Number.isFinite(Number(user.score)) ? Number(user.score) : 0,
        rank: Number.isFinite(Number(user.rank)) ? Number(user.rank) : 0
      }))
      .filter(user => user.username);
  }

  function buildUserSegment(state, settings, context) {
    // null = not from a URL (use settings); [] = the chart URL has no user filter; [...] = reuse it.
    if (Array.isArray(state.urlUsers)) {
      return state.urlUsers.length > 0 ? "u:" + state.urlUsers.join(",") : "";
    }

    const filters = settings.userFilters || ["all"];
    if (filters.includes("all")) return "";

    const me = cleanUsername(context.ownUsername);
    const other = cleanUsername(settings.otherUsername);
    const parts = [];

    if (filters.includes("following") && me) parts.push(`followed_by:${me}`);
    if (filters.includes("followers") && me) parts.push(`followers_of:${me}`);
    if (filters.includes("myself") && me) parts.push(me);
    if (filters.includes("other") && other) parts.push(other);

    if (filters.includes("compat")) {
      const names = selectCompatUsers(context.compat, settings).map(user => user.username);
      if (settings.compatIncludeMe && me && !filters.includes("myself")) names.unshift(me);
      parts.push(...names);
    }

    const seen = new Set();
    const unique = parts.filter(part => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.length > 0 ? "u:" + unique.join(",") : "";
  }

  function buildChartUrl(state, settings, context) {
    const listing = LISTING_OPTIONS.some(([value]) => value === settings.listingMode)
      ? settings.listingMode
      : "top";

    const pieces = [
      "https://rateyourmusic.com",
      "charts",
      listing,
      buildTypeSegment(state, settings, context.pageTypeSlug),
      yearSegment(state.year)
    ];

    const allPrefix = key => (state.matchAll && state.matchAll[key] ? "all," : "");

    if (state.primaryGenres.size > 0) {
      pieces.push("g:" + allPrefix("primary") + Array.from(state.primaryGenres).map(name => genreSlug(state, name)).join(","));
    }

    if (state.descriptors.size > 0) {
      pieces.push("d:" + allPrefix("descriptors") + Array.from(state.descriptors).map(descriptorSlug).join(","));
    }

    if (state.secondaryGenres.size > 0) {
      pieces.push("s:" + allPrefix("secondary") + Array.from(state.secondaryGenres).map(name => genreSlug(state, name)).join(","));
    }

    const languageSegment = buildLanguageSegment(state, settings);
    if (languageSegment) pieces.push(languageSegment);

    const userSegment = buildUserSegment(state, settings, context);
    if (userSegment) pieces.push(userSegment);

    pieces.push(...state.extraSegments);

    return pieces.join("/") + "/";
  }

  function parseCompatDocument(doc) {
    const items = Array.from(doc.querySelectorAll("li[id^='page_user_compat_item']"));
    const users = [];

    for (const item of items) {
      const link = item.querySelector("a.user[href^='/~'], a[href^='/~']");
      if (!link) continue;

      const username = cleanUsername(link.getAttribute("href").replace(/^\/~/, ""));
      if (!username) continue;

      const bar = item.querySelector(".page_user_compat_pct");
      const width = bar ? parseFloat(bar.style.width) : NaN;
      const rankText = bar ? parseInt(cleanText(bar.textContent), 10) : NaN;

      users.push({
        username,
        score: Number.isFinite(width) ? Math.round(width * 10) / 10 : 0,
        rank: Number.isFinite(rankText) ? rankText : users.length + 1
      });
    }

    return users;
  }

  function buildLanguageMap() {
    const map = new Map();

    for (const language of ALL_LANGUAGE_OPTIONS) {
      const values = [language.code, language.name, language.nativeName, ...language.aliases];
      for (const value of values) {
        if (!value) continue;
        for (const token of splitLanguageAliases(value)) {
          const key = normalizeLanguageKey(token);
          if (key) map.set(key, language.code);
        }
      }
    }

    return map;
  }

  function splitLanguageAliases(value) {
    return String(value).split(/[;,/]/).map(part => part.trim()).filter(Boolean);
  }

  function normalizeLanguageKey(value) {
    return normalizeSearchText(value).replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[’']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function languageSearchBlob(language) {
    return normalizeSearchText([language.code, language.name, language.nativeName, ...language.aliases].join(" "));
  }

  function addUnique(array, value) {
    if (!array.includes(value)) array.push(value);
  }

  function removeValue(array, value) {
    const index = array.indexOf(value);
    if (index !== -1) array.splice(index, 1);
  }

  function toggleSetValue(set, value) {
    if (set.has(value)) set.delete(value);
    else set.add(value);
  }

  function isValidHex(value) {
    return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || "#ffb000").replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const USER_FILTER_VALUES = ["all", "following", "followers", "myself", "other", "compat"];

  function cloneDefaultSettings() {
    const out = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(out)) if (Array.isArray(out[key])) out[key] = out[key].slice();
    return out;
  }

  function normalizeSettings(parsed) {
    const defaults = cloneDefaultSettings();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaults;

    const isPrimitive = v => v === null || ["string", "number", "boolean"].includes(typeof v);
    const pick = (key, allowed) => allowed.includes(parsed[key]) ? parsed[key] : defaults[key];
    const arrayOf = key => Array.isArray(parsed[key]) ? parsed[key].filter(v => typeof v === "string") : defaults[key].slice();
    const intIn = (key, min, max) => {
      const n = isPrimitive(parsed[key]) ? parseInt(parsed[key], 10) : NaN;
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaults[key];
    };
    const str = key => (typeof parsed[key] === "string" ? parsed[key] : "");

    let userFilters = Array.from(new Set(arrayOf("userFilters").filter(v => USER_FILTER_VALUES.includes(v))));
    if (userFilters.length > 1) userFilters = userFilters.filter(v => v !== "all");
    if (userFilters.length === 0) userFilters = ["all"];

    // 1.2.0: the relative score cut used to hide most of "top N"; reset it once for old settings.
    const minScoreMigrated = parsed.compatMinScoreV2 === true;

    return {
      ...defaults,
      listingMode: pick("listingMode", LISTING_OPTIONS.map(([value]) => value)),
      defaultTypeMode: pick("defaultTypeMode", ["all", "page", "custom"]),
      defaultTypeCustom: canonicalTypeSlugs(arrayOf("defaultTypeCustom")),
      userFilters,
      otherUsername: cleanUsername(str("otherUsername")),
      ownUsername: cleanUsername(str("ownUsername")),
      defaultLanguageMode: pick("defaultLanguageMode", ["all", "custom"]),
      defaultLanguageCustom: arrayOf("defaultLanguageCustom").filter(code => LANGUAGE_BY_CODE.has(code)),
      theme: pick("theme", ["auto", "night", "evening", "light"]),
      placementMode: pick("placementMode", ["page", "screen"]),
      screenPosition: pick("screenPosition", ["top-right", "bottom-right", "top-left", "bottom-left"]),
      selectionStyle: pick("selectionStyle", ["text", "box"]),
      highlightColor: isValidHex(parsed.highlightColor) ? parsed.highlightColor : defaults.highlightColor,
      influencesAll: parsed.influencesAll !== false,
      compatTopN: intIn("compatTopN", 1, 100),
      compatMinScore: minScoreMigrated ? intIn("compatMinScore", 0, 100) : 0,
      compatMinScoreV2: true,
      compatIncludeMe: parsed.compatIncludeMe === true,
      compatExcluded: arrayOf("compatExcluded"),
      listSearchType: typeof parsed.listSearchType === "string" && parsed.listSearchType.trim() ? parsed.listSearchType.trim() : defaults.listSearchType,
      listFetchDelayMs: intIn("listFetchDelayMs", 1000, 600000),
      listFetchMax: intIn("listFetchMax", 1, 100)
    };
  }

  // ---- Lists: classification and scoring (pure) ----
  const LIST_LOG_CATEGORIES = new Set([
    "Listener's Diary", "Gamer's Diary", "Viewer's Diary", "My Life on RYM", "Autobiographical",
    "Wishlists", "Shopping List", "Upcoming", "User Stats", "Favorite Users or Friends",
    "RYM Users in Real Life", "Fans Of…", "Fans Of...", "Fans Of", "Users"
  ].map(name => cleanText(name).toLowerCase()));

  const LIST_OTHER_CATEGORIES = new Set([
    "Galleries", "Artist Galleries", "Cover Art Themes",
    "Animals", "Architecture & Edifices", "Business & Finance", "Clothing & Accessories", "Colors",
    "Culture & Ethnicity", "Drugs & Alcohol", "Fine Arts", "Food & Drink", "Graphic Design",
    "Health & Medicine", "History", "Housewares", "Media & Communication", "People", "Men", "Women",
    "Plants", "Religion & Mythology", "Science & Nature", "Spoofs & Similarities", "Sports & Games",
    "Symbols", "The Human Body", "Transportation", "Travel & Geography",
    "Release Attributes", "Release Titles", "Cover Song Versions", "Music Videos", "Humor",
    "Lists of Lists", "Projects", "Miscellaneous", "Reviews", "Front Page Reviews", "Radio", "Memoriam",
    "Lost Media", "Other Databases", "Subculture", "Fandom", "Television", "Anime", "Videos", "Books",
    "Comics", "Magazines", "Awards", "Games", "Free and Legal", "Films", "Video Games", "RYM", "RYM25"
  ].map(name => cleanText(name).toLowerCase()));

  function classifyListCategories(categories, likes) {
    const names = (Array.isArray(categories) ? categories : [])
      .map(name => cleanText(name).toLowerCase()).filter(Boolean);
    if (names.some(name => LIST_LOG_CATEGORIES.has(name))) return "log";
    if (names.some(name => LIST_OTHER_CATEGORIES.has(name))) return "other";
    if (names.length) return "curated";
    if (typeof likes !== "number" || Number.isNaN(likes)) return "unknown";
    return likes >= 3 ? "curated" : "other";
  }

  const LIST_LOG_TITLE_PATTERNS = [
    /\blogs?\b/i, /album\s*log/i, /diary/i, /journal/i, /listening/i, /listened/i, /first listens?/i, /\b20\d\d\s*:/,
    /^\W*$/, /w\.?i\.?p/i, /to listen/i, /backlog/i
  ];

  function classifyListTitle(title) {
    const text = String(title == null ? "" : title);
    return LIST_LOG_TITLE_PATTERNS.some(re => re.test(text)) ? "log" : "unknown";
  }

  function classifyList(entry) {
    const e = entry || {};
    if (e.override === "curated" || e.override === "log" || e.override === "other") return { cls: e.override, provisional: false };
    if (e.fetchedAt) {
      return { cls: classifyListCategories(e.categories, e.likes == null ? null : e.likes), provisional: false };
    }
    const cls = classifyListTitle(e.title);
    return { cls, provisional: cls === "log" };
  }

  function scoreList(entry, ctx) {
    const compat = ctx.compatUsers.has(String(entry.author || "").toLowerCase());
    const starred = ctx.starred.has(entry.key);
    return Math.log10((entry.likes || 0) + 1) * 10 + (compat ? 5 : 0) + (starred ? 100 : 0);
  }

  function sortListsByScore(entries, ctx) {
    return entries.map(entry => ({ entry, score: scoreList(entry, ctx) })).sort((a, b) =>
      b.score - a.score ||
      (b.entry.likes || 0) - (a.entry.likes || 0) ||
      String(a.entry.title || "").localeCompare(String(b.entry.title || ""))
    ).map(item => item.entry);
  }

  // ---- Lists: keys, text parsers, search URL (pure) ----
  // Href seguro para una entrada de caché/estrellas: siempre una ruta relativa /list/<user>/<slug>/.
  function safeListHref(entry) {
    return listPathKey(entry && (entry.key || entry.url)) || "#";
  }
  function listPathKey(href) {
    let path = String(href || "");
    path = path.replace(/^[a-z]+:\/\/[^/]+/i, "").replace(/[?#].*$/, "");
    const m = path.match(/^\/list\/(.+?)\/?$/);
    if (!m) return null;
    let segs = m[1].split("/");
    if (segs.some(seg => !seg)) return null;
    // /list/<user>/<slug>/ (slug may be numeric); a numeric third segment is a page number.
    if (segs.length >= 3 && /^\d+$/.test(segs[segs.length - 1])) segs = segs.slice(0, -1);
    if (segs.length !== 2) return null;
    return `/list/${segs[0].toLowerCase()}/${segs[1]}/`;
  }

  function parseListIdText(text) {
    const m = String(text || "").match(/\[List(\d+)\]/);
    return m ? Number(m[1]) : null;
  }

  function parseLikesText(text) {
    const digits = String(text || "").replace(/[^\d]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  // Receives the whole pagination text (current range plus every page link): the largest number is the list size.
  function parseItemsFromNav(text) {
    const flat = String(text || "").replace(/(\d),(?=\d{3}(?!\d))/g, "$1");
    const nums = (flat.match(/\d+/g) || []).map(Number);
    return nums.length ? Math.max(...nums) : null;
  }

  function parseItemsFromMeta(text) {
    const m = String(text || "").match(/(\d[\d,]*)\s+items?\b/i);
    return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
  }

  function buildListSearchUrl(state, settings) {
    const parts = Array.from(state.primaryGenres || []).map(labelFromSlug);
    const year = yearLabel(state.year);
    if (year) parts.push(year);
    const term = parts.join(" ").trim();
    if (!term) return null;
    const type = (settings && settings.listSearchType) || DEFAULT_SETTINGS.listSearchType;
    return `https://rateyourmusic.com/search?searchterm=${encodeURIComponent(term)}&searchtype=${type}`;
  }

  // ---- Lists: DOM parsers (browser only; take a Document) ----
  function parseListDocument(doc, url) {
    const content = doc.querySelector("#content") || doc;
    const idPara = Array.from(content.querySelectorAll("p")).find(p => /\[List\d+\]/.test(p.textContent));
    if (!idPara) return null;
    const id = parseListIdText(idPara.textContent);
    const h1 = content.querySelector("h1");
    const authorEl = content.querySelector('a.user[href^="/~"]');
    const catEls = Array.from(content.querySelectorAll('a.genre[href^="/list_classifier/"]'));
    const likeEl = doc.querySelector('span[id^="favtext_"]');
    let items = null;
    const navEls = Array.from(doc.querySelectorAll("#nav_bottom .navlinkcurrent, #nav_bottom .navlinknum"));
    if (navEls.length) items = parseItemsFromNav(navEls.map(el => el.textContent).join(" "));
    if (items == null) {
      const n = doc.querySelectorAll("#user_list td.number").length;
      items = n || null;
    }
    const key = listPathKey(url);
    return {
      key,
      id,
      url: key || url,
      title: h1 ? h1.textContent.trim() : "",
      author: authorEl ? authorEl.textContent.trim() : "",
      categories: catEls.map(a => a.textContent.trim()),
      categoryHrefs: catEls.map(a => a.getAttribute("href")),
      likes: likeEl ? parseLikesText(likeEl.textContent) : 0,
      items
    };
  }

  // null = not a user-lists page (no table.mbgen: blocked/unparsable); [] = page OK but the user has no lists.
  function parseUserListsDocument(doc) {
    if (!doc.querySelector("table.mbgen")) return null;
    const out = [];
    for (const a of doc.querySelectorAll("a.listpage_list")) {
      const href = a.getAttribute("href");
      const key = listPathKey(href);
      if (!key) continue;
      const cell = a.closest("td") || a.parentElement;
      const meta = cell ? cell.querySelector(".smallgray") : null;
      out.push({
        key,
        url: key,
        title: a.textContent.trim(),
        author: key.split("/")[2],
        items: meta ? parseItemsFromMeta(meta.textContent) : null
      });
    }
    return out;
  }

  // True when the node (or an ancestor) is page chrome or our own panel: list links there are not the native Lists block.
  function isListsExcludedNode(node) {
    for (let n = node; n; n = n.parentElement) {
      const tag = String(n.tagName || "").toLowerCase();
      const id = String(n.id || "");
      const cls = typeof n.className === "string" ? n.className : "";
      if (tag === "header" || tag === "nav") return true;
      if (id === "rym-picker-panel" || id === "page_header") return true;
      if (/(^|\s)header_/.test(cls)) return true;
      if (/header|nav/i.test(id) || /header|nav/i.test(cls)) return true;
    }
    return false;
  }

  // Fail-safe: returns null (feature off, page untouched) unless one bounded container holds >= 2 distinct list entries.
  function parseReleaseListsSection(doc) {
    const all = Array.from(doc.querySelectorAll("a[href]"));
    const cands = [];
    for (const a of all) {
      const key = listPathKey(a.getAttribute("href"));
      if (!key || !String(a.textContent || "").trim() || isListsExcludedNode(a)) continue;
      cands.push({ a, key });
    }
    const keysIn = node => new Set(cands.filter(c => node.contains(c.a)).map(c => c.key));
    const groups = new Set();
    for (const c of cands) {
      let node = c.a.parentElement;
      while (node && keysIn(node).size < 2) node = node.parentElement;
      if (node) groups.add(node);
    }
    let container = null;
    let bestKeys = 0;
    for (const node of groups) {
      const n = keysIn(node).size;
      if (n > bestKeys) {
        container = node;
        bestKeys = n;
      }
    }
    if (!container) return null;

    const tag = String(container.tagName || "").toLowerCase();
    if (tag === "html" || tag === "body" || container.id === "content" || container.id === "content_wrapper") return null;
    const inner = container.querySelectorAll("a[href]").length;
    if (all.length && inner >= 0.6 * all.length) return null;
    if (inner > 4 * bestKeys) return null;

    const groupsByKey = new Map();
    for (const c of cands) {
      if (!container.contains(c.a)) continue;
      if (!groupsByKey.has(c.key)) groupsByKey.set(c.key, c.a);
    }
    const entries = [];
    for (const [key, titled] of groupsByKey) {
      let card = titled;
      let author = null;
      let cover = null;
      for (let i = 0; i < 4; i++) {
        const parent = card.parentElement;
        if (!parent || parent === container) break;
        card = parent;
        if (!author) {
          const u = card.querySelector('a[href^="/~"]');
          if (u) author = u.textContent.trim();
        }
        if (!cover) {
          const img = card.querySelector("img[src]");
          if (img) cover = img.getAttribute("src");
        }
        if (author && cover) break;
      }
      entries.push({
        key,
        url: key,
        title: titled.textContent.trim(),
        author: author || key.split("/")[2],
        cover,
        anchor: titled
      });
    }
    return { container, entries };
  }

  const LIST_CACHE_MAX = 3000;
  const LIST_CACHE_MAX_AGE_MS = 30 * 24 * 3600 * 1000;

  const LIST_OVERRIDES = ["curated", "log", "other"];
  function validOverride(value) {
    return LIST_OVERRIDES.includes(value) ? value : null;
  }

  function isListEntryFresh(entry, now) {
    if (!entry) return false;
    if (validOverride(entry.override)) return true;
    return Number.isFinite(entry.fetchedAt) && (now - entry.fetchedAt) <= LIST_CACHE_MAX_AGE_MS;
  }

  function pruneListCache(cache, starred, now) {
    const keep = starred instanceof Set ? starred : new Set(starred || []);
    const lists = {};
    for (const [key, entry] of Object.entries((cache && cache.lists) || {})) {
      if (keep.has(key) || isListEntryFresh(entry, now)) lists[key] = entry;
    }
    const keys = Object.keys(lists);
    if (keys.length > LIST_CACHE_MAX) {
      const droppable = keys
        .filter(key => !keep.has(key) && !validOverride(lists[key].override))
        .sort((a, b) => (lists[a].fetchedAt || 0) - (lists[b].fetchedAt || 0));
      let excess = keys.length - LIST_CACHE_MAX;
      for (const key of droppable) {
        if (excess <= 0) break;
        delete lists[key];
        excess--;
      }
    }
    return { ...cache, lists };
  }

  // One resolver for F1, F2 and the list-page panel. An expired entry without override is treated as unread:
  // its category/likes/fetchedAt are not used, so it classifies by title and counts for Rate.
  const LIST_CACHED_FIELDS = ["title", "likes", "items", "categories", "override", "fetchedAt"];
  function resolveListEntry(page, cached, now) {
    const merged = { ...page };
    const fresh = isListEntryFresh(cached, now);
    if (!fresh) {
      delete merged.likes;
      delete merged.categories;
      delete merged.fetchedAt;
    }
    if (cached) {
      const fields = fresh ? LIST_CACHED_FIELDS : ["title"];
      for (const field of fields) {
        if (cached[field] !== undefined && cached[field] !== null && cached[field] !== "") merged[field] = cached[field];
      }
    }
    merged.cls = classifyList(merged);
    merged.fresh = fresh;
    return merged;
  }

  function sortStarred(items) {
    return (items || []).filter(item => item && item.key).slice().sort((a, b) => (b.starredAt || 0) - (a.starredAt || 0));
  }

  // Cross-tab merge applied right before writing. `cleared` = keys whose override this tab just removed.
  function mergeListCaches(local, remote, cleared) {
    const clr = cleared instanceof Set ? cleared : new Set(cleared || []);
    const L = (local && local.lists) || {};
    const R = (remote && remote.lists) || {};
    const lists = {};
    for (const key of new Set([...Object.keys(L), ...Object.keys(R)])) {
      const a = L[key];
      const b = R[key];
      const base = a && b ? ((b.fetchedAt || 0) > (a.fetchedAt || 0) ? b : a) : (a || b);
      const entry = { ...base };
      const override = clr.has(key) ? null : (validOverride(a && a.override) || validOverride(b && b.override));
      if (override) entry.override = override;
      else delete entry.override;
      lists[key] = entry;
    }
    const compatLists = {};
    const CL = (local && local.compatLists) || {};
    const CR = (remote && remote.compatLists) || {};
    for (const user of new Set([...Object.keys(CL), ...Object.keys(CR)])) {
      const a = CL[user];
      const b = CR[user];
      compatLists[user] = a && b ? ((b.fetchedAt || 0) > (a.fetchedAt || 0) ? b : a) : (a || b);
    }
    return { ...(local || {}), version: 1, lists, compatLists };
  }

  function mergeStarred(local, remote, removed) {
    const gone = removed instanceof Set ? removed : new Set(removed || []);
    const map = new Map();
    const feed = (remote && remote.lists) || [];
    for (const item of [...feed, ...((local && local.lists) || [])]) {
      if (!item || !item.key || gone.has(item.key)) continue;
      const prev = map.get(item.key);
      if (!prev || (item.starredAt || 0) >= (prev.starredAt || 0)) map.set(item.key, item);
    }
    return { version: 1, lists: sortStarred(Array.from(map.values())) };
  }

  // Sequential queue policy: stops at the first null result (block/unparsable), keeps what was stored before it.
  async function runFetchQueue(items, { fetchOne, store, wait, isStopped }) {
    const summary = { fetched: 0, blocked: false, blockedItem: null };
    for (let i = 0; i < items.length && !isStopped(); i++) {
      const result = await fetchOne(items[i]);
      if (!result) {
        summary.blocked = true;
        summary.blockedItem = items[i];
        break;
      }
      store(items[i], result);
      summary.fetched++;
      if (i < items.length - 1 && !isStopped()) await wait();
    }
    return summary;
  }

  const PURE_API = {
    rymSlug, slugFromGenreHref, labelFromSlug, typeFromText, typeLabel,
    yearSegment, yearLabel, parseYearSegment, cycleYear, rangeAround,
    createState, parseChartPath, buildChartUrl, selectCompatUsers, sanitizeCompatUsers, canonicalTypeSlugs,
    buildUserSegment, normalizeSettings, languageCode, parseCompatDocument,
    ALL_TYPE_SEGMENT, TYPE_GRID, TYPE_PRESETS, DEFAULT_SETTINGS,
    LIST_LOG_CATEGORIES, LIST_OTHER_CATEGORIES, classifyListCategories, classifyListTitle,
    classifyList, scoreList, sortListsByScore,
    listPathKey, safeListHref, parseListIdText, parseLikesText, parseItemsFromNav, parseItemsFromMeta, buildListSearchUrl,
    parseListDocument, parseUserListsDocument, parseReleaseListsSection,
    LIST_CACHE_MAX, LIST_CACHE_MAX_AGE_MS, pruneListCache, isListEntryFresh,
    validOverride, resolveListEntry, sortStarred, mergeListCaches, mergeStarred, runFetchQueue, isListsExcludedNode
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PURE_API;
    return;
  }

  // ---------------------------------------------------------------------------
  // Runtime: page detection, storage, panel
  // ---------------------------------------------------------------------------

  const pathname = window.location.pathname;
  const PAGE = /^\/release\//.test(pathname) ? "release"
    : /^\/charts\//.test(pathname) ? "chart"
    : /^\/find_similar_users/.test(pathname) ? "compat"
    : /^\/list\/[^/]+\/[^/]+/.test(pathname) ? "list"
    : /^\/list\/[^/]+\/?$/.test(pathname) ? "userlists"
    : null;

  if (!PAGE) return;

  if (document.getElementById("rym-picker-panel")) {
    console.warn("[RYM Chart Picker+] Another chart picker is already running on this page; disable one of them.");
    return;
  }

  const settings = loadSettings();
  let compat = loadCompat();

  if (PAGE === "compat") {
    captureCompatFromCurrentPage();
    return;
  }

  const state = PAGE === "chart" ? initChartState() : createState();
  state.page = PAGE;

  if (PAGE === "release") {
    state.releaseYear = detectReleaseYear();
    state.matchAll.secondary = settings.influencesAll;
  }

  function readStored(key) {
    const raw = GM_getValue(key, "");
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  }

  function loadSettings() {
    try {
      return normalizeSettings(readStored(STORAGE_KEY));
    } catch {
      return normalizeSettings(null);
    }
  }

  function saveSettings() {
    GM_setValue(STORAGE_KEY, JSON.stringify(settings));
  }

  function loadCompat() {
    try {
      const parsed = readStored(COMPAT_KEY);
      if (!parsed || typeof parsed !== "object") return null;
      const users = sanitizeCompatUsers(parsed.users);
      if (users.length === 0) return null;
      const forUser = cleanUsername(parsed.forUser);
      const me = getOwnUsername();
      // A list synced under another account is not ours.
      if (me && forUser && me.toLowerCase() !== forUser.toLowerCase()) return null;
      return { users, forUser, syncedAt: Number(parsed.syncedAt) || 0 };
    } catch {
      return null;
    }
  }

  function saveCompat(users, forUser) {
    compat = { users, forUser, syncedAt: Date.now() };
    GM_setValue(COMPAT_KEY, JSON.stringify(compat));
  }

  // ---------------------------------------------------------------------------
  // Lists: cache, starred, capture, sequential fetch
  // ---------------------------------------------------------------------------

  const LISTS_KEY = "rym_chart_picker_lists_v1";
  const STARRED_KEY = "rym_chart_picker_starred_lists_v1";
  let listCache = loadListCache();
  let starred = loadStarred();
  let listFetching = false;
  const clearedOverrides = new Set(); // keys whose override this tab removed since the last save
  const removedStars = new Set(); // keys unstarred in this tab since the last save

  function loadListCache() {
    try {
      const parsed = readStored(LISTS_KEY);
      if (parsed && typeof parsed === "object" && parsed.lists && typeof parsed.lists === "object") {
        return { version: 1, lists: parsed.lists, compatLists: parsed.compatLists || {} };
      }
    } catch {}
    return { version: 1, lists: {}, compatLists: {} };
  }

  function saveListCache() {
    // Another tab may have written since we loaded: merge instead of overwriting.
    const merged = mergeListCaches(listCache, loadListCache(), clearedOverrides);
    listCache = pruneListCache(merged, new Set(starred.lists.map(item => item.key)), Date.now());
    clearedOverrides.clear();
    GM_setValue(LISTS_KEY, JSON.stringify(listCache));
  }

  function loadStarred() {
    try {
      const parsed = readStored(STARRED_KEY);
      if (parsed && Array.isArray(parsed.lists)) {
        return { version: 1, lists: sortStarred(parsed.lists) };
      }
    } catch {}
    return { version: 1, lists: [] };
  }

  function saveStarred() {
    starred = mergeStarred(starred, loadStarred(), removedStars);
    removedStars.clear();
    GM_setValue(STARRED_KEY, JSON.stringify(starred));
  }

  function upsertListEntry(entry) {
    if (!entry || !entry.key) return null;
    const existing = listCache.lists[entry.key];
    const merged = { ...(existing || {}), ...entry, fetchedAt: Date.now() };
    if (existing && existing.override) merged.override = existing.override;
    listCache.lists[entry.key] = merged;
    saveListCache();
    return merged;
  }

  function setListOverride(key, cls) {
    let entry = listCache.lists[key];
    if (!entry) {
      if (!cls) return;
      entry = listCache.lists[key] = { key };
    }
    if (cls) {
      entry.override = cls;
      clearedOverrides.delete(key);
    } else {
      delete entry.override;
      clearedOverrides.add(key);
    }
    saveListCache();
  }

  function isStarred(key) {
    return starred.lists.some(item => item.key === key);
  }

  function toggleStarred(entryLike) {
    if (!entryLike || !entryLike.key) return false;
    const index = starred.lists.findIndex(item => item.key === entryLike.key);
    let nowStarred;
    if (index >= 0) {
      starred.lists.splice(index, 1);
      removedStars.add(entryLike.key);
      nowStarred = false;
    } else {
      const { key, url, title, author, likes } = entryLike;
      const item = { key, url, title, author, starredAt: Date.now() };
      if (likes !== undefined) item.likes = likes;
      starred.lists.unshift(item);
      removedStars.delete(entryLike.key);
      nowStarred = true;
    }
    saveStarred();
    return nowStarred;
  }

  function captureListFromCurrentPage() {
    const entry = parseListDocument(document, window.location.href);
    if (entry) upsertListEntry(entry);
  }

  // Sequential, user-initiated only: never call this without a click behind it.
  function fetchListsSequentially(keys, { onEach, onDone } = {}) {
    const summary = { fetched: 0, blocked: false, stopped: false };
    let stopRequested = false;
    let timerId = null;
    let wake = null;
    const handle = {
      stop() {
        stopRequested = true;
        if (timerId) clearTimeout(timerId);
        if (wake) wake();
      }
    };

    if (listFetching) {
      if (onDone) onDone({ ...summary, busy: true });
      return handle;
    }
    listFetching = true;

    (async () => {
      // Solo rutas canónicas del mismo origen: nunca se hace fetch de un href crudo.
      const queue = keys.map(listPathKey).filter(Boolean).slice(0, settings.listFetchMax);
      try {
        const result = await runFetchQueue(queue, {
          async fetchOne(url) {
            const abort = new AbortController();
            const timer = setTimeout(() => abort.abort(), 20000);
            try {
              const response = await fetch(url, { credentials: "include", signal: abort.signal });
              if (!response.ok) return null;
              const html = await response.text();
              return parseListDocument(new DOMParser().parseFromString(html, "text/html"), new URL(url, window.location.origin).href);
            } catch {
              return null;
            } finally {
              clearTimeout(timer);
            }
          },
          store(url, entry) {
            const stored = upsertListEntry(entry);
            summary.fetched++;
            if (onEach) onEach(stored);
          },
          wait: () => new Promise(resolve => {
            wake = resolve;
            timerId = setTimeout(resolve, settings.listFetchDelayMs);
          }).then(() => {
            wake = null;
            timerId = null;
          }),
          isStopped: () => stopRequested
        });
        summary.blocked = result.blocked;
      } catch (error) {
        console.warn("[RYM Chart Picker+] List fetch failed:", error);
      } finally {
        summary.stopped = stopRequested;
        listFetching = false;
        if (onDone) onDone(summary);
      }
    })();

    return handle;
  }

  if (typeof GM_addValueChangeListener === "function") {
    GM_addValueChangeListener(LISTS_KEY, (name, oldValue, newValue, remote) => {
      if (!remote) return;
      listCache = loadListCache();
      if (PAGE !== "userlists") render();
    });
    GM_addValueChangeListener(STARRED_KEY, (name, oldValue, newValue, remote) => {
      if (!remote) return;
      starred = loadStarred();
      if (PAGE !== "userlists") render();
    });
  }

  if (PAGE === "list") captureListFromCurrentPage();

  const COMPAT_LISTS_MAX_USERS = 10;

  const COMPAT_LISTS_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

  function isCompatListsFresh(entry, now) {
    return !!entry && Number.isFinite(entry.fetchedAt) && (now - entry.fetchedAt) <= COMPAT_LISTS_MAX_AGE_MS;
  }

  function storeUserLists(username, lists) {
    listCache.compatLists = listCache.compatLists || {};
    listCache.compatLists[String(username).toLowerCase()] = { fetchedAt: Date.now(), lists };
    saveListCache();
  }

  function captureUserListsFromCurrentPage() {
    const m = /^\/list\/([^/]+)\/?$/.exec(pathname);
    if (!m) return;
    const username = decodeURIComponent(m[1]).toLowerCase();
    const lists = parseUserListsDocument(document);
    if (!lists) return;
    storeUserLists(username, lists);
    toast(`Saved ${lists.length} lists by ${username}.`);
  }

  if (PAGE === "userlists") {
    captureUserListsFromCurrentPage();
    return;
  }

  // Same policy as fetchListsSequentially and the same busy flag, so the two loops never overlap.
  // Sequential, user-initiated only: never call this without a click behind it.
  function fetchUserListsSequentially(usernames, { onEach, onDone } = {}) {
    const summary = { fetched: 0, blocked: false, stopped: false, blockedUser: null };
    let stopRequested = false;
    let timerId = null;
    let wake = null;
    const handle = {
      stop() {
        stopRequested = true;
        if (timerId) clearTimeout(timerId);
        if (wake) wake();
      }
    };

    if (listFetching) {
      if (onDone) onDone({ ...summary, busy: true });
      return handle;
    }
    listFetching = true;

    (async () => {
      const queue = usernames.slice(0, COMPAT_LISTS_MAX_USERS);
      try {
        const result = await runFetchQueue(queue, {
          async fetchOne(username) {
            const abort = new AbortController();
            const timer = setTimeout(() => abort.abort(), 20000);
            try {
              const response = await fetch(`/list/${encodeURIComponent(username)}/`, { credentials: "include", signal: abort.signal });
              if (!response.ok) return null;
              const html = await response.text();
              return parseUserListsDocument(new DOMParser().parseFromString(html, "text/html"));
            } catch {
              return null;
            } finally {
              clearTimeout(timer);
            }
          },
          store(username, lists) {
            storeUserLists(username, lists);
            summary.fetched++;
            if (onEach) onEach(username, lists);
          },
          wait: () => new Promise(resolve => {
            wake = resolve;
            timerId = setTimeout(resolve, settings.listFetchDelayMs);
          }).then(() => {
            wake = null;
            timerId = null;
          }),
          isStopped: () => stopRequested
        });
        summary.blocked = result.blocked;
        summary.blockedUser = result.blockedItem;
      } catch (error) {
        console.warn("[RYM Chart Picker+] User lists fetch failed:", error);
      } finally {
        summary.stopped = stopRequested;
        listFetching = false;
        if (onDone) onDone(summary);
      }
    })();

    return handle;
  }

  function initChartState() {
    const { state: parsed, listing } = parseChartPath(pathname);
    if (listing && listing !== settings.listingMode) {
      settings.listingMode = listing;
      saveSettings();
    }
    return parsed;
  }

  function captureCompatFromCurrentPage() {
    const users = parseCompatDocument(document);
    if (users.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const forUser = cleanUsername(params.get("user")) || getOwnUsername();
    const me = getOwnUsername();

    // Only store the list when it is the logged-in user's own list.
    if (me && forUser && me.toLowerCase() !== forUser.toLowerCase()) return;

    saveCompat(users, forUser);
    toast(`Chart Picker+: saved ${users.length} compatible users.`);
  }

  function getOwnUsername() {
    if (settings.ownUsername) return settings.ownUsername;

    const link = document.querySelector('a.header_profile_main[href^="/~"], #header_extended_section a[href^="/~"]');
    if (link) return cleanUsername(link.getAttribute("href").replace(/^\/~/, ""));

    return "";
  }

  const OWN_USERNAME = getOwnUsername();

  function detectReleaseYear() {
    const row = findRowsByLabel("released")[0];
    if (!row) return null;
    return extractYear(getRowValueText(row));
  }

  function getCurrentPageTypeSlug() {
    const match = pathname.match(/^\/release\/([^/]+)\//);
    if (!match) return "";
    const type = typeFromText(match[1]);
    return type ? type.slug : "";
  }

  function buildContext() {
    return {
      ownUsername: OWN_USERNAME,
      compat,
      pageTypeSlug: getCurrentPageTypeSlug()
    };
  }

  function currentChartUrl() {
    return buildChartUrl(state, settings, buildContext());
  }

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  GM_addStyle(`
    :root {
      --rym-picker-highlight-bg: rgba(255, 176, 0, .30);
      --rym-picker-highlight-border: #ffb000;
    }

    .rym-picker-selected-target { text-decoration: none !important; }

    .rym-picker-style-box .rym-picker-selected-target {
      background-color: var(--rym-picker-highlight-bg) !important;
      box-shadow: inset 0 0 0 1px var(--rym-picker-highlight-border), 0 0 0 1px var(--rym-picker-highlight-border) !important;
      border-radius: 2px !important;
    }

    .rym-picker-style-text .rym-picker-selected-target,
    .rym-picker-style-text .rym-picker-selected-target * {
      background: transparent !important;
      box-shadow: none !important;
      color: var(--rym-picker-highlight-border) !important;
      font-weight: 700 !important;
      border-radius: 0 !important;
    }

    .rym-picker-selected-target * { text-decoration: none !important; }

    [data-rym-descriptor-token], [data-rym-type-token], [data-rym-language-token] {
      cursor: crosshair; border-radius: 2px; padding: 0 1px; display: inline;
    }

    #rym-picker-panel {
      --rym-bg: #171717; --rym-bg-2: #202020; --rym-bg-3: #2d2d2d;
      --rym-border: #3b3b3b; --rym-border-2: #555;
      --rym-text: #d7d7d7; --rym-muted: #9a9a9a; --rym-empty: #777;
      --rym-blue: #1676d2; --rym-blue-hover: #2385e5; --rym-button-text: #fff;
      --rym-chip-hover: #393939; --rym-chip-hover-border: #777;
      z-index: 500; width: 350px; max-height: calc(100vh - 32px);
      background: var(--rym-bg); border: 1px solid var(--rym-border); border-radius: 3px;
      box-shadow: 0 2px 8px rgba(0,0,0,.35); color: var(--rym-text);
      font-family: "ProximaNova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-feature-settings: "ss05" 1, "ss06" 1, "ss09" 1;
      font-size: 13px; overflow: hidden;
    }

    #rym-picker-panel.rym-placement-page { position: absolute; top: 118px; right: 22px; left: auto; bottom: auto; }
    #rym-picker-panel.rym-placement-screen { position: fixed; }
    #rym-picker-panel.rym-screen-top-right { top: 118px; right: 22px; bottom: auto; left: auto; }
    #rym-picker-panel.rym-screen-bottom-right { right: 22px; bottom: 22px; top: auto; left: auto; }
    #rym-picker-panel.rym-screen-top-left { left: 22px; top: 118px; right: auto; bottom: auto; }
    #rym-picker-panel.rym-screen-bottom-left { left: 22px; bottom: 22px; right: auto; top: auto; }

    #rym-picker-header { display: flex; width: 100%; background: var(--rym-blue); border-bottom: 1px solid rgba(255,255,255,.15); }

    #rym-picker-main-btn {
      flex: 1; border: 0; background: var(--rym-blue); color: var(--rym-button-text);
      padding: 9px 11px; font-weight: 700; cursor: pointer; text-align: left; font-size: 13px; font-family: inherit;
    }

    #rym-picker-toggle-body-btn, #rym-picker-quick-open-btn, #rym-picker-settings-btn {
      width: 40px; border: 0; border-left: 1px solid rgba(255,255,255,.25);
      background: var(--rym-blue); color: var(--rym-button-text); font-size: 14px; cursor: pointer;
      font-family: inherit; display: flex; align-items: center; justify-content: center;
    }

    #rym-picker-toggle-body-btn, #rym-picker-quick-open-btn { display: none; }
    #rym-picker-panel.rym-search-active #rym-picker-toggle-body-btn,
    #rym-picker-panel.rym-search-active #rym-picker-quick-open-btn,
    #rym-picker-panel.rym-page-chart #rym-picker-toggle-body-btn,
    #rym-picker-panel.rym-page-chart #rym-picker-quick-open-btn { display: flex; }

    #rym-picker-main-btn:hover, #rym-picker-toggle-body-btn:hover,
    #rym-picker-quick-open-btn:hover, #rym-picker-settings-btn:hover { background: var(--rym-blue-hover); }

    .rym-picker-icon { width: 15px; height: 15px; display: block; fill: currentColor; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    #rym-picker-body { display: none; padding: 11px 12px 12px; max-height: calc(100vh - 112px); overflow-y: auto; scrollbar-width: thin; background: var(--rym-bg); }
    #rym-picker-panel.rym-picker-open #rym-picker-body { display: block; }

    #rym-picker-status { margin-bottom: 9px; color: var(--rym-blue-hover); font-weight: 700; }

    .rym-picker-row { margin: 8px 0 11px; line-height: 1.35; }
    .rym-picker-label { color: var(--rym-muted); display: block; margin-bottom: 4px; font-size: 12px; }

    .rym-picker-chip {
      display: inline-block; margin: 2px 3px 2px 0; padding: 3px 7px; border-radius: 3px;
      background: var(--rym-bg-3); border: 1px solid var(--rym-border-2); color: var(--rym-text);
      cursor: pointer; max-width: 305px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .rym-picker-chip:hover { background: var(--rym-chip-hover); border-color: var(--rym-chip-hover-border); }
    .rym-picker-chip.rym-picker-chip-accent { border-color: var(--rym-blue-hover); }
    .rym-picker-chip-sub { color: var(--rym-muted); font-weight: 400; margin-left: 4px; }

    .rym-picker-inline-toggle {
      float: right; display: inline-flex; align-items: center; gap: 4px; color: var(--rym-muted);
      font-size: 11px; cursor: pointer; user-select: none;
    }
    .rym-picker-inline-toggle input { margin: 0; }
    .rym-picker-inline-toggle.rym-picker-toggle-on { color: var(--rym-text); }

    .rym-picker-compat-toggle {
      display: flex; align-items: center; gap: 7px; padding: 6px 8px; margin-bottom: 5px;
      border: 1px solid var(--rym-border-2); border-radius: 3px; background: var(--rym-bg-2);
      cursor: pointer; user-select: none; font-weight: 700;
    }
    .rym-picker-compat-toggle:hover { background: var(--rym-bg-3); }
    .rym-picker-compat-toggle.rym-picker-toggle-on { border-color: var(--rym-blue-hover); }
    .rym-picker-compat-toggle input { margin: 0; }
    .rym-picker-compat-toggle select {
      margin-left: auto; background: var(--rym-bg-3); color: var(--rym-text); border: 1px solid var(--rym-border-2);
      border-radius: 3px; padding: 2px 4px; font-size: 12px; font-family: inherit; font-weight: 400;
    }

    .rym-picker-actions { display: flex; gap: 7px; margin-top: 12px; }
    .rym-picker-action-btn {
      flex: 1; background: var(--rym-bg-3); color: var(--rym-text); border: 1px solid var(--rym-border-2);
      border-radius: 3px; padding: 7px 8px; cursor: pointer; font-weight: 700; font-family: inherit;
    }
    .rym-picker-action-btn:hover { background: var(--rym-bg-2); }
    #rym-picker-open { background: var(--rym-blue); border-color: var(--rym-blue-hover); color: var(--rym-button-text); }
    #rym-picker-open:hover { background: var(--rym-blue-hover); }

    #rym-picker-url {
      margin-top: 10px; padding: 6px 7px; border: 1px dashed var(--rym-border); border-radius: 3px;
      background: var(--rym-bg-2); color: var(--rym-muted); font-size: 11px; line-height: 1.4;
      word-break: break-all; cursor: text; user-select: all; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    #rym-picker-url:hover { color: var(--rym-text); }

    .rym-picker-active-outline { outline: 2px solid var(--rym-blue-hover) !important; outline-offset: 2px !important; cursor: crosshair !important; }

    .rym-picker-toast {
      position: fixed; right: 24px; top: 55px; background: #202020; border: 1px solid #555; color: #d7d7d7;
      padding: 8px 11px; border-radius: 3px; z-index: 9999999;
      font: 13px "ProximaNova", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 6px 18px rgba(0,0,0,.35);
    }

    .rym-picker-footer-links { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; padding-top: 2px; }
    .rym-picker-footer-link {
      display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; min-height: 32px;
      padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--rym-text) !important;
      text-decoration: none !important; line-height: 1; overflow: hidden; opacity: .92;
    }
    .rym-picker-footer-link:hover { background: var(--rym-bg-3); opacity: 1; transform: scale(1.06); }
    .rym-picker-footer-icon { width: 19px; height: 19px; display: inline-flex; align-items: center; justify-content: center; color: var(--rym-text); fill: currentColor; }
    .rym-picker-footer-icon svg { width: 19px; height: 19px; display: block; fill: currentColor; }
    .rym-picker-footer-img { width: 19px; height: 19px; display: block; object-fit: contain; }
    .rym-picker-footer-img-rym { border-radius: 50%; }

    .rym-picker-small-note { color: var(--rym-muted); font-size: 12px; margin-top: 9px; line-height: 1.35; }

    .rym-picker-type-presets {
      display: flex; justify-content: flex-end; align-items: center; gap: 6px; margin: 2px 0 5px;
      color: var(--rym-muted); font-size: 13px; user-select: none;
    }
    .rym-picker-type-presets button {
      background: none; border: 0; padding: 0; margin: 0; color: var(--rym-muted); font: inherit; cursor: pointer;
    }
    .rym-picker-type-presets button:hover { color: var(--rym-text); }
    .rym-picker-type-presets button.rym-picker-preset-on { color: var(--rym-blue-hover); font-weight: 700; }
    .rym-picker-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; }
    .rym-picker-type-cell {
      font-family: inherit; margin: 0; width: 100%; box-sizing: border-box;
      padding: 7px 1px; border: 1px solid var(--rym-border-2); border-radius: 3px; background: var(--rym-bg-2);
      color: var(--rym-text); text-align: center; font-size: 11px; line-height: 1.2; cursor: pointer; user-select: none;
      display: flex; align-items: center; justify-content: center; word-break: break-word;
    }
    .rym-picker-type-cell:hover { background: var(--rym-bg-3); }
    .rym-picker-type-cell.rym-picker-type-on { background: var(--rym-blue); border-color: var(--rym-blue); color: #fff; font-weight: 700; }
    .rym-picker-type-cell.rym-picker-type-on:hover { background: var(--rym-blue-hover); }
    .rym-picker-type-cell.rym-picker-type-wide { grid-column: span 2; }
    #rym-picker-types-note { margin-top: 5px; font-size: 11px; }
    .rym-picker-empty { color: var(--rym-empty); }

    #rym-picker-settings-block { display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid color-mix(in srgb, var(--rym-border) 65%, transparent); }
    #rym-picker-panel.rym-settings-open #rym-picker-settings-block { display: block; }

    .rym-picker-setting { margin-bottom: 13px; }
    .rym-picker-setting-title { display: block; color: var(--rym-muted); margin-bottom: 6px; font-size: 12px; font-weight: 700; }

    .rym-picker-checklist { display: grid; gap: 5px; }
    .rym-picker-checkitem {
      display: flex; align-items: center; gap: 7px; padding: 5px 7px; border: 1px solid var(--rym-border);
      border-radius: 3px; background: var(--rym-bg-2); cursor: pointer; user-select: none;
    }
    .rym-picker-checkitem:hover { background: var(--rym-bg-3); }
    .rym-picker-checkitem input { margin: 0; }
    .rym-picker-checkitem .rym-picker-chip-sub { margin-left: auto; font-size: 11px; }
    .rym-picker-two-col { grid-template-columns: 1fr 1fr; }

    .rym-picker-listing-list { display: grid; gap: 5px; }
    .rym-picker-listing-item {
      display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--rym-border);
      border-radius: 3px; background: var(--rym-bg-2); cursor: pointer; user-select: none; font-weight: 700; color: var(--rym-text);
    }
    .rym-picker-listing-item:hover { background: var(--rym-bg-3); }
    .rym-picker-listing-item input { margin: 0; }

    .rym-picker-setting select, .rym-picker-setting input[type="text"], .rym-picker-setting input[type="number"] {
      width: 100%; box-sizing: border-box; background: var(--rym-bg-2); color: var(--rym-text);
      border: 1px solid var(--rym-border-2); border-radius: 3px; padding: 6px 7px; font-size: 13px; font-family: inherit;
    }

    .rym-picker-inline-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .rym-picker-inline-fields label { display: block; color: var(--rym-muted); font-size: 11px; margin-bottom: 3px; }

    .rym-picker-language-search-row { display: flex; gap: 6px; align-items: center; }
    .rym-picker-language-search-row input { flex: 1; }

    .rym-picker-mini-btn {
      background: var(--rym-bg-3); color: var(--rym-text); border: 1px solid var(--rym-border-2); border-radius: 3px;
      padding: 6px 8px; cursor: pointer; font-family: inherit; font-weight: 700; white-space: nowrap;
    }
    .rym-picker-mini-btn:hover { background: var(--rym-bg-2); }
    .rym-picker-mini-btn.rym-picker-mini-btn-small { padding: 4px 7px; font-size: 12px; }

    .rym-language-results, .rym-compat-list {
      margin-top: 7px; max-height: 185px; overflow-y: auto; border: 1px solid var(--rym-border);
      background: var(--rym-bg-2); border-radius: 3px; scrollbar-width: thin;
    }

    .rym-language-group-title {
      padding: 6px 8px 4px; color: var(--rym-muted); font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .03em; border-top: 1px solid var(--rym-border);
    }
    .rym-language-group-title:first-child { border-top: 0; }

    .rym-language-option {
      display: block; width: 100%; box-sizing: border-box; text-align: left; border: 0; border-top: 1px solid var(--rym-border);
      background: transparent; color: var(--rym-text); padding: 6px 8px; cursor: pointer; font-family: inherit; font-size: 12px;
    }
    .rym-language-option:hover { background: var(--rym-bg-3); }
    .rym-language-option.rym-language-selected { background: var(--rym-blue); color: var(--rym-button-text); font-weight: 700; }
    .rym-language-code { color: var(--rym-muted); font-weight: 700; margin-right: 5px; }
    .rym-language-option.rym-language-selected .rym-language-code { color: var(--rym-button-text); }
    .rym-language-native { color: var(--rym-muted); font-size: 11px; margin-left: 4px; }
    .rym-language-option.rym-language-selected .rym-language-native { color: var(--rym-button-text); opacity: .82; }

    .rym-compat-item {
      display: flex; align-items: center; gap: 7px; padding: 5px 8px; border-top: 1px solid var(--rym-border);
      font-size: 12px; cursor: pointer; user-select: none;
    }
    .rym-compat-item:first-child { border-top: 0; }
    .rym-compat-item:hover { background: var(--rym-bg-3); }
    .rym-compat-item input { margin: 0; }
    .rym-compat-item.rym-compat-excluded { color: var(--rym-empty); text-decoration: line-through; }
    .rym-compat-rank { color: var(--rym-muted); width: 22px; text-align: right; }
    .rym-compat-score { margin-left: auto; color: var(--rym-muted); }

    .rym-color-palette { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; max-width: 245px; }
    .rym-color-dot {
      width: 22px; height: 22px; border-radius: 50%; border: 2px solid rgba(255,255,255,.45); cursor: pointer;
      box-shadow: 0 0 0 1px rgba(0,0,0,.4); padding: 0;
    }
    .rym-color-dot:hover { transform: scale(1.08); }
    .rym-color-dot.rym-color-selected { outline: 2px solid var(--rym-text); outline-offset: 2px; }

    .rym-picker-hidden { display: none !important; }
    .rym-picker-detected { color: var(--rym-muted); font-size: 12px; margin-top: 5px; }
    .rym-picker-default-chip-row { margin-top: 7px; }

    .rym-lists-native-hidden { display: none !important; }
    #rym-picker-lists { font-size: 13px; line-height: 1.35; }
    #rym-picker-lists .rym-lists-block-title { font-weight: 700; margin: 4px 0; }
    #rym-picker-lists .rym-lists-starred-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
    #rym-picker-lists .rym-lists-starred-item a { overflow-wrap: anywhere; }
    #rym-picker-lists .rym-lists-unstar { visibility: hidden; border: 0; background: transparent; color: inherit; cursor: pointer; margin-left: auto; }
    #rym-picker-lists .rym-lists-starred-item:hover .rym-lists-unstar { visibility: visible; }
    #rym-lists-wrap { margin: 8px 0 14px; font-size: 13px; line-height: 1.35; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-bottom: 6px; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-title { font-weight: 700; font-size: 15px; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-tab, #rym-lists-wrap .rym-lists-btn, #rym-lists-modal .rym-lists-btn {
      border: 1px solid rgba(128,128,128,.5); background: transparent; color: inherit; border-radius: 3px;
      padding: 2px 8px; font: inherit; cursor: pointer;
    }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-tab.rym-lists-tab-on { background: #1676d2; border-color: #1676d2; color: #fff; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-link { margin-left: auto; cursor: pointer; text-decoration: underline; opacity: .8; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-status { opacity: .8; margin-bottom: 6px; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-sub { font-weight: 700; margin: 8px 0 2px; opacity: .8; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-empty { opacity: .6; padding: 6px 0; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-row {
      display: flex; align-items: center; gap: 8px; padding: 4px 0; border-top: 1px solid rgba(128,128,128,.25);
    }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-cover { width: 36px; height: 36px; flex: none; background: rgba(128,128,128,.25); object-fit: cover; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-main { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; justify-content: flex-end; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-chip { padding: 0 6px; border-radius: 8px; font-size: 11px; border: 1px solid rgba(128,128,128,.5); white-space: nowrap; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-chip-log { background: #b3261e; border-color: #b3261e; color: #fff; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-chip-curated { background: #2e7d32; border-color: #2e7d32; color: #fff; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-chip-other { background: #777; border-color: #777; color: #fff; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) .rym-lists-star { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 16px; padding: 0 2px; }
    :is(#rym-lists-wrap, #rym-picker-lists, #rym-lists-modal) select { font-size: 11px; max-width: 80px; }
    #rym-lists-modal {
      --rym-bg: #171717; --rym-bg-3: #2d2d2d; --rym-border: #3b3b3b; --rym-border-2: #555;
      --rym-text: #d7d7d7; --rym-muted: #9a9a9a;
      position: fixed; inset: 0; z-index: 9999998; background: rgba(0,0,0,.6);
      display: flex; align-items: center; justify-content: center;
      font: 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #rym-lists-modal .rym-lists-modal-box {
      background: var(--rym-bg); color: var(--rym-text); border: 1px solid var(--rym-border);
      border-radius: 3px; box-shadow: 0 6px 24px rgba(0,0,0,.5);
      width: min(760px, 92vw); max-height: 86vh; overflow-y: auto; padding: 12px 14px;
    }
    #rym-lists-modal .rym-lists-btn {
      border: 1px solid rgba(128,128,128,.5); background: transparent; color: inherit; border-radius: 3px; padding: 1px 8px; cursor: pointer; font-size: 12px;
    }
    #rym-lists-modal .rym-lists-btn:disabled { opacity: .6; cursor: default; }
    #rym-lists-modal .rym-lists-close { margin-left: auto; font-size: 18px; line-height: 1; }
    #rym-lists-modal .rym-lists-row { display: flex; gap: 8px; align-items: center; padding: 3px 0; }
    #rym-lists-modal a { color: #4aa3ff; }
  `);

  // ---------------------------------------------------------------------------
  // Panel markup
  // ---------------------------------------------------------------------------

  const panel = document.createElement("div");
  panel.id = "rym-picker-panel";
  panel.classList.add(`rym-page-${PAGE}`);

  panel.innerHTML = `
    <div id="rym-picker-header">
      <button id="rym-picker-main-btn">Chart Search: OFF</button>
      <button id="rym-picker-toggle-body-btn" title="Show selected filters">▾</button>
      <button id="rym-picker-quick-open-btn" title="Open chart" aria-label="Open chart">
        <svg class="rym-picker-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none"></circle>
          <path d="M16.5 16.5 21 21" fill="none"></path>
        </svg>
      </button>
      <button id="rym-picker-settings-btn" title="Settings">⚙</button>
    </div>

    <div id="rym-picker-body">
      <div id="rym-picker-status">Search mode disabled</div>

      <div class="rym-picker-row">
        <span class="rym-picker-label">Year</span>
        <div id="rym-picker-year"></div>
      </div>

      <div class="rym-picker-row">
        <span class="rym-picker-label">Primary genres: g: <label class="rym-picker-inline-toggle"><input type="checkbox" data-match-all="primary"> must contain all</label></span>
        <div id="rym-picker-primary"></div>
      </div>

      <div class="rym-picker-row">
        <span class="rym-picker-label">Secondary genres / influences: s: <label class="rym-picker-inline-toggle"><input type="checkbox" data-match-all="secondary"> must contain all</label></span>
        <div id="rym-picker-secondary"></div>
      </div>

      <div class="rym-picker-row">
        <span class="rym-picker-label">Descriptors: d: <label class="rym-picker-inline-toggle"><input type="checkbox" data-match-all="descriptors"> must contain all</label></span>
        <div id="rym-picker-desc"></div>
      </div>

      <div class="rym-picker-row rym-picker-types-row">
        <span class="rym-picker-label">Music releases <span class="rym-picker-chip-sub">Albums, EPs, etc.</span></span>
        <div class="rym-picker-type-presets">
          <button type="button" data-type-preset="all" title="Every release type">all</button><span>|</span>
          <button type="button" data-type-preset="main" title="Album, EP, Mixtape, DJ Mix">main</button><span>|</span>
          <button type="button" data-type-preset="albums" title="Albums only">albums</button><span>|</span>
          <button type="button" data-type-preset="singles" title="Singles only">singles</button><span>|</span>
          <button type="button" data-type-preset="clear">clear</button>
        </div>
        <div id="rym-picker-types" class="rym-picker-type-grid"></div>
        <div id="rym-picker-types-note" class="rym-picker-small-note"></div>
      </div>

      <div class="rym-picker-row">
        <span class="rym-picker-label">Languages: l:</span>
        <div id="rym-picker-lang"></div>
      </div>

      <div class="rym-picker-row rym-picker-users-row">
        <span class="rym-picker-label">Users: u:</span>
        <label class="rym-picker-compat-toggle">
          <input type="checkbox" id="rym-compat-toggle">
          <span>Compatible users</span>
          <select id="rym-compat-topn-quick" title="How many of your most compatible users">
            <option value="5">top 5</option>
            <option value="10">top 10</option>
            <option value="25">top 25</option>
            <option value="50">top 50</option>
          </select>
        </label>
        <div id="rym-picker-users"></div>
      </div>

      <div class="rym-picker-row" id="rym-picker-lists">
        <span class="rym-picker-label">Lists</span>
        <div id="rym-lists-actions" class="rym-picker-small-note">
          <button class="rym-picker-mini-btn" id="rym-lists-find" type="button">Find lists on RYM</button>
          <button class="rym-picker-mini-btn" id="rym-lists-compat" type="button">Lists by compatible users</button>
        </div>
        <div id="rym-lists-current"></div>
        <div id="rym-lists-starred"></div>
      </div>

      <div class="rym-picker-actions">
        <button class="rym-picker-action-btn" id="rym-picker-clear">Clear</button>
        <button class="rym-picker-action-btn" id="rym-picker-open">Open chart</button>
      </div>

      <div id="rym-picker-url" title="Chart URL (click to select)"></div>

      <div id="rym-picker-settings-block">
        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Listing option</span>
          <div class="rym-picker-listing-list" id="rym-listing-options"></div>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Default release type when none is selected</span>
          <div class="rym-picker-checklist">
            <label class="rym-picker-checkitem"><input type="radio" name="rym-type-mode" data-type-mode="all"><span>All release types</span></label>
            <label class="rym-picker-checkitem"><input type="radio" name="rym-type-mode" data-type-mode="page"><span>Same as release page</span></label>
            <label class="rym-picker-checkitem"><input type="radio" name="rym-type-mode" data-type-mode="custom"><span>Custom (pick below)</span></label>
          </div>
          <div style="height: 7px;"></div>
          <div class="rym-picker-checklist rym-picker-two-col" id="rym-type-custom-list"></div>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Chart user filter</span>
          <div class="rym-picker-checklist">
            <label class="rym-picker-checkitem"><input type="checkbox" data-user-filter="all"><span>All users</span></label>
            <label class="rym-picker-checkitem"><input type="checkbox" data-user-filter="compat"><span>My compatible users</span><span class="rym-picker-chip-sub" id="rym-compat-count-note"></span></label>
            <label class="rym-picker-checkitem"><input type="checkbox" data-user-filter="following"><span>I'm following</span></label>
            <label class="rym-picker-checkitem"><input type="checkbox" data-user-filter="followers"><span>Following me / my followers</span></label>
            <label class="rym-picker-checkitem"><input type="checkbox" data-user-filter="myself"><span>Myself</span></label>
            <label class="rym-picker-checkitem"><input type="checkbox" data-user-filter="other"><span>Other</span></label>
          </div>
        </div>

        <div class="rym-picker-setting rym-picker-hidden" id="rym-other-username-wrap">
          <span class="rym-picker-setting-title">Other username</span>
          <input type="text" id="rym-setting-other-username" placeholder="Example: lin808" />
        </div>

        <div class="rym-picker-setting" id="rym-compat-wrap">
          <span class="rym-picker-setting-title">Compatible users</span>
          <div class="rym-picker-language-search-row">
            <button class="rym-picker-mini-btn" id="rym-compat-sync" type="button">Sync now</button>
            <span class="rym-picker-detected" id="rym-compat-status" style="margin-top:0"></span>
          </div>
          <div style="height: 7px;"></div>
          <div class="rym-picker-inline-fields">
            <div>
              <label for="rym-compat-topn">Top N</label>
              <select id="rym-compat-topn">
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div>
              <label for="rym-compat-min">Min. score (%)</label>
              <input type="number" id="rym-compat-min" min="0" max="100" step="1">
            </div>
          </div>
          <div style="height: 7px;"></div>
          <label class="rym-picker-checkitem"><input type="checkbox" id="rym-compat-include-me"><span>Include my own ratings</span></label>
          <div class="rym-compat-list" id="rym-compat-list"></div>
          <div class="rym-picker-small-note">Score is relative to your most compatible user (rank 1 = 100 %). Untick a user to leave them out.</div>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Lists</span>
          <label for="rym-setting-list-search-type">List search type</label>
          <input type="text" id="rym-setting-list-search-type" />
          <div class="rym-picker-small-note">RYM's searchtype parameter for lists; change it if the search opens the wrong tab.</div>
          <div style="height: 7px;"></div>
          <label for="rym-setting-list-fetch-delay">Delay between list fetches (ms)</label>
          <input type="number" id="rym-setting-list-fetch-delay" min="1000" step="500" />
          <div style="height: 7px;"></div>
          <label for="rym-setting-list-fetch-max">Max lists per click</label>
          <input type="number" id="rym-setting-list-fetch-max" min="1" max="100" step="1" />
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Genre matching defaults</span>
          <div class="rym-picker-checklist">
            <label class="rym-picker-checkitem"><input type="checkbox" id="rym-setting-influences-all"><span>Influences: must contain all (default on)</span></label>
          </div>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Default languages when none is selected</span>
          <div class="rym-picker-language-search-row">
            <input type="text" id="rym-language-search" placeholder="Search language, e.g. In, ng, Japanese..." autocomplete="off" />
            <button class="rym-picker-mini-btn" id="rym-language-clear" type="button">Clear</button>
          </div>
          <div class="rym-language-results" id="rym-language-results"></div>
          <div class="rym-picker-default-chip-row" id="rym-language-default-chips"></div>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Your username</span>
          <input type="text" id="rym-setting-own-username" placeholder="Auto-detected from the RYM header" />
          <div class="rym-picker-detected" id="rym-detected-username"></div>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Picker theme</span>
          <select id="rym-setting-theme">
            <option value="auto">Auto / follow RYM theme</option>
            <option value="night">Night</option>
            <option value="evening">Evening</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Panel behavior</span>
          <select id="rym-setting-placement-mode">
            <option value="page">Scroll with page</option>
            <option value="screen">Stay visible while scrolling</option>
          </select>
        </div>

        <div class="rym-picker-setting rym-picker-hidden" id="rym-screen-position-wrap">
          <span class="rym-picker-setting-title">Screen position</span>
          <select id="rym-setting-screen-position">
            <option value="top-right">Top right</option>
            <option value="bottom-right">Bottom right</option>
            <option value="top-left">Top left</option>
            <option value="bottom-left">Bottom left</option>
          </select>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Selection display style</span>
          <select id="rym-setting-selection-style">
            <option value="text">Bold text</option>
            <option value="box">Outline box</option>
          </select>
        </div>

        <div class="rym-picker-setting">
          <span class="rym-picker-setting-title">Selection highlight color</span>
          <div class="rym-color-palette" id="rym-highlight-color-palette"></div>
        </div>
      </div>

      <div class="rym-picker-footer-links" aria-label="Project links">
        <a class="rym-picker-footer-link" href="https://github.com/Lin-808/rym-music-chart-picker" target="_blank" rel="noopener noreferrer" title="Original script by Lin808" aria-label="Original script by Lin808">
          <span class="rym-picker-footer-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 3.86c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path></svg>
          </span>
        </a>
        <a class="rym-picker-footer-link" href="https://rateyourmusic.com/~lin808" target="_blank" rel="noopener noreferrer" title="Lin808 on RYM" aria-label="Lin808 on RYM">
          <img class="rym-picker-footer-img rym-picker-footer-img-rym" src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Rate_Your_Music_logo.svg" alt="" loading="lazy">
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  const $ = id => document.getElementById(id);

  const listingOptionsContainer = $("rym-listing-options");
  const typeCustomList = $("rym-type-custom-list");
  const languageSearchInput = $("rym-language-search");
  const languageResults = $("rym-language-results");
  const colorPalette = $("rym-highlight-color-palette");
  const mainButton = $("rym-picker-main-btn");
  const toggleBodyButton = $("rym-picker-toggle-body-btn");
  const quickOpenButton = $("rym-picker-quick-open-btn");
  const settingsButton = $("rym-picker-settings-btn");
  const compatToggle = $("rym-compat-toggle");
  const compatTopNQuick = $("rym-compat-topn-quick");

  for (const [value, label] of LISTING_OPTIONS) {
    const item = document.createElement("label");
    item.className = "rym-picker-listing-item";
    item.innerHTML = `<input type="radio" name="rym-listing-mode" data-listing-mode="${escapeHTML(value)}"><span>${escapeHTML(label)}</span>`;
    listingOptionsContainer.appendChild(item);
  }

  document.querySelectorAll("[data-type-preset]").forEach(button => {
    button.addEventListener("click", () => {
      state.types.clear();
      for (const slug of TYPE_PRESETS[button.dataset.typePreset] || []) state.types.add(slug);
      render();
    });
  });

  for (const type of RELEASE_TYPES) {
    const item = document.createElement("label");
    item.className = "rym-picker-checkitem";
    item.innerHTML = `<input type="checkbox" data-type-custom="${escapeHTML(type.slug)}"><span>${escapeHTML(type.label)}</span>`;
    typeCustomList.appendChild(item);
  }

  for (const [color, label] of HIGHLIGHT_COLORS) {
    const button = document.createElement("button");
    button.className = "rym-color-dot";
    button.type = "button";
    button.dataset.highlightColor = color;
    button.title = label;
    button.style.background = color;
    button.addEventListener("click", () => {
      settings.highlightColor = color;
      saveSettings();
      render();
      toast(`Highlight color: ${label}`);
    });
    colorPalette.appendChild(button);
  }

  panel.addEventListener("click", event => event.stopPropagation());
  panel.addEventListener("mousedown", event => event.stopPropagation());

  // ---------------------------------------------------------------------------
  // Header and action buttons
  // ---------------------------------------------------------------------------

  mainButton.addEventListener("click", () => {
    if (PAGE === "chart" || PAGE === "list") {
      state.bodyOpen = !state.bodyOpen;
      state.settingsOpen = false;
      render();
      return;
    }

    state.active = !state.active;
    state.bodyOpen = false;
    state.settingsOpen = false;

    if (!state.active) restoreAllTokenSpans();

    toast(state.active ? "Search mode ON." : "Search mode OFF.");
    render();
  });

  toggleBodyButton.addEventListener("click", () => {
    state.bodyOpen = !state.bodyOpen;
    state.settingsOpen = false;
    render();
  });

  quickOpenButton.addEventListener("click", openChartFromState);
  $("rym-picker-open").addEventListener("click", openChartFromState);

  settingsButton.addEventListener("click", () => {
    state.bodyOpen = true;
    state.settingsOpen = !state.settingsOpen;
    render();
  });

  $("rym-picker-clear").addEventListener("click", () => {
    clearState();
    render();
    toast("Selection cleared.");
  });

  function openChartFromState(event) {
    const filters = settings.userFilters;
    const needsMe = filters.some(filter => ["following", "followers", "myself"].includes(filter))
      || (filters.includes("compat") && settings.compatIncludeMe);

    if (!state.urlUsers && needsMe && !OWN_USERNAME) {
      toast("Could not detect your username. Set it in settings.");
      state.bodyOpen = true;
      state.settingsOpen = true;
      render();
      return;
    }

    if (!state.urlUsers && filters.includes("other") && !cleanUsername(settings.otherUsername)) {
      toast("Other user filter is on, but Other username is empty.");
      return;
    }

    if (!state.urlUsers && filters.includes("compat") && selectCompatUsers(compat, settings).length === 0) {
      toast("No compatible users yet. Use Sync now in settings.");
      state.bodyOpen = true;
      state.settingsOpen = true;
      render();
      return;
    }

    const url = currentChartUrl();
    const newTab = PAGE === "release" || (event && (event.shiftKey || event.metaKey || event.ctrlKey));

    if (newTab) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.assign(url);
    }
  }

  // ---------------------------------------------------------------------------
  // Main-panel quick controls: "must contain all" and compatible users
  // ---------------------------------------------------------------------------

  document.querySelectorAll("[data-match-all]").forEach(input => {
    input.addEventListener("change", () => {
      state.matchAll[input.dataset.matchAll] = input.checked;
      render();
    });
  });

  function setCompatFilter(on) {
    state.urlUsers = null;
    if (on) {
      removeValue(settings.userFilters, "all");
      addUnique(settings.userFilters, "compat");
    } else {
      removeValue(settings.userFilters, "compat");
      if (settings.userFilters.length === 0) settings.userFilters = ["all"];
    }
    saveSettings();
    render();
    if (on && compatIsStale()) syncCompat(true);
  }

  compatToggle.addEventListener("change", () => setCompatFilter(compatToggle.checked));

  compatTopNQuick.addEventListener("click", event => event.stopPropagation());
  compatTopNQuick.addEventListener("change", () => {
    settings.compatTopN = parseInt(compatTopNQuick.value, 10) || 10;
    state.urlUsers = null;
    saveSettings();
    render();
  });

  // ---------------------------------------------------------------------------
  // Settings controls
  // ---------------------------------------------------------------------------

  document.querySelectorAll("[data-listing-mode]").forEach(input => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      settings.listingMode = input.dataset.listingMode;
      saveSettings();
      render();
    });
  });

  document.querySelectorAll("[data-type-mode]").forEach(input => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      settings.defaultTypeMode = input.dataset.typeMode;
      saveSettings();
      render();
    });
  });

  document.querySelectorAll("[data-type-custom]").forEach(input => {
    input.addEventListener("change", () => {
      const value = input.dataset.typeCustom;
      settings.defaultTypeMode = "custom";
      if (input.checked) addUnique(settings.defaultTypeCustom, value);
      else removeValue(settings.defaultTypeCustom, value);
      if (settings.defaultTypeCustom.length === 0) settings.defaultTypeMode = "page";
      saveSettings();
      render();
    });
  });

  document.querySelectorAll("[data-user-filter]").forEach(input => {
    input.addEventListener("change", () => {
      const value = input.dataset.userFilter;
      state.urlUsers = null; // user changed the filter: stop reusing the URL's list

      if (value === "all") {
        if (!input.checked) {
          input.checked = true;
          render();
          return;
        }
        settings.userFilters = ["all"];
      } else {
        removeValue(settings.userFilters, "all");
        if (input.checked) addUnique(settings.userFilters, value);
        else removeValue(settings.userFilters, value);
        if (settings.userFilters.length === 0) settings.userFilters = ["all"];
      }

      saveSettings();
      render();

      if (value === "compat" && input.checked && !compat) syncCompat();
    });
  });

  $("rym-compat-sync").addEventListener("click", () => syncCompat(true));

  $("rym-compat-topn").addEventListener("change", event => {
    settings.compatTopN = parseInt(event.target.value, 10) || 10;
    state.urlUsers = null;
    saveSettings();
    render();
  });

  $("rym-compat-min").addEventListener("change", event => {
    const value = parseInt(event.target.value, 10);
    settings.compatMinScore = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 70;
    state.urlUsers = null;
    saveSettings();
    render();
  });

  $("rym-compat-include-me").addEventListener("change", event => {
    settings.compatIncludeMe = event.target.checked;
    state.urlUsers = null;
    saveSettings();
    render();
  });

  $("rym-setting-influences-all").addEventListener("change", event => {
    settings.influencesAll = event.target.checked;
    state.matchAll.secondary = settings.influencesAll;
    saveSettings();
    render();
  });

  languageSearchInput.addEventListener("input", () => {
    renderLanguageSearchResults(languageSearchInput.value);
  });

  $("rym-language-clear").addEventListener("click", () => {
    settings.defaultLanguageMode = "all";
    settings.defaultLanguageCustom = [];
    languageSearchInput.value = "";
    saveSettings();
    render();
  });

  $("rym-lists-find").addEventListener("click", () => {
    const url = buildListSearchUrl(state, settings);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  });

  [
    ["rym-setting-list-search-type", "listSearchType", v => String(v).trim()],
    ["rym-setting-list-fetch-delay", "listFetchDelayMs", v => parseInt(v, 10)],
    ["rym-setting-list-fetch-max", "listFetchMax", v => parseInt(v, 10)]
  ].forEach(([id, key, parse]) => {
    $(id).addEventListener("change", event => {
      settings[key] = parse(event.target.value);
      Object.assign(settings, normalizeSettings(settings));
      saveSettings();
      render();
    });
  });

  $("rym-setting-other-username").addEventListener("change", event => {
    settings.otherUsername = cleanUsername(event.target.value);
    saveSettings();
    render();
  });

  $("rym-setting-own-username").addEventListener("change", event => {
    settings.ownUsername = cleanUsername(event.target.value);
    saveSettings();
    toast("Reload the page to apply the username.");
  });

  $("rym-setting-theme").addEventListener("change", event => {
    settings.theme = event.target.value;
    saveSettings();
    render();
  });

  $("rym-setting-placement-mode").addEventListener("change", event => {
    settings.placementMode = event.target.value;
    saveSettings();
    render();
  });

  $("rym-setting-screen-position").addEventListener("change", event => {
    settings.screenPosition = event.target.value;
    saveSettings();
    render();
  });

  $("rym-setting-selection-style").addEventListener("change", event => {
    settings.selectionStyle = event.target.value === "box" ? "box" : "text";
    saveSettings();
    render();
  });

  // ---------------------------------------------------------------------------
  // Compatible users sync
  // ---------------------------------------------------------------------------

  let compatSyncing = false;

  async function syncCompat(manual = false) {
    if (compatSyncing) return;

    if (!OWN_USERNAME) {
      toast("Set your username in settings before syncing.");
      return;
    }

    compatSyncing = true;
    render();

    const pageUrl = `/find_similar_users?user=${encodeURIComponent(OWN_USERNAME)}`;

    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 20000);

    try {
      const response = await fetch(pageUrl, { credentials: "include", signal: abort.signal });
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const users = parseCompatDocument(doc);

      if (!response.ok || users.length === 0) {
        throw new Error(response.ok ? "empty" : `HTTP ${response.status}`);
      }

      saveCompat(users, OWN_USERNAME);
      toast(`Synced ${users.length} compatible users.`);
    } catch (error) {
      // RYM's bot check blocks background fetches now and then. Opening the
      // page lets this same script capture the list from there.
      if (manual) {
        toast("Sync blocked by RYM. Opening the page so it can be captured there.");
        window.open(pageUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      clearTimeout(timer);
      compatSyncing = false;
      render();
    }
  }

  // The fallback tab (find_similar_users) saves the list; pick it up here without refetching.
  if (typeof GM_addValueChangeListener === "function") {
    GM_addValueChangeListener(COMPAT_KEY, (name, oldValue, newValue, remote) => {
      if (!remote) return;
      compat = loadCompat();
      if (compat) toast(`Compatible users list updated (${compat.users.length}).`);
      render();
    });
  }

  function compatIsStale() {
    return !compat || !compat.syncedAt || (Date.now() - compat.syncedAt) > COMPAT_MAX_AGE_MS;
  }

  // Automatic fetches only on release/chart pages; list pages stay passive.
  if ((PAGE === "release" || PAGE === "chart") && settings.userFilters.includes("compat") && compatIsStale() && OWN_USERNAME) {
    setTimeout(() => syncCompat(false), 1500);
  }

  function compatStatusText() {
    if (compatSyncing) return "Syncing…";
    if (!compat) return "Not synced yet.";
    const days = Math.floor((Date.now() - compat.syncedAt) / 86400000);
    const when = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
    return `${compat.users.length} users · ${when}${compatIsStale() ? " · stale" : ""}`;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  function render() {
    applyThemeAndPlacement();
    applyHighlightColorVars();
    applySelectionStyleClass();

    panel.classList.toggle("rym-search-active", state.active);
    panel.classList.toggle("rym-picker-open", state.bodyOpen);
    panel.classList.toggle("rym-settings-open", state.settingsOpen);

    if (PAGE === "chart") {
      mainButton.textContent = "Chart Picker+: edit this chart";
      mainButton.style.background = "var(--rym-blue)";
      $("rym-picker-status").textContent = "Editing current chart";
    } else if (PAGE === "list") {
      mainButton.textContent = "Chart Picker+: lists";
      mainButton.style.background = "var(--rym-blue)";
      $("rym-picker-status").textContent = "Viewing a list";
    } else {
      mainButton.textContent = state.active ? "Chart Search: ON" : "Chart Search: OFF";
      mainButton.style.background = state.active ? "var(--rym-blue-hover)" : "var(--rym-blue)";
      $("rym-picker-status").textContent = state.active ? "Search mode enabled" : "Search mode disabled";
    }

    toggleBodyButton.textContent = state.bodyOpen ? "▴" : "▾";
    $("rym-picker-open").textContent = PAGE === "chart" ? "Update chart" : "Open chart";

    renderYear();
    renderTypes();
    renderSet("rym-picker-primary", state.primaryGenres, "primaryGenres");
    renderSet("rym-picker-secondary", state.secondaryGenres, "secondaryGenres");
    renderSet("rym-picker-desc", state.descriptors, "descriptors");
    renderLanguageSet();
    renderUsersChip();
    if (PAGE === "release") renderReleaseLists();
    renderListsSection();

    document.querySelectorAll("[data-listing-mode]").forEach(input => {
      input.checked = settings.listingMode === input.dataset.listingMode;
    });

    document.querySelectorAll("[data-type-mode]").forEach(input => {
      input.checked = settings.defaultTypeMode === input.dataset.typeMode;
    });

    document.querySelectorAll("[data-type-custom]").forEach(input => {
      input.checked = settings.defaultTypeMode === "custom" && settings.defaultTypeCustom.includes(input.dataset.typeCustom);
    });

    document.querySelectorAll("[data-user-filter]").forEach(input => {
      input.checked = settings.userFilters.includes(input.dataset.userFilter);
    });

    document.querySelectorAll("[data-highlight-color]").forEach(button => {
      button.classList.toggle("rym-color-selected", button.dataset.highlightColor === settings.highlightColor);
    });

    $("rym-setting-other-username").value = settings.otherUsername;
    $("rym-setting-own-username").value = settings.ownUsername;
    $("rym-setting-list-search-type").value = settings.listSearchType;
    $("rym-setting-list-fetch-delay").value = settings.listFetchDelayMs;
    $("rym-setting-list-fetch-max").value = settings.listFetchMax;
    $("rym-setting-theme").value = settings.theme;
    $("rym-setting-placement-mode").value = settings.placementMode;
    $("rym-setting-screen-position").value = settings.screenPosition;
    $("rym-setting-selection-style").value = settings.selectionStyle;
    $("rym-setting-influences-all").checked = settings.influencesAll;
    $("rym-compat-topn").value = String(settings.compatTopN);
    $("rym-compat-min").value = settings.compatMinScore;
    $("rym-compat-include-me").checked = settings.compatIncludeMe;
    $("rym-compat-status").textContent = compatStatusText();
    $("rym-compat-sync").disabled = compatSyncing;
    $("rym-compat-count-note").textContent = compat ? `${selectCompatUsers(compat, settings).length} selected` : "";

    document.querySelectorAll("[data-match-all]").forEach(input => {
      const key = input.dataset.matchAll;
      const set = { primary: state.primaryGenres, secondary: state.secondaryGenres, descriptors: state.descriptors }[key];
      input.checked = !!state.matchAll[key];
      input.closest("label").classList.toggle("rym-picker-toggle-on", input.checked);
      input.closest("label").classList.toggle("rym-picker-hidden", set.size === 0);
    });

    const compatOn = settings.userFilters.includes("compat") && !state.urlUsers;
    compatToggle.checked = compatOn;
    compatToggle.closest("label").classList.toggle("rym-picker-toggle-on", compatOn);
    compatTopNQuick.value = String(settings.compatTopN);
    compatTopNQuick.disabled = !compatOn;

    $("rym-other-username-wrap").classList.toggle("rym-picker-hidden", !settings.userFilters.includes("other"));
    $("rym-compat-wrap").classList.toggle("rym-picker-hidden", !settings.userFilters.includes("compat"));
    $("rym-screen-position-wrap").classList.toggle("rym-picker-hidden", settings.placementMode !== "screen");

    $("rym-detected-username").textContent = OWN_USERNAME
      ? `Using: ${OWN_USERNAME}`
      : "Not detected. Own-user filters will not work until you set it.";

    if (state.settingsOpen) {
      renderDefaultLanguageChips();
      renderLanguageSearchResults(languageSearchInput.value);
      renderCompatList();
    }

    $("rym-picker-url").textContent = currentChartUrl();

    if (PAGE === "list") {
      panel.querySelectorAll(".rym-picker-row:not(#rym-picker-lists), .rym-picker-actions, #rym-picker-url")
        .forEach(el => el.classList.add("rym-picker-hidden"));
    }

    refreshPageHighlights();
  }

  function renderYear() {
    const el = $("rym-picker-year");
    el.innerHTML = "";

    if (state.year.mode === "none") {
      const chip = document.createElement("span");
      chip.className = "rym-picker-chip";
      chip.textContent = "all time";
      chip.title = state.releaseYear ? `Click to pick ${state.releaseYear}` : "Click the release year on the page to pick it";
      if (state.releaseYear) {
        chip.addEventListener("click", () => {
          state.year = cycleYear(state.year, state.releaseYear);
          render();
        });
      }
      el.appendChild(chip);
    } else {
      const chip = document.createElement("span");
      chip.className = "rym-picker-chip rym-picker-chip-accent";
      const modeName = { year: "year", decade: "decade", range: "range" }[state.year.mode];
      chip.innerHTML = `${escapeHTML(yearLabel(state.year))}<span class="rym-picker-chip-sub">${modeName}</span>`;
      chip.title = state.year.mode === "range" ? "Click to remove" : "Click to cycle year → decade → all time";
      chip.addEventListener("click", () => {
        state.year = state.year.mode === "range" ? emptyYear() : cycleYear(state.year, state.year.from);
        render();
      });
      el.appendChild(chip);
    }
  }

  function defaultTypeSlugs() {
    return buildTypeSegment(state, settings, PAGE === "chart" ? "" : getCurrentPageTypeSlug()).split(",");
  }

  function renderTypes() {
    const el = $("rym-picker-types");
    el.innerHTML = "";
    const custom = state.types.size > 0;
    const selected = new Set(custom ? state.types : defaultTypeSlugs());

    for (const row of TYPE_GRID) {
      for (const slug of row) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "rym-picker-type-cell";
        if (row.length < 4) cell.classList.add("rym-picker-type-wide");
        cell.classList.toggle("rym-picker-type-on", selected.has(slug));
        cell.setAttribute("aria-pressed", selected.has(slug) ? "true" : "false");
        cell.textContent = slug === "unauth" ? "Unauthorized" : slug === "additional" ? "Addl release" : typeLabel(slug);
        cell.title = selected.has(slug) ? "Click to remove" : "Click to add";
        cell.addEventListener("click", () => {
          if (!custom) for (const s of selected) state.types.add(s);
          toggleSetValue(state.types, slug);
          render();
        });
        el.appendChild(cell);
      }
    }

    document.querySelectorAll("[data-type-preset]").forEach(button => {
      const preset = TYPE_PRESETS[button.dataset.typePreset];
      const on = preset && preset.length === selected.size && preset.every(slug => selected.has(slug));
      button.classList.toggle("rym-picker-preset-on", !!on);
    });

    $("rym-picker-types-note").textContent = custom ? "" : `default: ${getDefaultTypeLabel()}`;
    const clearButton = document.querySelector('[data-type-preset="clear"]');
    if (clearButton) clearButton.title = `Back to the default: ${getDefaultTypeLabel()}`;
  }

  function renderUsersChip() {
    const el = $("rym-picker-users");
    el.innerHTML = "";

    const chip = document.createElement("span");
    chip.className = "rym-picker-chip";
    chip.title = "Click to change the user filter";
    chip.addEventListener("click", () => {
      state.bodyOpen = true;
      state.settingsOpen = true;
      render();
      const target = $("rym-compat-wrap").classList.contains("rym-picker-hidden")
        ? document.querySelector("[data-user-filter='all']")
        : $("rym-compat-wrap");
      if (target) target.scrollIntoView({ block: "nearest" });
    });

    if (Array.isArray(state.urlUsers)) {
      if (state.urlUsers.length > 0) {
        chip.className += " rym-picker-chip-accent";
        chip.innerHTML = `from URL<span class="rym-picker-chip-sub">${state.urlUsers.length} user${state.urlUsers.length === 1 ? "" : "s"}</span>`;
      } else {
        chip.innerHTML = `everyone<span class="rym-picker-chip-sub">from URL</span>`;
      }
      chip.title = "Click to pick a user filter instead";
      el.appendChild(chip);
      return;
    }

    const filters = settings.userFilters;
    if (filters.includes("all")) {
      chip.textContent = "everyone";
      el.appendChild(chip);
      return;
    }

    const parts = [];
    if (filters.includes("compat")) {
      const n = selectCompatUsers(compat, settings).length;
      parts.push(`${n} compatible`);
    }
    if (filters.includes("following")) parts.push("following");
    if (filters.includes("followers")) parts.push("followers");
    if (filters.includes("myself") || (filters.includes("compat") && settings.compatIncludeMe)) parts.push("me");
    if (filters.includes("other")) parts.push(cleanUsername(settings.otherUsername) || "other (empty)");

    chip.className += " rym-picker-chip-accent";
    chip.textContent = parts.join(" + ");
    el.appendChild(chip);
  }

  function renderCompatList() {
    const el = $("rym-compat-list");
    el.innerHTML = "";

    if (!compat || compat.users.length === 0) {
      el.innerHTML = `<div class="rym-compat-item rym-picker-empty">No list yet. Click Sync now.</div>`;
      return;
    }

    const excluded = new Set(settings.compatExcluded.map(name => name.toLowerCase()));
    const topN = Math.max(1, settings.compatTopN);
    const candidates = compat.users.filter(user => user.score >= settings.compatMinScore).slice(0, topN);

    if (candidates.length === 0) {
      el.innerHTML = `<div class="rym-compat-item rym-picker-empty">Nobody passes the minimum score. Lower it.</div>`;
      return;
    }

    for (const user of candidates) {
      const isExcluded = excluded.has(user.username.toLowerCase());
      const item = document.createElement("label");
      item.className = "rym-compat-item" + (isExcluded ? " rym-compat-excluded" : "");
      item.innerHTML = `
        <input type="checkbox" ${isExcluded ? "" : "checked"}>
        <span class="rym-compat-rank">${user.rank}</span>
        <span>${escapeHTML(user.username)}</span>
        <span class="rym-compat-score">${user.score.toFixed(0)} %</span>
      `;
      item.querySelector("input").addEventListener("change", event => {
        if (event.target.checked) {
          settings.compatExcluded = settings.compatExcluded.filter(name => name.toLowerCase() !== user.username.toLowerCase());
        } else {
          addUnique(settings.compatExcluded, user.username);
        }
        state.urlUsers = null;
        saveSettings();
        render();
      });
      el.appendChild(item);
    }
  }

  function applyThemeAndPlacement() {
    panel.classList.remove(
      "rym-placement-page", "rym-placement-screen",
      "rym-screen-top-right", "rym-screen-bottom-right", "rym-screen-top-left", "rym-screen-bottom-left"
    );

    if (settings.placementMode === "screen") {
      panel.classList.add("rym-placement-screen", `rym-screen-${settings.screenPosition || "top-right"}`);
    } else {
      panel.classList.add("rym-placement-page");
    }

    const theme = settings.theme || "night";
    const key = theme === "auto" ? `auto:${document.documentElement.className}` : theme;

    if (themeCache.key !== key) {
      themeCache.key = key;
      themeCache.vars = theme === "auto" ? collectRYMThemeVars() : readRYMThemeVars(theme);
    }

    for (const [name, value] of Object.entries(themeCache.vars)) {
      panel.style.setProperty(name, value);
    }
  }

  const themeCache = { key: null, vars: {} };

  function readRYMThemeVars(theme) {
    const themeClassMap = { light: "theme_light", evening: "theme_eve", night: "theme_night" };
    const wantedClass = themeClassMap[theme] || "theme_night";
    const themeClasses = ["theme_light", "theme_eve", "theme_night", "theme_darkgray"];

    const html = document.documentElement;
    const body = document.body;
    const oldHtmlClass = html.getAttribute("class") || "";
    const oldBodyClass = body.getAttribute("class") || "";

    html.classList.remove(...themeClasses);
    body.classList.remove(...themeClasses);
    html.classList.add(wantedClass);
    body.classList.add(wantedClass);

    const vars = collectRYMThemeVars();

    html.setAttribute("class", oldHtmlClass);
    body.setAttribute("class", oldBodyClass);

    return vars;
  }

  function collectRYMThemeVars() {
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const cssVar = (name, fallback) =>
      rootStyle.getPropertyValue(name).trim() || bodyStyle.getPropertyValue(name).trim() || fallback;

    return {
      "--rym-bg": cssVar("--surface-primary", cssVar("--background", "#171717")),
      "--rym-bg-2": cssVar("--surface-secondary", "#202020"),
      "--rym-bg-3": cssVar("--surface-tertiary", cssVar("--mono-f8", "#2d2d2d")),
      "--rym-border": cssVar("--ui-detail-neutral", "#3b3b3b"),
      "--rym-border-2": cssVar("--ui-detail-neutral", "#555"),
      "--rym-text": cssVar("--text-primary", "#d7d7d7"),
      "--rym-muted": cssVar("--text-secondary", "#9a9a9a"),
      "--rym-empty": cssVar("--text-secondary", "#777"),
      "--rym-blue": cssVar("--btn-primary-background-default", cssVar("--gen-blue-med", "#1676d2")),
      "--rym-blue-hover": cssVar("--btn-primary-background-hover", cssVar("--gen-blue-darker", "#2385e5")),
      "--rym-button-text": cssVar("--btn-primary-text", "#fff"),
      "--rym-chip-hover": cssVar("--surface-secondary", "#393939"),
      "--rym-chip-hover-border": cssVar("--ui-detail-neutral", "#777")
    };
  }

  function applyHighlightColorVars() {
    const color = isValidHex(settings.highlightColor) ? settings.highlightColor : "#ffb000";
    document.documentElement.style.setProperty("--rym-picker-highlight-bg", hexToRgba(color, 0.30));
    document.documentElement.style.setProperty("--rym-picker-highlight-border", color);
  }

  function applySelectionStyleClass() {
    document.documentElement.classList.remove("rym-picker-style-text", "rym-picker-style-box");
    document.documentElement.classList.add(settings.selectionStyle === "box" ? "rym-picker-style-box" : "rym-picker-style-text");
  }

  function renderLanguageSet() {
    if (state.languages.size > 0) {
      renderSet("rym-picker-lang", state.languages, "languages", "none", value =>
        LANGUAGE_BY_CODE.has(value) ? `${languageLabelFromCode(value)}` : value
      );
      return;
    }

    const el = $("rym-picker-lang");
    if (settings.defaultLanguageMode === "custom" && settings.defaultLanguageCustom.length > 0) {
      const labels = settings.defaultLanguageCustom.map(languageLabelFromCode);
      el.innerHTML = `<span class="rym-picker-empty">default: ${escapeHTML(labels.join(", "))}</span>`;
      return;
    }

    el.innerHTML = `<span class="rym-picker-empty">none</span>`;
  }

  function renderDefaultLanguageChips() {
    const el = $("rym-language-default-chips");
    el.innerHTML = "";

    if (settings.defaultLanguageMode !== "custom" || settings.defaultLanguageCustom.length === 0) {
      el.innerHTML = `<span class="rym-picker-empty">Current default: All languages / no language filter</span>`;
      return;
    }

    for (const code of settings.defaultLanguageCustom) {
      const chip = document.createElement("span");
      chip.className = "rym-picker-chip";
      chip.textContent = languageLabelFromCode(code);
      chip.title = "Click to remove from default languages";
      chip.addEventListener("click", () => {
        removeValue(settings.defaultLanguageCustom, code);
        if (settings.defaultLanguageCustom.length === 0) settings.defaultLanguageMode = "all";
        saveSettings();
        render();
      });
      el.appendChild(chip);
    }
  }

  function renderLanguageSearchResults(query) {
    const normalizedQuery = normalizeSearchText(query);
    languageResults.innerHTML = "";

    const allButton = document.createElement("button");
    allButton.className = "rym-language-option";
    allButton.type = "button";
    allButton.innerHTML = `<span class="rym-language-code">all</span> All languages / no language filter`;
    allButton.addEventListener("click", () => {
      settings.defaultLanguageMode = "all";
      settings.defaultLanguageCustom = [];
      languageSearchInput.value = "";
      saveSettings();
      render();
    });

    languageResults.appendChild(groupTitle("No language filter"));
    languageResults.appendChild(allButton);

    if (!normalizedQuery) {
      languageResults.appendChild(groupTitle("Popular"));
      for (const language of POPULAR_LANGUAGE_OPTIONS) languageResults.appendChild(languageOptionButton(language));

      languageResults.appendChild(groupTitle("All available languages"));
      for (const language of ALL_LANGUAGE_OPTIONS) {
        if (POPULAR_LANGUAGE_CODES.includes(language.code)) continue;
        languageResults.appendChild(languageOptionButton(language));
      }
      return;
    }

    const filtered = ALL_LANGUAGE_OPTIONS
      .filter(language => languageSearchBlob(language).includes(normalizedQuery))
      .sort((a, b) => {
        const aPopular = POPULAR_LANGUAGE_CODES.includes(a.code) ? 0 : 1;
        const bPopular = POPULAR_LANGUAGE_CODES.includes(b.code) ? 0 : 1;
        if (aPopular !== bPopular) return aPopular - bPopular;
        return a.name.localeCompare(b.name);
      });

    languageResults.appendChild(groupTitle(`Results: ${filtered.length}`));

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "rym-language-option";
      empty.textContent = "No matching language.";
      languageResults.appendChild(empty);
      return;
    }

    for (const language of filtered) languageResults.appendChild(languageOptionButton(language));
  }

  function groupTitle(text) {
    const title = document.createElement("div");
    title.className = "rym-language-group-title";
    title.textContent = text;
    return title;
  }

  function languageOptionButton(language) {
    const selected = settings.defaultLanguageMode === "custom" && settings.defaultLanguageCustom.includes(language.code);
    const button = document.createElement("button");
    button.type = "button";
    button.className = selected ? "rym-language-option rym-language-selected" : "rym-language-option";
    button.innerHTML = `
      <span class="rym-language-code">${escapeHTML(language.code)}</span>
      ${escapeHTML(language.name)}
      ${language.nativeName ? `<span class="rym-language-native">${escapeHTML(language.nativeName)}</span>` : ""}
    `;
    button.addEventListener("click", () => {
      settings.defaultLanguageMode = "custom";
      if (settings.defaultLanguageCustom.includes(language.code)) removeValue(settings.defaultLanguageCustom, language.code);
      else addUnique(settings.defaultLanguageCustom, language.code);
      if (settings.defaultLanguageCustom.length === 0) settings.defaultLanguageMode = "all";
      saveSettings();
      render();
    });
    return button;
  }

  function renderSet(elementId, set, key, emptyText = "none", labelFor = value => value) {
    const el = $(elementId);
    el.innerHTML = "";

    if (set.size === 0) {
      el.innerHTML = `<span class="rym-picker-empty">${escapeHTML(emptyText)}</span>`;
      return;
    }

    for (const item of set) {
      const chip = document.createElement("span");
      chip.className = "rym-picker-chip";
      chip.textContent = labelFor(item);
      chip.title = "Click to remove";
      chip.addEventListener("click", () => {
        state[key].delete(item);
        render();
      });
      el.appendChild(chip);
    }
  }

  function getDefaultTypeLabel() {
    if (settings.defaultTypeMode === "all") return "All release types";
    if (settings.defaultTypeMode === "custom" && settings.defaultTypeCustom.length > 0) {
      return settings.defaultTypeCustom.map(typeLabel).join(", ");
    }
    if (PAGE === "chart" || state.fromUrl) return "All release types";
    const pageType = getCurrentPageTypeSlug();
    return pageType ? `Same as release page (${typeLabel(pageType)})` : "Same as release page";
  }

  function clearState() {
    state.types.clear();
    state.year = emptyYear();
    state.primaryGenres.clear();
    state.secondaryGenres.clear();
    state.descriptors.clear();
    state.languages.clear();
    state.genreSlugs.clear();
    state.extraSegments = [];
    state.matchAll = { primary: false, secondary: settings.influencesAll, descriptors: false };
    // User filter is a setting, not a selection: Clear leaves it alone.
  }

  // ---------------------------------------------------------------------------
  // Picking on release pages
  // ---------------------------------------------------------------------------

  function infoRoot() {
    return document.querySelector(".album_info, .release_page .info") || document;
  }

  function refreshPageHighlights() {
    document.querySelectorAll(".rym-picker-selected-target").forEach(element => {
      element.classList.remove("rym-picker-selected-target");
    });

    if (PAGE !== "release") return;

    if (!state.active) {
      restoreAllTokenSpans();
      return;
    }

    installAllTokenSpans();

    const root = infoRoot();

    if (state.year.mode !== "none") {
      const selectedYear = String(state.year.from);
      for (const row of findRowsByLabel("released")) {
        row.querySelectorAll("a").forEach(anchor => {
          const text = cleanText(anchor.textContent);
          const href = anchor.getAttribute("href") || "";
          if (text === selectedYear || href.includes(`/${selectedYear}/`) || href.includes(`/year/${selectedYear}`)) {
            anchor.classList.add("rym-picker-selected-target");
          }
        });
      }
    }

    root.querySelectorAll('a[href*="/genre/"]').forEach(anchor => {
      const value = cleanMetadataToken(anchor.textContent);
      if (state.primaryGenres.has(value) || state.secondaryGenres.has(value)) {
        anchor.classList.add("rym-picker-selected-target");
      }
    });

    root.querySelectorAll("[data-rym-descriptor-token]").forEach(span => {
      if (state.descriptors.has(span.dataset.rymDescriptorToken || "")) span.classList.add("rym-picker-selected-target");
    });

    root.querySelectorAll("[data-rym-type-token]").forEach(span => {
      if (state.types.has(span.dataset.rymTypeToken || "")) span.classList.add("rym-picker-selected-target");
    });

    root.querySelectorAll("[data-rym-language-token]").forEach(span => {
      if (state.languages.has(span.dataset.rymLanguageToken || "")) span.classList.add("rym-picker-selected-target");
    });
  }

  function installAllTokenSpans() {
    installDescriptorTokenSpans();
    installSimpleValueTokenSpans("type", "rymTypeToken");
    installSimpleValueTokenSpans("language", "rymLanguageToken");
    installSimpleValueTokenSpans("languages", "rymLanguageToken");
  }

  function restoreAllTokenSpans() {
    restoreTokenSpans("[data-rym-descriptor-token]", "rymPickerDescriptorWrapped");
    restoreTokenSpans("[data-rym-type-token]", "rymPickerTypeWrapped");
    restoreTokenSpans("[data-rym-language-token]", "rymPickerLanguageWrapped");

    document.querySelectorAll(".rym-picker-selected-target, .rym-picker-active-outline").forEach(element => {
      element.classList.remove("rym-picker-selected-target", "rym-picker-active-outline");
    });
  }

  function installSimpleValueTokenSpans(rowLabel, datasetName) {
    const flag = rowLabel === "type" ? "rymPickerTypeWrapped" : "rymPickerLanguageWrapped";

    for (const row of findRowsByLabel(rowLabel)) {
      if (row.dataset[flag] === "1") continue;

      const valueCell = getRowValueCell(row);
      if (!valueCell) continue;

      const value = cleanText(valueCell.textContent);
      if (!value) continue;

      valueCell.dataset.rymPickerOriginalHtml = valueCell.innerHTML;
      valueCell.textContent = "";

      if (datasetName === "rymLanguageToken") {
        appendCommaSeparatedValueSpans(valueCell, value);
      } else {
        const type = typeFromText(value);
        const span = document.createElement("span");
        span.dataset.rymTypeToken = type ? type.slug : rymSlug(value);
        span.textContent = value;
        valueCell.appendChild(span);
      }

      row.dataset[flag] = "1";
    }
  }

  function appendCommaSeparatedValueSpans(container, rawValue) {
    const parts = String(rawValue || "").split(/(,\s*)/);

    for (const part of parts) {
      const token = /^,\s*$/.test(part) ? "" : cleanMetadataToken(part);

      if (!token) {
        container.appendChild(document.createTextNode(part));
        continue;
      }

      const span = document.createElement("span");
      span.dataset.rymLanguageToken = token;
      span.textContent = part;
      container.appendChild(span);
    }
  }

  function installDescriptorTokenSpans() {
    const containers = Array.from(document.querySelectorAll(".release_pri_descriptors"))
      .filter(element => !element.closest("#rym-picker-panel"));

    for (const container of containers) {
      if (container.dataset.rymPickerDescriptorWrapped === "1") continue;

      container.dataset.rymPickerOriginalHtml = container.innerHTML;

      const parts = (container.textContent || "").split(/(,\s*)/);
      const fragment = document.createDocumentFragment();

      for (const part of parts) {
        const token = /^,\s*$/.test(part) ? "" : cleanDescriptorToken(part);

        if (!token || token.length > 70) {
          fragment.appendChild(document.createTextNode(part));
          continue;
        }

        const span = document.createElement("span");
        span.dataset.rymDescriptorToken = token;
        span.textContent = part;
        fragment.appendChild(span);
      }

      container.textContent = "";
      container.appendChild(fragment);
      container.dataset.rymPickerDescriptorWrapped = "1";
    }
  }

  function restoreTokenSpans(selector, rowFlagName) {
    document.querySelectorAll(selector).forEach(span => {
      const parent = span.parentElement;
      if (parent && parent.dataset.rymPickerOriginalHtml !== undefined) {
        parent.innerHTML = parent.dataset.rymPickerOriginalHtml;
        delete parent.dataset.rymPickerOriginalHtml;
      } else {
        span.replaceWith(document.createTextNode(span.textContent || ""));
      }
    });

    document.querySelectorAll(`[data-${camelToKebab(rowFlagName)}]`).forEach(row => {
      delete row.dataset[rowFlagName];
    });
  }

  function camelToKebab(value) {
    return String(value).replace(/[A-Z]/g, match => "-" + match.toLowerCase());
  }

  function getRowValueCell(row) {
    if (!row) return null;
    if (row.matches("tr")) return row.querySelector("td");
    const cells = Array.from(row.children || []);
    return cells.find(child => !/^(th|dt)$/i.test(child.tagName)) || null;
  }

  function getRowValueText(row) {
    const cell = getRowValueCell(row);
    return cell ? cleanText(cell.textContent) : "";
  }

  // Release info lives in `.album_info tr`. Fall back to a wider scan only if
  // RYM changes the markup.
  function findRowsByLabel(label) {
    const tableRows = Array.from(document.querySelectorAll(".album_info tr"))
      .filter(row => findRowLabel(row) === label);
    if (tableRows.length > 0) return tableRows;

    const candidates = Array.from(document.querySelectorAll("tr, dl, dd"))
      .filter(element => !element.closest("#rym-picker-panel") && findRowLabel(element) === label);

    return candidates.filter(element =>
      !candidates.some(other => other !== element && element.contains(other))
    );
  }

  function findRowLabel(row) {
    if (!row) return "";
    const header = row.querySelector(":scope > th, :scope > dt");
    return header ? normalizeRowLabel(header.textContent) : "";
  }

  function normalizeRowLabel(value) {
    return cleanText(value).replace(/:$/, "").trim().toLowerCase();
  }

  function findInfoRow(target) {
    const tableRow = target.closest("tr");
    if (tableRow && findRowLabel(tableRow)) return tableRow;

    let node = target;
    for (let i = 0; i < 8 && node; i++) {
      if (findRowLabel(node)) return node;
      node = node.parentElement;
    }
    return null;
  }

  document.addEventListener("click", function (event) {
    if (PAGE !== "release" || !state.active) return;
    if (event.target.closest("#rym-picker-panel")) return;

    const picked = classifyClick(event.target);
    if (!picked) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    applyPicked(picked);
    render();
    toast(`${picked.action}: ${picked.label || picked.value}`);
  }, true);

  document.addEventListener("mouseover", function (event) {
    if (PAGE !== "release" || !state.active) return;
    if (event.target.closest("#rym-picker-panel")) return;
    if (classifyClick(event.target)) event.target.classList.add("rym-picker-active-outline");
  });

  document.addEventListener("mouseout", function (event) {
    event.target.classList.remove("rym-picker-active-outline");
  });

  function classifyClick(target) {
    const descriptorSpan = target.closest("[data-rym-descriptor-token]");
    if (descriptorSpan) {
      return { kind: "descriptor", value: descriptorSpan.dataset.rymDescriptorToken, action: "Toggled descriptor" };
    }

    const typeSpan = target.closest("[data-rym-type-token]");
    if (typeSpan) {
      const slug = typeSpan.dataset.rymTypeToken;
      return { kind: "type", value: slug, label: typeLabel(slug), action: "Toggled type" };
    }

    const languageSpan = target.closest("[data-rym-language-token]");
    if (languageSpan) {
      return { kind: "language", value: languageSpan.dataset.rymLanguageToken, action: "Toggled language" };
    }

    // Never hijack RYM's own controls.
    if (target.closest("button, input, select, textarea, [contenteditable='true']")) return null;

    const row = findInfoRow(target);
    const rowLabel = findRowLabel(row);

    // Recorded dates are historical metadata, not chart filters.
    if (rowLabel === "recorded") return null;

    const anchor = target.closest("a");
    const href = anchor ? anchor.getAttribute("href") || "" : "";
    const text = cleanText(target.textContent);

    if (rowLabel === "released") {
      const year = extractYear(text) || extractYear(getRowValueText(row));
      if (year) return { kind: "year", value: year, action: "Year" };
    }

    if (href.includes("/genre/") && row && rowLabel === "genres") {
      const value = cleanMetadataToken(text);
      if (!value) return null;

      const genreKind = target.closest(".release_sec_genres") ? "secondaryGenre" : "primaryGenre";

      return {
        kind: genreKind,
        value,
        slug: slugFromGenreHref(href),
        action: genreKind === "primaryGenre" ? "Toggled primary genre" : "Toggled secondary genre"
      };
    }

    return null;
  }

  function applyPicked(picked) {
    switch (picked.kind) {
      case "type":
        toggleSetValue(state.types, picked.value);
        break;
      case "year":
        state.year = cycleYear(state.year, picked.value);
        break;
      case "primaryGenre":
        toggleSetValue(state.primaryGenres, picked.value);
        state.secondaryGenres.delete(picked.value);
        if (picked.slug) state.genreSlugs.set(picked.value, picked.slug);
        break;
      case "secondaryGenre":
        toggleSetValue(state.secondaryGenres, picked.value);
        state.primaryGenres.delete(picked.value);
        if (picked.slug) state.genreSlugs.set(picked.value, picked.slug);
        break;
      case "descriptor":
        toggleSetValue(state.descriptors, picked.value);
        break;
      case "language":
        toggleSetValue(state.languages, picked.value);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Release lists section (F1): own tabbed view next to RYM's native block
  // ---------------------------------------------------------------------------

  let releaseLists = null;
  let listsWrap = null;
  let listsRun = null; // { handle, done, total }
  let listsMessage = "";
  state.listsTab = null;
  state.listsShowNative = false;

  if (PAGE === "release") {
    try {
      releaseLists = parseReleaseListsSection(document);
    } catch (error) {
      console.warn("[RYM Chart Picker+] Could not parse the lists section:", error);
      releaseLists = null;
    }
  }

  function listsDisplayEntries() {
    const now = Date.now();
    return releaseLists.entries.map(page => resolveListEntry(page, listCache.lists[page.key], now));
  }

  function listsEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function startListsRate(keys) {
    if (listsRun || keys.length === 0) return;
    const total = Math.min(keys.length, settings.listFetchMax);
    listsMessage = "";
    listsRun = { handle: null, done: 0, total };
    listsRun.handle = fetchListsSequentially(keys, {
      onEach() {
        if (listsRun) listsRun.done++;
        renderReleaseLists();
      },
      onDone(summary) {
        listsRun = null;
        if (summary.blocked) listsMessage = "RYM blocked the fetch; open lists manually, they get rated as you visit them.";
        else if (summary.busy) listsMessage = "Another fetch is already running.";
        renderReleaseLists();
      }
    });
    renderReleaseLists();
  }

  function buildListRow(entry, compatUsers) {
    const row = listsEl("div", "rym-lists-row");
    if (entry.cover) {
      const img = listsEl("img", "rym-lists-cover");
      img.src = entry.cover;
      img.alt = "";
      row.appendChild(img);
    } else {
      row.appendChild(listsEl("div", "rym-lists-cover"));
    }

    const main = listsEl("div", "rym-lists-main");
    const title = listsEl("a", "", entry.title);
    title.href = safeListHref(entry);
    main.appendChild(title);
    main.appendChild(document.createTextNode(" "));
    const author = listsEl("a", "", entry.author);
    author.href = `/~${entry.author}`;
    main.appendChild(author);
    row.appendChild(main);

    const meta = listsEl("div", "rym-lists-meta");
    const { cls, provisional } = entry.cls;
    if (cls === "unknown") {
      meta.appendChild(listsEl("span", "rym-lists-chip rym-chip-other", "unrated"));
    } else {
      let label = Array.isArray(entry.categories) && entry.categories[0] ? String(entry.categories[0]) : cls;
      if (cls === "log" && /^listener'?s diary$/i.test(label)) label = "Diary";
      if (provisional) label = "log?";
      meta.appendChild(listsEl("span", `rym-lists-chip rym-chip-${cls}`, label));
    }
    if (entry.fetchedAt && entry.likes !== undefined) meta.appendChild(listsEl("span", "rym-lists-chip", `♥ ${entry.likes}`));
    if (entry.items) meta.appendChild(listsEl("span", "rym-lists-chip", `${entry.items} items`));
    if (compatUsers.has(String(entry.author).toLowerCase())) meta.appendChild(listsEl("span", "rym-lists-chip", "compat"));

    const star = listsEl("button", "rym-lists-star", isStarred(entry.key) ? "★" : "☆");
    star.type = "button";
    star.title = "Star this list";
    star.addEventListener("click", () => {
      toggleStarred(entry);
      refreshListsUi();
    });
    meta.appendChild(star);

    const select = document.createElement("select");
    select.title = "Classification";
    const current = listCache.lists[entry.key] && listCache.lists[entry.key].override || "auto";
    for (const value of ["auto", "curated", "log", "other"]) {
      const option = listsEl("option", "", value);
      option.value = value;
      option.selected = value === current;
      select.appendChild(option);
    }
    select.addEventListener("change", () => {
      setListOverride(entry.key, select.value === "auto" ? null : select.value);
      refreshListsUi();
    });
    meta.appendChild(select);
    row.appendChild(meta);
    return row;
  }

  function refreshListsUi() {
    renderReleaseLists();
    renderListsSection();
  }

  // ---- F2: lists by compatible users ----
  let compatListsRun = null; // { handle, done, total }
  let compatListsBlockedUser = null;
  let compatListsMessage = "";
  let compatModalEl = null;
  let compatModalRunning = null; // { handle, done, total } for "Rate N unrated"

  function staleCompatUsers() {
    const users = selectCompatUsers(compat, settings).map(user => user.username);
    const cache = listCache.compatLists || {};
    return users.filter(name => !isCompatListsFresh(cache[name.toLowerCase()], Date.now()));
  }

  function updateCompatListsButton() {
    const btn = $("rym-lists-compat");
    if (!btn) return;
    btn.disabled = false;
    btn.title = "";
    if (!compat) {
      btn.textContent = "Lists by compatible users";
      btn.disabled = true;
      btn.title = "Sync compatible users first";
    } else if (compatListsRun) {
      btn.textContent = `Fetching ${Math.min(compatListsRun.done + 1, compatListsRun.total)}/${compatListsRun.total}… · Stop`;
      btn.title = "Stop fetching";
    } else if (compatListsBlockedUser && staleCompatUsers().some(name => name.toLowerCase() === compatListsBlockedUser.toLowerCase())) {
      btn.textContent = `Open ${compatListsBlockedUser}'s lists`;
      btn.title = "RYM blocked the fetch; open the page and the script will save it";
    } else {
      compatListsBlockedUser = null;
      btn.textContent = "Lists by compatible users";
    }
  }

  function onCompatListsClick() {
    if (!compat) return;
    if (compatListsRun) {
      compatListsRun.handle && compatListsRun.handle.stop();
      return;
    }
    if (compatListsBlockedUser) {
      const user = compatListsBlockedUser;
      if (staleCompatUsers().some(name => name.toLowerCase() === user.toLowerCase())) {
        window.open(`/list/${encodeURIComponent(user)}/`, "_blank", "noopener,noreferrer");
        return;
      }
      compatListsBlockedUser = null;
    }
    const stale = staleCompatUsers().slice(0, COMPAT_LISTS_MAX_USERS);
    compatListsMessage = "";
    if (stale.length === 0) {
      openCompatModal();
      return;
    }
    compatListsRun = { handle: null, done: 0, total: stale.length };
    compatListsRun.handle = fetchUserListsSequentially(stale, {
      onEach() {
        if (compatListsRun) compatListsRun.done++;
        updateCompatListsButton();
      },
      onDone(summary) {
        compatListsRun = null;
        if (summary.busy) {
          compatListsMessage = "Another fetch is already running.";
        } else if (summary.blocked) {
          if (summary.fetched === 0) compatListsBlockedUser = summary.blockedUser;
          else compatListsMessage = `RYM blocked the fetch at ${summary.blockedUser}; open their lists page to save it.`;
        }
        updateCompatListsButton();
        if (!summary.busy && summary.fetched > 0) openCompatModal();
        else if (summary.busy) toast(compatListsMessage);
      }
    });
    updateCompatListsButton();
  }

  // Lowercased usernames currently selected as compatible (Top N, score, exclusions). Other cached buckets stay cached but unused.
  function selectedCompatSet() {
    try {
      return new Set(selectCompatUsers(compat, settings).map(user => user.username.toLowerCase()));
    } catch {
      return new Set();
    }
  }

  function compatDisplayEntries() {
    const out = [];
    const seen = new Set();
    const selected = selectedCompatSet();
    const now = Date.now();
    for (const [user, data] of Object.entries(listCache.compatLists || {})) {
      if (!selected.has(user.toLowerCase())) continue;
      for (const item of (data && Array.isArray(data.lists) ? data.lists : [])) {
        if (!item || !item.key || seen.has(item.key)) continue;
        seen.add(item.key);
        out.push(resolveListEntry(item, listCache.lists[item.key], now));
      }
    }
    return out;
  }

  function closeCompatModal() {
    if (compatModalEl) compatModalEl.remove();
    compatModalEl = null;
    document.removeEventListener("keydown", onCompatModalKey, true);
  }

  function onCompatModalKey(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeCompatModal();
    }
  }

  function openCompatModal() {
    if (!compatModalEl) {
      compatModalEl = document.createElement("div");
      compatModalEl.id = "rym-lists-modal";
      compatModalEl.addEventListener("click", event => {
        if (event.target === compatModalEl) closeCompatModal();
      });
      document.body.appendChild(compatModalEl);
      document.addEventListener("keydown", onCompatModalKey, true);
    }
    renderCompatModal();
  }

  function renderCompatModal() {
    if (!compatModalEl) return;
    compatModalEl.textContent = "";
    const box = listsEl("div", "rym-lists-modal-box");
    compatModalEl.appendChild(box);

    const all = compatDisplayEntries();
    const compatUsers = selectedCompatSet();
    const starredKeys = new Set(starred.lists.map(item => item.key));
    const curated = sortListsByScore(all.filter(e => e.cls.cls === "curated"), { compatUsers, starred: starredKeys });
    const unrated = all.filter(e => e.cls.cls === "unknown");
    const logs = all.filter(e => e.cls.cls === "log" || e.cls.cls === "other");

    const head = listsEl("div", "rym-lists-head");
    head.appendChild(listsEl("span", "rym-lists-title", `Lists by compatible users · ${all.length}`));
    const needFetch = all.filter(e => !e.fresh);
    if (compatModalRunning) {
      const btn = listsEl("button", "rym-lists-btn", `Rating ${Math.min(compatModalRunning.done + 1, compatModalRunning.total)}/${compatModalRunning.total}…`);
      btn.type = "button";
      btn.disabled = true;
      head.appendChild(btn);
      const stop = listsEl("button", "rym-lists-btn", "Stop");
      stop.type = "button";
      stop.addEventListener("click", () => compatModalRunning && compatModalRunning.handle && compatModalRunning.handle.stop());
      head.appendChild(stop);
    } else if (needFetch.length) {
      const n = Math.min(needFetch.length, settings.listFetchMax);
      const secs = Math.ceil(n * settings.listFetchDelayMs / 1000);
      const btn = listsEl("button", "rym-lists-btn", `Rate ${needFetch.length} unrated (~${secs}s)`);
      btn.type = "button";
      btn.addEventListener("click", () => startCompatModalRate(needFetch.map(e => e.url)));
      head.appendChild(btn);
    }
    const close = listsEl("button", "rym-lists-btn rym-lists-close", "×");
    close.type = "button";
    close.title = "Close";
    close.addEventListener("click", closeCompatModal);
    head.appendChild(close);
    box.appendChild(head);

    if (compatListsMessage) box.appendChild(listsEl("div", "rym-lists-status", compatListsMessage));

    const addGroup = (label, rows) => {
      box.appendChild(listsEl("div", "rym-lists-sub", `${label} (${rows.length})`));
      if (rows.length === 0) box.appendChild(listsEl("div", "rym-lists-empty", "Nothing here."));
      rows.forEach(e => box.appendChild(buildListRow(e, compatUsers)));
    };
    addGroup("Curated", curated);
    addGroup("Unrated", unrated);
    addGroup("Logs & other", logs);
  }

  function startCompatModalRate(urls) {
    if (compatModalRunning || urls.length === 0) return;
    compatListsMessage = "";
    compatModalRunning = { handle: null, done: 0, total: Math.min(urls.length, settings.listFetchMax) };
    compatModalRunning.handle = fetchListsSequentially(urls, {
      onEach() {
        if (compatModalRunning) compatModalRunning.done++;
        renderCompatModal();
      },
      onDone(summary) {
        compatModalRunning = null;
        if (summary.blocked) compatListsMessage = "RYM blocked the fetch; open lists manually, they get rated as you visit them.";
        else if (summary.busy) compatListsMessage = "Another fetch is already running.";
        renderCompatModal();
      }
    });
    renderCompatModal();
  }

  $("rym-lists-compat").addEventListener("click", onCompatListsClick);

  function renderListsSection() {
    const currentEl = $("rym-lists-current");
    const starredEl = $("rym-lists-starred");
    currentEl.textContent = "";
    starredEl.textContent = "";

    updateCompatListsButton();
    renderCompatModal();
    const findBtn = $("rym-lists-find");
    $("rym-lists-actions").classList.toggle("rym-picker-hidden", PAGE !== "release" && PAGE !== "chart");
    const findUrl = buildListSearchUrl(state, settings);
    findBtn.disabled = !findUrl;
    findBtn.title = findUrl || "Select a genre or a year first";

    if (PAGE === "list") {
      const key = listPathKey(location.href);
      const cached = key && listCache.lists[key];
      currentEl.appendChild(listsEl("div", "rym-lists-block-title", "This list"));
      if (cached) {
        currentEl.appendChild(buildListRow(resolveListEntry(cached, cached, Date.now()), selectedCompatSet()));
      } else {
        currentEl.appendChild(listsEl("div", "rym-lists-empty", "This list could not be read."));
      }
    }

    starredEl.appendChild(listsEl("div", "rym-lists-block-title", "Starred"));
    const items = sortStarred(starred.lists);
    if (items.length === 0) {
      starredEl.appendChild(listsEl("div", "rym-lists-empty", "No starred lists yet"));
      return;
    }
    const shown = state.starredShowAll ? items : items.slice(0, 10);
    for (const item of shown) {
      const rowEl = listsEl("div", "rym-lists-starred-item");
      const link = listsEl("a", "", item.title);
      link.href = safeListHref(item);
      rowEl.appendChild(link);
      rowEl.appendChild(listsEl("span", "", `· ${item.author}${item.likes !== undefined ? ` · ♥${item.likes}` : ""}`));
      const unstar = listsEl("button", "rym-lists-unstar", "×");
      unstar.type = "button";
      unstar.title = "Unstar";
      unstar.addEventListener("click", () => {
        toggleStarred(item);
        refreshListsUi();
      });
      rowEl.appendChild(unstar);
      starredEl.appendChild(rowEl);
    }
    if (items.length > 10) {
      const toggle = listsEl("a", "rym-lists-link", state.starredShowAll ? "show less" : `show all (${items.length})`);
      toggle.addEventListener("click", () => {
        state.starredShowAll = !state.starredShowAll;
        renderListsSection();
      });
      starredEl.appendChild(toggle);
    }
  }

  function renderReleaseLists() {
    if (PAGE !== "release" || !releaseLists || !releaseLists.container) return;
    try {
      const container = releaseLists.container;
      if (!container.parentNode) return;
      if (!listsWrap || !listsWrap.isConnected) {
        listsWrap = document.createElement("div");
        listsWrap.id = "rym-lists-wrap";
        container.parentNode.insertBefore(listsWrap, container);
      }
      container.classList.toggle("rym-lists-native-hidden", !state.listsShowNative);
      listsWrap.style.display = state.listsShowNative ? "none" : "";

      let view = document.getElementById("rym-lists-view");
      if (!view) {
        view = document.createElement("div");
        view.id = "rym-lists-view";
        listsWrap.appendChild(view);
      }
      view.textContent = "";

      const compatUsers = selectedCompatSet();
      const starredKeys = new Set(starred.lists.map(item => item.key));
      const all = listsDisplayEntries();
      const curated = sortListsByScore(all.filter(e => e.cls.cls === "curated"), { compatUsers, starred: starredKeys });
      const unrated = all.filter(e => e.cls.cls === "unknown");
      const logs = all.filter(e => e.cls.cls === "log");
      const others = all.filter(e => e.cls.cls === "other");
      const tabs = [
        { id: "curated", label: `Curated (${curated.length})` },
        { id: "unrated", label: `Unrated (${unrated.length})` },
        { id: "logs", label: `Logs & other (${logs.length + others.length})` },
        { id: "all", label: "All" }
      ];
      if (!tabs.some(t => t.id === state.listsTab)) {
        state.listsTab = curated.length ? "curated" : unrated.length ? "unrated" : "all";
      }

      const head = listsEl("div", "rym-lists-head");
      head.appendChild(listsEl("span", "rym-lists-title", `Lists · ${all.length}`));
      for (const tab of tabs) {
        const btn = listsEl("button", `rym-lists-tab${tab.id === state.listsTab ? " rym-lists-tab-on" : ""}`, tab.label);
        btn.type = "button";
        btn.addEventListener("click", () => {
          state.listsTab = tab.id;
          renderReleaseLists();
        });
        head.appendChild(btn);
      }

      const needFetch = all.filter(e => !e.fresh);
      if (listsRun) {
        const btn = listsEl("button", "rym-lists-btn", `Rating ${Math.min(listsRun.done + 1, listsRun.total)}/${listsRun.total}…`);
        btn.type = "button";
        btn.disabled = true;
        head.appendChild(btn);
        const stop = listsEl("button", "rym-lists-btn", "Stop");
        stop.type = "button";
        stop.addEventListener("click", () => listsRun && listsRun.handle && listsRun.handle.stop());
        head.appendChild(stop);
      } else if (needFetch.length) {
        const n = Math.min(needFetch.length, settings.listFetchMax);
        const secs = Math.ceil(n * settings.listFetchDelayMs / 1000);
        const btn = listsEl("button", "rym-lists-btn", `Rate ${needFetch.length} unrated (~${secs}s)`);
        btn.type = "button";
        btn.addEventListener("click", () => startListsRate(needFetch.map(e => e.url)));
        head.appendChild(btn);
      }

      const toggle = listsEl("a", "rym-lists-link", "Show RYM's view");
      toggle.addEventListener("click", () => {
        state.listsShowNative = true;
        renderReleaseLists();
      });
      head.appendChild(toggle);
      view.appendChild(head);

      if (listsMessage) view.appendChild(listsEl("div", "rym-lists-status", listsMessage));

      const addRows = rows => rows.forEach(e => view.appendChild(buildListRow(e, compatUsers)));
      const tab = state.listsTab;
      if (tab === "curated") addRows(curated);
      else if (tab === "unrated") addRows(unrated);
      else if (tab === "logs") {
        addRows(logs);
        if (others.length) {
          view.appendChild(listsEl("div", "rym-lists-sub", "Other"));
          addRows(others);
        }
      } else addRows(all);
      if (!view.querySelector(".rym-lists-row")) view.appendChild(listsEl("div", "rym-lists-empty", "Nothing here."));

      if (state.listsShowNative) {
        // The wrapper is hidden while RYM's view is shown, so keep a way back next to the native block.
        listsWrap.style.display = "";
        view.textContent = "";
        const back = listsEl("a", "rym-lists-link", "Show Chart Picker+ view");
        back.style.marginLeft = "0";
        back.addEventListener("click", () => {
          state.listsShowNative = false;
          renderReleaseLists();
        });
        view.appendChild(back);
      }
    } catch (error) {
      console.warn("[RYM Chart Picker+] Lists view failed; leaving RYM's section visible:", error);
      if (releaseLists && releaseLists.container) releaseLists.container.classList.remove("rym-lists-native-hidden");
      if (listsWrap) listsWrap.remove();
      listsWrap = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------

  function toast(message) {
    const old = document.querySelector(".rym-picker-toast");
    if (old) old.remove();

    const el = document.createElement("div");
    el.className = "rym-picker-toast";
    // Inline styles so the toast also works on the compat page, where no CSS is injected.
    el.style.cssText = "position:fixed;right:24px;top:55px;background:#202020;border:1px solid #555;color:#d7d7d7;padding:8px 11px;border-radius:3px;z-index:9999999;font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35)";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  if (PAGE === "chart") {
    state.bodyOpen = false;
  }

  render();
})();
