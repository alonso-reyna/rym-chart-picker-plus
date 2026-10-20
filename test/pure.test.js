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
assert.deepEqual(api.selectCompatUsers(compat, settings).map(u => u.username), ["bnsaiboy", "Kai7", "AmazingNutzo"]);
assert.deepEqual(api.selectCompatUsers(compat, { ...settings, compatTopN: 2 }).map(u => u.username), ["bnsaiboy", "Kai7"]);
assert.deepEqual(api.selectCompatUsers(compat, { ...settings, compatExcluded: ["kai7"] }).map(u => u.username), ["bnsaiboy", "AmazingNutzo"]);
assert.equal(api.buildUserSegment(api.createState(), { ...settings, userFilters: ["compat"] }, ctx), "u:bnsaiboy,Kai7,AmazingNutzo");
assert.equal(api.buildUserSegment(api.createState(), { ...settings, userFilters: ["compat", "following"], compatIncludeMe: true }, ctx),
  "u:followed_by:alonsoreyna,alonsoreyna,bnsaiboy,Kai7,AmazingNutzo");
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

// all-types chart keeps "all" default
const all = api.parseChartPath("/charts/top/" + api.ALL_TYPE_SEGMENT + "/all-time/").state;
assert.equal(all.types.size, 0);

// settings normalization
const n = api.normalizeSettings({ theme: "weird", compatTopN: "999", userFilters: [], highlightColor: "red" });
assert.equal(n.theme, "night"); assert.equal(n.compatTopN, 100); assert.deepEqual(n.userFilters, ["all"]); assert.equal(n.highlightColor, "#ffb000");

// language
assert.equal(api.languageCode("English"), "en");
assert.equal(api.languageCode("ja"), "ja");

// release type grid / presets (mirror RYM's "Music releases" filter)
assert.deepEqual(api.TYPE_GRID.flat().sort(), api.ALL_TYPE_SEGMENT.split(",").sort());
assert.deepEqual(api.TYPE_PRESETS.main, ["album", "ep", "mixtape", "djmix"]);
assert.equal(api.TYPE_PRESETS.all.join(","), api.ALL_TYPE_SEGMENT);
for (const slug of Object.values(api.TYPE_PRESETS).flat()) assert.ok(api.typeFromText(slug), slug);

console.log("all tests passed");
