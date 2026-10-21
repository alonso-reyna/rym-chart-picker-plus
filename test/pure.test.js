const assert = require("assert");
const path = require("path");
const api = require(process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..", "rym-chart-picker-plus.user.js"));

const settings = { ...api.DEFAULT_SETTINGS };
const compat = { users: [
  { username: "bnsaiboy", score: 100, rank: 1 },
  { username: "Kai7", score: 97.2, rank: 2 },
  { username: "AmazingNutzo", score: 88.9, rank: 3 },
  { username: "Low", score: 55, rank: 4 }
], syncedAt: Date.now() };
const ctx = { ownUsername: "alonsoreyna", compat, pageTypeSlug: "album" };

// slugs
assert.equal(api.rymSlug("Alternative R&B"), "alternative-randb");
assert.equal(api.rymSlug("Singer-Songwriter"), "singer-songwriter");
assert.equal(api.rymSlug("androgynous vocals"), "androgynous-vocals");
assert.equal(api.slugFromGenreHref("/genre/alternative-randb/"), "alternative-randb");
assert.equal(api.labelFromSlug("indie-folk"), "Indie Folk");

// types
assert.equal(api.typeFromText("comp").slug, "comp");
assert.equal(api.typeFromText("Compilation").slug, "comp");
assert.equal(api.typeFromText("djmix").slug, "djmix");
assert.equal(api.typeFromText("DJ Mix").slug, "djmix");
assert.equal(api.typeFromText("musicvideo").slug, "musicvideo");
assert.equal(api.typeFromText("unauth").slug, "unauth");
assert.equal(api.typeFromText("Bootleg / Unauthorized").slug, "unauth");

// year
assert.equal(api.yearSegment({ mode: "none" }), "all-time");
assert.equal(api.yearSegment({ mode: "year", from: 2015, to: 2015 }), "2015");
assert.equal(api.yearSegment({ mode: "decade", from: 2015, to: 2015 }), "2010s");
assert.equal(api.yearSegment({ mode: "range", from: 2017, to: 2013 }), "2013-2017");
assert.deepEqual(api.parseYearSegment("2010s"), { mode: "decade", from: 2010, to: 2019 });
assert.deepEqual(api.parseYearSegment("2010-2015"), { mode: "range", from: 2010, to: 2015 });
assert.equal(api.parseYearSegment("all-time").mode, "none");
let y = api.cycleYear({ mode: "none" }, 2015); assert.equal(y.mode, "year");
y = api.cycleYear(y, 2015); assert.equal(y.mode, "decade");
y = api.cycleYear(y, 2015); assert.equal(y.mode, "none");
assert.equal(api.yearSegment(api.rangeAround(2019, 2)), "2017-2021");

// chart URL from release picks
const s = api.createState();
s.primaryGenres.add("Alternative R&B"); s.genreSlugs.set("Alternative R&B", "alternative-randb");
s.secondaryGenres.add("Art Pop");
s.descriptors.add("androgynous vocals");
s.year = { mode: "year", from: 2019, to: 2019 };
assert.equal(api.buildChartUrl(s, settings, ctx),
  "https://rateyourmusic.com/charts/top/album/2019/g:alternative-randb/d:androgynous-vocals/s:art-pop/");

// compat users
assert.deepEqual(api.selectCompatUsers(compat, settings).map(u => u.username), ["bnsaiboy", "Kai7", "AmazingNutzo", "Low"]);
assert.deepEqual(api.selectCompatUsers(compat, { ...settings, compatMinScore: 70 }).map(u => u.username), ["bnsaiboy", "Kai7", "AmazingNutzo"]);
// top N counts distinct, non-excluded users; exclusions and duplicates do not eat the quota
assert.deepEqual(api.selectCompatUsers({ users: [{ username: "Alice", score: 100 }, { username: "alice", score: 99 }, { username: "Bob", score: 98 }, { username: "Cy", score: 97 }] },
  { ...settings, compatTopN: 2, compatExcluded: ["bob"] }).map(u => u.username), ["Alice", "Cy"]);
assert.deepEqual(api.selectCompatUsers({ users: [null, { username: null, score: 100 }, { username: "ok", score: "88" }] }, settings).map(u => [u.username, u.score]), [["ok", 88]]);
assert.deepEqual(api.selectCompatUsers(compat, { ...settings, compatTopN: 2 }).map(u => u.username), ["bnsaiboy", "Kai7"]);
assert.deepEqual(api.selectCompatUsers(compat, { ...settings, compatExcluded: ["kai7"] }).map(u => u.username), ["bnsaiboy", "AmazingNutzo", "Low"]);
assert.equal(api.buildUserSegment(api.createState(), { ...settings, userFilters: ["compat"], compatTopN: 3 }, ctx), "u:bnsaiboy,Kai7,AmazingNutzo");
assert.equal(api.buildUserSegment(api.createState(), { ...settings, userFilters: ["compat", "following"], compatTopN: 3, compatIncludeMe: true }, ctx),
  "u:followed_by:alonsoreyna,alonsoreyna,bnsaiboy,Kai7,AmazingNutzo");
// case-insensitive dedupe across sources
assert.equal(api.buildUserSegment(api.createState(), { ...settings, userFilters: ["compat", "myself"], compatTopN: 1 }, { ...ctx, ownUsername: "BNSAIBOY" }), "u:BNSAIBOY");
assert.equal(api.buildUserSegment(api.createState(), settings, ctx), "");

// parse chart path and rebuild
const { state: cs, listing } = api.parseChartPath("/charts/esoteric/album,ep/2010-2015/g:indie-folk,-slowcore/d:melancholic/s:art-pop/l:en/u:a,b/");
assert.equal(listing, "esoteric");
assert.deepEqual([...cs.types], ["album", "ep"]);
assert.equal(cs.year.mode, "range");
assert.deepEqual([...cs.primaryGenres], ["Indie Folk", "-Slowcore"]);
assert.deepEqual(cs.urlUsers, ["a", "b"]);
assert.equal(api.buildChartUrl(cs, { ...settings, listingMode: "esoteric" }, { ...ctx, pageTypeSlug: "" }),
  "https://rateyourmusic.com/charts/esoteric/album,ep/2010-2015/g:indie-folk,-slowcore/d:melancholic/s:art-pop/l:en/u:a,b/");

// must contain all: leading "all" token
const m = api.parseChartPath("/charts/top/album/all-time/g:alternative-randb/s:all,cloud-rap,ambient-pop/").state;
assert.equal(m.matchAll.secondary, true); assert.equal(m.matchAll.primary, false);
assert.deepEqual([...m.secondaryGenres], ["Cloud Rap", "Ambient Pop"]);
assert.equal(api.buildChartUrl(m, settings, { ...ctx, pageTypeSlug: "" }),
  "https://rateyourmusic.com/charts/top/album/all-time/g:alternative-randb/s:all,cloud-rap,ambient-pop/");
const m2 = api.createState(); m2.secondaryGenres.add("Cloud Rap"); m2.matchAll.secondary = true; m2.descriptors.add("cold"); m2.matchAll.descriptors = true;
assert.equal(api.buildChartUrl(m2, settings, ctx), "https://rateyourmusic.com/charts/top/album/all-time/d:all,cold/s:all,cloud-rap/");

// a chart URL is reproduced as-is: explicit "all types" and absent l:/u: survive stored defaults
const all = api.parseChartPath("/charts/top/" + api.ALL_TYPE_SEGMENT + "/all-time/").state;
assert.equal(all.types.size, api.ALL_TYPE_SEGMENT.split(",").length);
const sneaky = { ...settings, defaultTypeMode: "custom", defaultTypeCustom: ["single"], defaultLanguageMode: "custom", defaultLanguageCustom: ["ja"], userFilters: ["myself"] };
assert.equal(api.buildChartUrl(all, sneaky, ctx), "https://rateyourmusic.com/charts/top/" + api.ALL_TYPE_SEGMENT + "/all-time/");
const plain = api.parseChartPath("/charts/top/album/2010-2015/g:indie-folk/").state;
assert.equal(api.buildChartUrl(plain, sneaky, ctx), "https://rateyourmusic.com/charts/top/album/2010-2015/g:indie-folk/");
// but a fresh release-page state does use the defaults
assert.equal(api.buildChartUrl(api.createState(), sneaky, ctx), "https://rateyourmusic.com/charts/top/single/all-time/l:ja/u:alonsoreyna/");
// aliases in the URL are canonicalized; excluded descriptors keep their sign
assert.deepEqual([...api.parseChartPath("/charts/top/compilation,ep/all-time/").state.types], ["comp", "ep"]);
assert.match(api.buildChartUrl(api.parseChartPath("/charts/top/album/all-time/d:-live/").state, settings, ctx), /\/d:-live\//);
assert.deepEqual(api.canonicalTypeSlugs(["Compilation", "comp", "nope", "DJ Mix"]), ["comp", "djmix"]);

// settings normalization
const n = api.normalizeSettings({ theme: "weird", compatTopN: "999", userFilters: [], highlightColor: "red" });
assert.equal(n.theme, "night"); assert.equal(n.compatTopN, 100); assert.deepEqual(n.userFilters, ["all"]); assert.equal(n.highlightColor, "#ffb000");
assert.notStrictEqual(api.normalizeSettings({}).userFilters, api.DEFAULT_SETTINGS.userFilters);
assert.deepEqual(api.normalizeSettings({ userFilters: ["all", "compat", "compat", "bogus"] }).userFilters, ["compat"]);
assert.deepEqual(api.normalizeSettings({ defaultTypeCustom: ["compilation"] }).defaultTypeCustom, ["comp"]);
assert.deepEqual(api.normalizeSettings({ defaultLanguageCustom: ["ja", "klingon"] }).defaultLanguageCustom, ["ja"]);
assert.doesNotThrow(() => api.normalizeSettings(JSON.parse('{"compatTopN":{"toString":null},"ownUsername":{}}')));
// old settings (pre 1.2.0) had minScore 70 cutting "top N"; it is reset once, then respected
assert.equal(api.normalizeSettings({ compatMinScore: 70 }).compatMinScore, 0);
assert.equal(api.normalizeSettings({ compatMinScore: 70, compatMinScoreV2: true }).compatMinScore, 70);
// year edge cases
assert.equal(api.parseYearSegment("2015s").mode, "none");
assert.equal(api.yearSegment(api.parseYearSegment("2010s")), "2010s");
assert.equal(api.yearSegment(api.rangeAround("2000", 2)), "1998-2002");
assert.equal(api.slugFromGenreHref("/genre/foo%/"), "foo%");

// language
assert.equal(api.languageCode("English"), "en");
assert.equal(api.languageCode("ja"), "ja");

// release type grid / presets (mirror RYM's "Music releases" filter)
assert.deepEqual(api.TYPE_GRID.flat().sort(), api.ALL_TYPE_SEGMENT.split(",").sort());
assert.deepEqual(api.TYPE_PRESETS.main, ["album", "ep", "mixtape", "djmix"]);
assert.equal(api.TYPE_PRESETS.all.join(","), api.ALL_TYPE_SEGMENT);
for (const slug of Object.values(api.TYPE_PRESETS).flat()) assert.ok(api.typeFromText(slug), slug);

// lists: classification
assert.equal(api.classifyListCategories(["Listener's Diary"], 1), "log");
assert.equal(api.classifyListCategories(["Best Of", "Listener's Diary"], 50), "log");
assert.equal(api.classifyListCategories(["Cover Art Themes"], 9), "other");
assert.equal(api.classifyListCategories(["Shoegaze"], 0), "curated");
assert.equal(api.classifyListCategories(["1994"], 0), "curated");
assert.equal(api.classifyListCategories([], 3), "curated");
assert.equal(api.classifyListCategories([], 2), "other");
assert.equal(api.classifyListCategories([], null), "unknown");
assert.equal(api.classifyListTitle("listening log 2026"), "log");
assert.equal(api.classifyListTitle("2024 : LOG"), "log");
assert.equal(api.classifyListTitle("*"), "log");
assert.equal(api.classifyListTitle("covers i do like \u{1F604} (w.i.p.)"), "log");
assert.equal(api.classifyListTitle("Ranking EPs of 2024"), "unknown");
assert.deepEqual(api.classifyList({ title: "listening log 2026" }), { cls: "log", provisional: true });
assert.deepEqual(api.classifyList({ title: "Ranking EPs of 2024" }), { cls: "unknown", provisional: false });
assert.deepEqual(api.classifyList({ title: "listening log 2026", categories: ["Best Of"], likes: 4, fetchedAt: 1 }), { cls: "curated", provisional: false });
assert.deepEqual(api.classifyList({ title: "x", categories: ["Best Of"], likes: 4, fetchedAt: 1, override: "log" }), { cls: "log", provisional: false });
// lists: scoring
const listCtx = { compatUsers: new Set(["aaronnotaaron"]), starred: new Set(["/list/zoeysaxon/releases-of-2024-ranked/"]) };
const l1 = { key: "/list/troutmask/canon/", title: "Canon", author: "troutmask", likes: 212 };
const l2 = { key: "/list/aaronnotaaron/eps/", title: "Ranking EPs of 2024", author: "AaronnotAaron", likes: 9 };
const l3 = { key: "/list/zoeysaxon/releases-of-2024-ranked/", title: "Releases of 2024 Ranked", author: "zoeysaxon", likes: 3 };
assert.ok(api.scoreList(l1, listCtx) > api.scoreList(l2, listCtx));
assert.ok(api.scoreList(l3, listCtx) > api.scoreList(l1, listCtx));
assert.deepEqual(api.sortListsByScore([l1, l2, l3], listCtx).map(l => l.key), [l3.key, l1.key, l2.key]);

console.log("all tests passed");
