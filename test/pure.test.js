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

// film compatibles (film/music/both)
{
  const compatFilm = { users: [{ username: "phowbee", score: 100, rank: 1 }, { username: "kai7", score: 90, rank: 2 }] };
  const fctx = { ...ctx, compatFilm };
  const fstate = api.createFilmState(); fstate.urlUsers = null;
  const fset = { ...settings, userFilters: ["compat"], compatTopN: 2 };
  assert.equal(api.buildUserSegment(fstate, fset, fctx), "u:phowbee,kai7");
  assert.equal(api.buildUserSegment(fstate, { ...fset, filmCompatSource: "music" }, fctx), "u:bnsaiboy,Kai7");
  assert.equal(api.buildUserSegment(fstate, { ...fset, filmCompatSource: "both" }, fctx), "u:phowbee,kai7,bnsaiboy");
  assert.equal(api.buildUserSegment(fstate, { ...fset, filmCompatSource: "both", compatExcluded: ["phowbee"] }, fctx), "u:kai7,bnsaiboy");
  assert.equal(api.buildUserSegment(fstate, fset, ctx), "");
  assert.equal(api.compatScopeFromSearch("?user=alonsoreyna&scope=film"), "film");
  assert.equal(api.compatScopeFromSearch("user=alonsoreyna&scope=film"), "film");
  assert.equal(api.compatScopeFromSearch("?user=alonsoreyna"), "music");
  assert.equal(api.normalizeSettings({ filmCompatSource: "x" }).filmCompatSource, "film");
  assert.equal(api.normalizeSettings({ filmCompatSource: "both" }).filmCompatSource, "both");
  assert.equal(api.DEFAULT_SETTINGS.filmCompatSource, "film");
}

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
assert.equal(api.classifyListTitle("Catalog of Dreams"), "unknown");
assert.equal(api.classifyListTitle("Albumlog 2026"), "log");
assert.deepEqual(api.classifyList({ title: "x", override: "weird" }), { cls: "unknown", provisional: false });
// lists: scoring
const listCtx = { compatUsers: new Set(["aaronnotaaron"]), starred: new Set(["/list/zoeysaxon/releases-of-2024-ranked/"]) };
const l1 = { key: "/list/troutmask/canon/", title: "Canon", author: "troutmask", likes: 212 };
const l2 = { key: "/list/aaronnotaaron/eps/", title: "Ranking EPs of 2024", author: "AaronnotAaron", likes: 9 };
const l3 = { key: "/list/zoeysaxon/releases-of-2024-ranked/", title: "Releases of 2024 Ranked", author: "zoeysaxon", likes: 3 };
assert.ok(api.scoreList(l1, listCtx) > api.scoreList(l2, listCtx));
assert.ok(api.scoreList(l3, listCtx) > api.scoreList(l1, listCtx));
assert.deepEqual(api.sortListsByScore([l1, l2, l3], listCtx).map(l => l.key), [l3.key, l1.key, l2.key]);

// lists: keys and text parsers
assert.equal(api.listPathKey("https://rateyourmusic.com/list/AdonTomas/listening-log-2026/2/?x=1#y"), "/list/adontomas/listening-log-2026/");
assert.equal(api.listPathKey("/list/adontomas/listening-log-2026"), "/list/adontomas/listening-log-2026/");
assert.equal(api.listPathKey("/list/adontomas/"), null);
assert.equal(api.listPathKey("/release/album/ecco2k/e/"), null);
assert.equal(api.parseListIdText("[List1547652] |  +1"), 1547652);
assert.equal(api.parseLikesText("+1"), 1);
assert.equal(api.parseLikesText("+1,204"), 1204);
assert.equal(api.parseLikesText(""), 0);
assert.equal(api.parseItemsFromNav("369 - 345"), 369);
assert.equal(api.parseItemsFromNav("Page"), null);
assert.equal(api.parseItemsFromMeta("Created: 01/02/2026 | Updated: 10/19/2026 | 369 items"), 369);
// lists: search url
const searchState = api.createState();
searchState.primaryGenres.add("cloud-rap");
searchState.year = api.parseYearSegment("2010s");
const searchSettings = { ...api.DEFAULT_SETTINGS };
assert.equal(api.buildListSearchUrl(searchState, searchSettings), "https://rateyourmusic.com/search?searchterm=Cloud%20Rap%202010s&searchtype=" + api.DEFAULT_SETTINGS.listSearchType);
assert.equal(api.buildListSearchUrl(api.createState(), searchSettings), null);
assert.equal(api.normalizeSettings({ listFetchMax: 500, listFetchDelayMs: 10 }).listFetchMax, 100);
assert.equal(api.normalizeSettings({ listFetchMax: 500, listFetchDelayMs: 10 }).listFetchDelayMs, 1000);

// lists: cache pruning
const now = Date.now();
const old = now - 40 * 24 * 3600 * 1000;
const cache = { version: 1, lists: {
  "/list/a/x/": { key: "/list/a/x/", fetchedAt: old },
  "/list/a/y/": { key: "/list/a/y/", fetchedAt: old, override: "log" },
  "/list/a/z/": { key: "/list/a/z/", fetchedAt: old },
  "/list/a/w/": { key: "/list/a/w/", fetchedAt: now }
} };
const pruned = api.pruneListCache(cache, new Set(["/list/a/z/"]), now);
assert.deepEqual(Object.keys(pruned.lists).sort(), ["/list/a/w/", "/list/a/y/", "/list/a/z/"]);
assert.equal(api.isListEntryFresh({ fetchedAt: old }, now), false);
assert.equal(api.isListEntryFresh({ fetchedAt: old, override: "log" }, now), true);
const big = { version: 1, lists: {} };
for (let i = 0; i < api.LIST_CACHE_MAX + 1; i++) big.lists[`/list/u/${i}/`] = { key: `/list/u/${i}/`, fetchedAt: now - i };
const prunedBig = api.pruneListCache(big, new Set([`/list/u/${api.LIST_CACHE_MAX}/`]), now);
assert.equal(Object.keys(prunedBig.lists).length, api.LIST_CACHE_MAX);
assert.ok(prunedBig.lists[`/list/u/${api.LIST_CACHE_MAX}/`]);

// ---- fix wave: keys, nav, resolver, merges, queue, release parser ----
assert.equal(api.listPathKey("/list/u/1994/"), "/list/u/1994/");
assert.equal(api.listPathKey("/list/u/1994/2/"), "/list/u/1994/");
assert.equal(api.listPathKey("/list/U/slug/15"), "/list/u/slug/");
assert.equal(api.listPathKey("/list/u/slug/extra/"), null);
assert.equal(api.listPathKey("/list/u/"), null);
assert.equal(api.listPathKey("/list/u/slug/2/3/"), null);
// Hrefs externos nunca llegan a href= ni a fetch: siempre la ruta relativa canónica.
assert.equal(api.safeListHref({ url: "https://evil.example/list/u/slug/" }), "/list/u/slug/");
assert.equal(api.safeListHref({ key: "/list/u/slug/", url: "javascript:alert(1)" }), "/list/u/slug/");
assert.equal(api.safeListHref({ url: "javascript:alert(1)" }), "#");
assert.equal(api.safeListHref(null), "#");
assert.equal(api.parseItemsFromNav("344 - 320 369 - 345 319 - 295 19 - 1"), 369);
assert.equal(api.parseItemsFromNav("1,204 - 1,180 1,229 - 1,205"), 1229);
assert.equal(api.parseItemsFromNav("1,204 - 1,180"), 1204);

// expiry: stale entry without override is unread; override and star survive
const T = Date.now();
const staleOld = T - 31 * 24 * 3600 * 1000;
const page = { key: "/list/a/x/", url: "/list/a/x/", title: "Best of x", author: "a" };
const rStale = api.resolveListEntry(page, { title: "Best of x (full)", categories: ["Best Of"], likes: 50, items: 9, fetchedAt: staleOld }, T);
assert.equal(rStale.fresh, false);
assert.deepEqual(rStale.cls, { cls: "unknown", provisional: false });
assert.equal(rStale.likes, undefined);
assert.equal(rStale.fetchedAt, undefined);
assert.equal(rStale.title, "Best of x (full)");
const rStaleLog = api.resolveListEntry({ ...page, title: "listening log" }, { categories: ["Best Of"], likes: 50, fetchedAt: staleOld }, T);
assert.deepEqual(rStaleLog.cls, { cls: "log", provisional: true });
const rFresh = api.resolveListEntry(page, { categories: ["Best Of"], likes: 50, fetchedAt: T - 1000 }, T);
assert.equal(rFresh.fresh, true);
assert.equal(rFresh.cls.cls, "curated");
const rOver = api.resolveListEntry(page, { categories: ["Best Of"], likes: 50, fetchedAt: staleOld, override: "other" }, T);
assert.equal(rOver.fresh, true);
assert.equal(rOver.cls.cls, "other");
assert.equal(api.resolveListEntry(page, null, T).fresh, false);
assert.equal(api.isListEntryFresh({ fetchedAt: staleOld, override: "weird" }, T), false);

// pruning: exact removed key; override and star protected; ties keep insertion order
const pr = { version: 1, lists: {} };
for (let i = 0; i < api.LIST_CACHE_MAX + 1; i++) pr.lists[`/list/u/s${i}/`] = { key: `/list/u/s${i}/`, fetchedAt: T - 1000 + i };
pr.lists["/list/u/s0/"].override = "log"; // oldest but protected
const prOut = api.pruneListCache(pr, new Set(["/list/u/s1/"]), T);
assert.ok(prOut.lists["/list/u/s0/"] && prOut.lists["/list/u/s1/"]);
assert.equal(prOut.lists["/list/u/s2/"], undefined); // oldest unprotected goes
assert.ok(prOut.lists["/list/u/s3/"]);
assert.equal(Object.keys(prOut.lists).length, api.LIST_CACHE_MAX);
const tie = { version: 1, lists: {} };
for (let i = 0; i < api.LIST_CACHE_MAX + 1; i++) tie.lists[`/list/u/t${i}/`] = { key: `/list/u/t${i}/`, fetchedAt: T };
const tieOut = api.pruneListCache(tie, new Set(), T);
assert.equal(tieOut.lists["/list/u/t0/"], undefined);
assert.ok(tieOut.lists["/list/u/t1/"]);

// cross-tab merges
const mk = (key, fetchedAt, extra) => ({ key, fetchedAt, ...extra });
const mergedC = api.mergeListCaches(
  { lists: { a: mk("a", 10, { likes: 1 }), b: mk("b", 5, { override: "log" }), c: mk("c", 1, { override: "other" }), d: mk("d", 1, { override: "log" }) },
    compatLists: { u: { fetchedAt: 5, lists: [1] } } },
  { lists: { a: mk("a", 20, { likes: 2, override: "curated" }), b: mk("b", 9, { likes: 7 }), c: mk("c", 1, { override: "log" }), e: mk("e", 3), d: mk("d", 1, { override: "log" }) },
    compatLists: { u: { fetchedAt: 9, lists: [2] }, v: { fetchedAt: 1, lists: [] } } },
  new Set(["d"])
);
assert.equal(mergedC.lists.a.likes, 2); // newer fetchedAt wins
assert.equal(mergedC.lists.a.override, "curated"); // override from either side beats none
assert.equal(mergedC.lists.b.likes, 7);
assert.equal(mergedC.lists.b.override, "log"); // local override kept over newer remote without one
assert.equal(mergedC.lists.c.override, "other"); // both non-null: in-memory side wins
assert.equal(mergedC.lists.d.override, undefined); // removed in this tab
assert.ok(mergedC.lists.e);
assert.deepEqual(mergedC.compatLists.u.lists, [2]);
assert.ok(mergedC.compatLists.v);
const mergedS = api.mergeStarred(
  { lists: [{ key: "a", starredAt: 5 }, { key: "b", starredAt: 9 }] },
  { lists: [{ key: "a", starredAt: 8 }, { key: "c", starredAt: 7 }, { key: "x", starredAt: 99 }] },
  new Set(["x"])
);
assert.deepEqual(mergedS.lists.map(i => i.key + i.starredAt), ["b9", "a8", "c7"]);
// starred order: eleven stars, newest first, re-starred goes first
const eleven = Array.from({ length: 11 }, (_, i) => ({ key: "k" + i, starredAt: i + 1 }));
assert.equal(api.sortStarred(eleven)[0].key, "k10");
assert.equal(api.sortStarred(eleven).slice(0, 10).some(i => i.key === "k0"), false);
assert.equal(api.sortStarred([{ key: "a", starredAt: 1 }, { key: "a2", starredAt: 50 }])[0].key, "a2");

// fetch queue: 200,200,403 keeps two, makes exactly three calls, never a fourth; 503 likewise
(async () => {
  for (const bad of [403, 503]) {
    const calls = [];
    const stored = [];
    const statuses = [200, 200, bad, 200];
    const summary = await api.runFetchQueue(["u1", "u2", "u3", "u4"], {
      fetchOne: async item => { calls.push(item); return statuses[calls.length - 1] === 200 ? { item } : null; },
      store: (item, result) => stored.push(item),
      wait: async () => {},
      isStopped: () => false
    });
    assert.deepEqual(calls, ["u1", "u2", "u3"]);
    assert.deepEqual(stored, ["u1", "u2"]);
    assert.equal(summary.fetched, 2);
    assert.equal(summary.blocked, true);
    assert.equal(summary.blockedItem, "u3");
  }
  let stop = false;
  const s2 = await api.runFetchQueue(["a", "b", "c"], { fetchOne: async i => ({ i }), store: () => { stop = true; }, wait: async () => {}, isStopped: () => stop });
  assert.equal(s2.fetched, 1);
  assert.equal(s2.blocked, false);
})().then(() => console.log("queue tests passed"), error => { console.error(error); process.exit(1); });

// release parser on a tiny fake DOM
class FakeNode {
  constructor(tag, { id = "", className = "", href = null, text = "", src = null } = {}) {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.parentElement = null;
    this.children = [];
    this._href = href;
    this._src = src;
    this._text = text;
  }
  add(...nodes) { for (const n of nodes) { n.parentElement = this; this.children.push(n); } return this; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(""); }
  all() { return this.children.flatMap(c => [c, ...c.all()]); }
  contains(node) { for (let n = node; n; n = n.parentElement) if (n === this) return true; return false; }
  getAttribute(name) { return name === "href" ? this._href : name === "src" ? this._src : null; }
  querySelectorAll(sel) {
    const pool = this.all();
    if (sel === "a[href]") return pool.filter(n => n.tagName === "A" && n._href != null);
    throw new Error("unsupported selector " + sel);
  }
  querySelector(sel) {
    const pool = this.all();
    if (sel === 'a[href^="/~"]') return pool.find(n => n.tagName === "A" && n._href && n._href.startsWith("/~")) || null;
    if (sel === "img[src]") return pool.find(n => n.tagName === "IMG" && n._src != null) || null;
    throw new Error("unsupported selector " + sel);
  }
}
const el = (tag, opts) => new FakeNode(tag, opts);
const link = (href, text) => el("a", { href, text });
const card = (user, slug, title) => el("div", { className: "release_list_item" }).add(el("a", { href: `/list/${user}/${slug}/` }).add(el("img", { src: "/c.jpg" })), link(`/list/${user}/${slug}/`, title), link(`/~${user}`, user));
const page2 = (...bodyNodes) => { const html = el("html"); const body = el("body"); html.add(body); body.add(...bodyNodes); return html; };
const filler = n => Array.from({ length: n }, (_, i) => link(`/x/${i}`, "x" + i));

// 1. no lists at all / markup foreign to the fixture: null, no throw
assert.equal(api.parseReleaseListsSection(page2(el("div").add(...filler(10)))), null);
// 2. one isolated list link in a review: null
assert.equal(api.parseReleaseListsSection(page2(el("div", { id: "review" }).add(link("/list/me/favs/", "my favs"), ...filler(10)))), null);
// 3. a good section plus a stray full list link in the header: section found, header link ignored
const sec = el("div", { className: "section_lists" }).add(el("h2", { text: "Lists" }), card("a", "one", "One"), card("b", "two", "Two"));
const hdr = el("div", { className: "header_menu" }).add(link("/list/me/favorites/", "Favorites"));
const doc3 = page2(hdr, el("div", { id: "content" }).add(...filler(20), sec));
const r3 = api.parseReleaseListsSection(doc3);
assert.ok(r3 && r3.container === sec);
assert.deepEqual(r3.entries.map(e => e.key), ["/list/a/one/", "/list/b/two/"]);
assert.equal(r3.entries[0].author, "a");
assert.equal(r3.entries[0].cover, "/c.jpg");
// 4. stray list link in a comment area outside the section: container must not widen to content/body
const doc4 = page2(el("div", { id: "content" }).add(...filler(20), sec, el("div", { id: "comments" }).add(link("/list/z/other/", "Other"))));
const r4 = api.parseReleaseListsSection(doc4);
assert.equal(r4, null); // LCA is #content: rejected, feature stays off
// 5. single native card: null
assert.equal(api.parseReleaseListsSection(page2(el("div", { id: "content" }).add(...filler(20), el("div").add(card("a", "one", "One"))))), null);
// 6. two sections: the one with most distinct lists wins
const small = el("div", { className: "box" }).add(card("a", "one", "One"), card("b", "two", "Two"));
const big3 = el("div", { className: "box" }).add(card("c", "x", "X"), card("d", "y", "Y"), card("e", "z", "Z"));
const r6 = api.parseReleaseListsSection(page2(el("div", { id: "wrap" }).add(...filler(30), small), el("div", { id: "wrap2" }).add(...filler(30), big3)));
assert.ok(r6 && r6.container === big3 && r6.entries.length === 3);
// 7. container with too many anchors per entry is rejected
const noisy = el("div", { className: "box" }).add(card("a", "one", "One"), card("b", "two", "Two"), ...filler(30));
assert.equal(api.parseReleaseListsSection(page2(...filler(60), noisy)), null);

// film charts
{
  let fp = api.parseChartPath("/charts/top/film/all-time/g:comedy%2d1/d:regional/s:cartoon/separate:live,archival,soundtrack/");
  assert.equal(fp.state.media, "film");
  assert.equal(fp.state.types.size, 0);
  assert.equal(api.buildChartUrl(fp.state, settings, ctx),
    "https://rateyourmusic.com/charts/top/film/all-time/g:comedy-1/d:regional/s:cartoon/separate:live,archival,soundtrack/");
  fp = api.parseChartPath("/charts/top/film/2000-2010/g:all,animation,family/separate:live,archival,soundtrack/");
  assert.equal(api.buildChartUrl(fp.state, settings, ctx),
    "https://rateyourmusic.com/charts/top/film/2000-2010/g:all,animation,family/separate:live,archival,soundtrack/");
  const fs0 = api.createFilmState();
  assert.equal(fs0.media, "film");
  assert.equal(api.FILM_SEPARATE_SEGMENT, "separate:live,archival,soundtrack");
  assert.equal(api.buildChartUrl(fs0, settings, ctx), "https://rateyourmusic.com/charts/top/film/all-time/separate:live,archival,soundtrack/");
  assert.equal(api.parseChartPath("/charts/top/album/2010-2015/g:indie-folk/").state.media, "music");
  assert.equal(api.createState().media, "music");
}

// film genre slugs
{
  assert.equal(api.filmGenreNameFromHref("/film_genre/Computer+Animation/"), "Computer Animation");
  assert.equal(api.filmGenreNameFromHref("/genre/x/"), null);
  assert.equal(api.filmGenreSlug("Comedy", {}), "comedy-1");
  assert.equal(api.filmGenreSlug("Computer Animation", {}), "computer-animation");
  assert.equal(api.filmGenreSlug("Horror Comedy", { "horror comedy": "horror-comedy-2" }), "horror-comedy-2");
  assert.equal(api.filmGenreSlug("-Comedy", {}), "-comedy-1");
  const a = (text, href) => ({ textContent: text, getAttribute: () => href });
  const root = { querySelectorAll: sel => (sel === 'a.genre[href^="/genre/"]' ? [a(" Comedy ", "/genre/comedy-1/"), a("Bad", "/foo/")] : []) };
  assert.deepEqual(api.parseFilmGenreSlugs(root), { comedy: "comedy-1" });
  assert.deepEqual(api.mergeFilmGenreSlugs({ a: "a-1", b: "b-1" }, { b: "b-2" }), { a: "a-1", b: "b-2" });
}

// duckduckgo / letterboxd
{
  assert.equal(api.buildDuckyUrl("letterboxd.com/film", "Monster House", 2006),
    "https://duckduckgo.com/?q=" + encodeURIComponent("\\site:letterboxd.com/film Monster House 2006"));
  assert.equal(api.buildDuckyUrl("rateyourmusic.com/film", "Lilo & Stitch", null, false),
    "https://duckduckgo.com/?q=" + encodeURIComponent("site:rateyourmusic.com/film Lilo & Stitch"));
  assert.deepEqual(api.parseLetterboxdOgTitle("Monster House (2006)"), { title: "Monster House", year: 2006 });
  assert.deepEqual(api.parseLetterboxdOgTitle("8½ (1963)"), { title: "8½", year: 1963 });
  assert.deepEqual(api.parseLetterboxdOgTitle("Untitled"), { title: "Untitled", year: null });
}

console.log("all tests passed");
