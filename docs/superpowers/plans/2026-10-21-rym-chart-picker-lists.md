# RYM Chart Picker+ 1.3 (Lists) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the userscript tell curated RYM lists apart from personal logs: tabs on the release page's lists section, a list-page panel with starring, lists from compatible users, and a "find lists" shortcut.

**Architecture:** Everything lives in `rym-chart-picker-plus.user.js`. New pure helpers (classification, scoring, text parsers, URL builders) go in the pure block above `PURE_API` and are exported for `node test/pure.test.js`. DOM parsers take a `Document` and are exercised by the browser smoke test on fixtures. Runtime adds two GM storage keys (list cache, starred lists), a `list` page mode, a sequential rate-limited fetcher, and three UI pieces (release tabs, panel "Lists" section, list-page panel).

**Tech Stack:** Vanilla JS userscript (Tampermonkey, `GM_getValue`/`GM_setValue`/`GM_addStyle`/`GM_addValueChangeListener`), Node `assert` tests, static fixtures served with `python3 -m http.server`.

**Spec:** `brainstorms/2026-10-21-rym-chart-picker-lists.md` (read it first; also `CLAUDE.md`).

## Global Constraints

- Single file `rym-chart-picker-plus.user.js`; pure helpers above `if (typeof module !== "undefined" && module.exports)`, runtime below. Never `require` anything.
- Settings key stays `rym_chart_picker_settings_v16`. New keys: `rym_chart_picker_lists_v1`, `rym_chart_picker_starred_lists_v1`.
- New `@match`: `https://rateyourmusic.com/list/*` and `https://www.rateyourmusic.com/list/*`.
- UI text in English. Docs (`TUTORIAL.md`, `CLAUDE.md`, commit messages) in Spanish.
- `node test/pure.test.js` must pass after every task. Bump `@version` to `1.3.0` in the last task only.
- Anti-Cloudflare: no automatic background fetch of lists ever. Fetches only on explicit click, sequential, `settings.listFetchDelayMs` (default 3000) between them, `settings.listFetchMax` (default 25) per click, 10 users per click in F2, stop at first non-OK response or unparsable HTML.
- Do not touch existing chart semantics (`state.fromUrl`, `state.urlUsers`, `selectCompatUsers`, `buildChartUrl`).
- Never replace RYM's native lists section `innerHTML`; hide it with a class and keep it restorable.
- Commit after each task with a Spanish message; end commit messages with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. A release with zero lists, or whose lists section markup differs from the fixture: the script must add nothing and throw nothing (pinned in Task 4).
2. List URLs with a trailing page number (`/list/u/slug/2/`) or without trailing slash must map to the same cache key (pinned in Task 2).
3. Likes text `+1`, `+1,204`, or missing heart entirely: likes must parse to 1, 1204, 0 (pinned in Task 2).
4. Fetch loop: a 403/503 on the third list must stop the loop, keep the two cached entries, and leave the button usable again (pinned in Task 3).
5. Cache growth: 3,001 entries must prune the oldest non-override, non-starred entry, never a starred one (pinned in Task 3).

---

### Task 1: Classification and scoring (pure)

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (pure block, before `const PURE_API`; add exports to `PURE_API`)
- Test: `test/pure.test.js`

**Interfaces:**
- Produces:
  - `const LIST_LOG_CATEGORIES: Set<string>` and `const LIST_OTHER_CATEGORIES: Set<string>` with the exact names from the spec section "Clasificación de una lista" (`log` and `other` sets), compared case-insensitively after `cleanText`.
  - `classifyListCategories(categories: string[], likes: number|null) -> "log"|"other"|"curated"|"unknown"`: any `log` category → `log`; else any `other` → `other`; else ≥1 category → `curated`; no categories: `likes >= 3` → `curated`, `likes` is a number → `other`, `likes === null` → `unknown`.
  - `classifyListTitle(title: string) -> "log"|"unknown"`: regex set from the spec (`log`, `diary`, `journal`, `listening`, `listened`, `first listens?`, `\b20\d\d\s*:`, only-symbols title, `w\.?i\.?p`, `to listen`, `backlog`), case-insensitive.
  - `classifyList(entry: {title, categories?, likes?, override?, fetchedAt?}) -> {cls: string, provisional: boolean}`: `override` wins; else if `fetchedAt` → `classifyListCategories` (provisional false); else `classifyListTitle` (provisional true when it says `log`; `unknown` otherwise).
  - `scoreList(entry, ctx: {compatUsers: Set<string>, starred: Set<string>}) -> number` = `Math.log10((entry.likes||0)+1)*10 + (compat ? 5 : 0) + (starred ? 100 : 0)`; compat = `ctx.compatUsers.has(entry.author.toLowerCase())`; starred = `ctx.starred.has(entry.key)`.
  - `sortListsByScore(entries, ctx) -> entries[]` descending by score, tie by likes desc, then title asc (`localeCompare`).

- [ ] **Step 1: Write failing tests** appended to `test/pure.test.js`:

```js
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
assert.equal(api.classifyListTitle("covers i do like 😄 (w.i.p.)"), "log");
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
```

- [ ] **Step 2: Run** `node test/pure.test.js` → FAIL (`classifyListCategories is not a function`).
- [ ] **Step 3: Implement** the sets and five functions in the pure block; add all of them plus the two sets to `PURE_API`.
- [ ] **Step 4: Run** `node test/pure.test.js` → PASS.
- [ ] **Step 5: Commit** `feat(lists): clasificación y puntuación de listas (puro)`.

---

### Task 2: Text parsers, keys and URLs (pure) + DOM parsers

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (pure block; DOM parsers go next to `parseCompatDocument`)
- Test: `test/pure.test.js`
- Fixtures already present: `test/fixtures/list/adontomas/listening-log-2026/index.html`, `test/fixtures/list/adontomas/index.html`

**Interfaces:**
- Produces (pure, string-only, exported):
  - `listPathKey(href: string) -> string|null`: from any absolute/relative RYM list URL returns `/list/<user>/<slug>/` (lowercase user, strips page number `/2/`, query, hash; adds trailing slash). Returns `null` for `/list/<user>/` (a user's lists index) or non-list URLs.
  - `parseListIdText(text) -> number|null` from `"[List1547652] | …"`.
  - `parseLikesText(text) -> number` from `"+1"`, `"+1,204"`, `""` → 1, 1204, 0.
  - `parseItemsFromNav(text) -> number|null` from `"369 - 345"` → 369 (max of the two numbers); `null` if no numbers.
  - `parseItemsFromMeta(text) -> number|null` from `"Created: … | 369 items"` → 369.
  - `buildListSearchUrl(state, settings) -> string|null`: term = labels of `state.primaryGenres` (use `labelFromSlugKeepCase`/existing label map the state already keeps) joined by space + `yearLabel(state.year)` unless it is all time; `null` when term is empty. URL: `https://rateyourmusic.com/search?searchterm=<encodeURIComponent(term)>&searchtype=<settings.listSearchType>`.
- Produces (DOM, exported but not node-tested):
  - `parseListDocument(doc: Document, url: string) -> {key, id, url, title, author, categories: string[], categoryHrefs: string[], likes: number, items: number|null}|null`. Selectors: title `#content h1`; author `#content a.user[href^="/~"]`; categories `a.genre[href^="/list_classifier/"]`; id from the `<p>` containing `[List`; likes from `span[id^="favtext_"]`; items: `#nav_bottom .navlinkcurrent` via `parseItemsFromNav`, else `#user_list td.number` count. Returns `null` when no `[List` id found.
  - `parseUserListsDocument(doc) -> Array<{key, url, title, author, items: number|null}>` from `a.listpage_list` rows; items from sibling `.smallgray` via `parseItemsFromMeta`; author from the URL via `listPathKey`.
  - `parseReleaseListsSection(doc) -> {container: Element, entries: Array<{key, url, title, author, cover: string|null, anchor: Element}>}|null`: collect `a[href]` whose `listPathKey` is non-null and that are **not** inside `#rym-picker-panel`; dedupe by key keeping the first anchor whose text is non-empty; `container` = lowest common ancestor of all kept anchors; `title` = anchor text; `author` = nearest `a[href^="/~"]` inside the anchor's card (walk up to 4 ancestors), else user segment of the key; `cover` = nearest `img` src in the same card or `null`. Return `null` when fewer than 1 entry.

- [ ] **Step 1: Write failing tests** appended to `test/pure.test.js`:

```js
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
```

Adjust the `state.year` assignment to whatever shape `createState()`/`parseYearSegment` actually use (read `parseYearSegment` and `yearLabel`); the expected label for the 2010s decade is whatever `yearLabel` returns for it (check: spec says chip shows `2010s`).

- [ ] **Step 2: Run** `node test/pure.test.js` → FAIL.
- [ ] **Step 3: Implement** the pure functions and the three DOM parsers. Add `listSearchType: "l"` to `DEFAULT_SETTINGS` and to `normalizeSettings` (string, default `"l"`), plus `listFetchDelayMs: 3000` (integer ≥ 1000) and `listFetchMax: 25` (integer 1–100). Export all new functions in `PURE_API`.
- [ ] **Step 4: Run** `node test/pure.test.js` → PASS.
- [ ] **Step 5: Add a lists section to the release fixture** `test/fixtures/release/album/ecco2k/e/index.html` before the `<script>` tags, built from the screenshot (markup is a guess; the parser must not depend on class names):

```html
<div class="section_lists"><h2>Lists</h2>
<div class="release_list_item"><a href="/list/adontomas/listening-log-2026/"><img src="/x.jpg"></a><a href="/list/adontomas/listening-log-2026/">listening log 2026</a> <a class="user" href="/~adontomas">adontomas</a></div>
<div class="release_list_item"><a href="/list/troutmask/fixing-the-canon/"><img src="/x.jpg"></a><a href="/list/troutmask/fixing-the-canon/">Fixing the Canon in Miniature: An Improved E…</a> <a class="user" href="/~troutmask">troutmask</a></div>
<div class="release_list_item"><a href="/list/AaronnotAaron/ranking-eps-of-2024/"><img src="/x.jpg"></a><a href="/list/AaronnotAaron/ranking-eps-of-2024/">Ranking EPs of 2024</a> <a class="user" href="/~AaronnotAaron">AaronnotAaron</a></div>
<div class="release_list_item"><a href="/list/Revujin/2024-log/"><img src="/x.jpg"></a><a href="/list/Revujin/2024-log/">2024 : LOG</a> <a class="user" href="/~Revujin">Revujin</a></div>
</div>
```

- [ ] **Step 6: Commit** `feat(lists): parsers de lista, listas de usuario y sección del release`.

---

### Task 3: Storage, list page mode and the sequential fetcher (runtime)

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (header `@match`; runtime after `saveCompat`)
- Test: `test/pure.test.js` for the pure cache helpers; smoke test for the rest

**Interfaces:**
- Produces (pure, exported):
  - `const LIST_CACHE_MAX = 3000`, `const LIST_CACHE_MAX_AGE_MS = 30 * 24 * 3600 * 1000`.
  - `pruneListCache(cache: {version, lists: {[key]: entry}, compatLists?: {}}, starred: Set<string>, now: number) -> cache` : drops entries with `fetchedAt` older than max age unless `override` or starred; if still over `LIST_CACHE_MAX`, drops oldest `fetchedAt` first among non-override, non-starred.
  - `isListEntryFresh(entry, now) -> boolean` (`fetchedAt` within max age, or has `override`).
- Produces (runtime):
  - `PAGE` gains `"list"` for `/^\/list\/[^/]+\/[^/]+/` (a user's index `/list/<user>/` stays `null`).
  - `let listCache = loadListCache()` / `saveListCache()` under `LISTS_KEY = "rym_chart_picker_lists_v1"`, shape per spec; `let starred = loadStarred()` / `saveStarred()` under `STARRED_KEY = "rym_chart_picker_starred_lists_v1"`.
  - `upsertListEntry(entry)`: merge by `key`, set `fetchedAt = Date.now()` when it came from a parsed page, keep existing `override`.
  - `setListOverride(key, cls|null)`, `toggleStarred(entryLike) -> boolean`, `isStarred(key)`.
  - `captureListFromCurrentPage()`: on `PAGE === "list"`, `parseListDocument(document, location.href)` → `upsertListEntry`; no toast.
  - `fetchListsSequentially(keys: string[], {onEach(entry), onDone(summary)}) -> {stop()}`: for each key, `fetch(key, {credentials:"include"})`, 20 s abort timer, parse with `parseListDocument`; on `!ok` or `null` parse → stop with `summary.blocked = true`; wait `settings.listFetchDelayMs` between fetches; cap `settings.listFetchMax`. One run at a time (`listFetching` flag).
  - `GM_addValueChangeListener(LISTS_KEY, …)` and for `STARRED_KEY`: reload and `render()` on remote change (same pattern as `COMPAT_KEY`).

- [ ] **Step 1: Write failing tests**:

```js
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
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** pure helpers (export) and runtime pieces. In the `PAGE === "list"` branch call `captureListFromCurrentPage()` **before** the panel is built (the panel still builds; Task 5 decides what it shows). Add the `@match` lines.
- [ ] **Step 4: Run** `node test/pure.test.js` → PASS.
- [ ] **Step 5: Smoke test** the list fixture: `cd test/fixtures && cp ../../rym-chart-picker-plus.user.js script.js && python3 -m http.server 8765`; add `<script src="/stub.js"></script><script src="/script.js"></script>` before `</body>` in `test/fixtures/list/adontomas/listening-log-2026/index.html`; open `http://localhost:8765/list/adontomas/listening-log-2026/`; in the console `JSON.parse(window.__store.rym_chart_picker_lists_v1)` must contain key `/list/adontomas/listening-log-2026/` with `categories: ["Listener's Diary"]`, `likes: 1`, `items: 369`, `id: 1547652`; `window.__errors` empty. Remove `script.js`. (Use the T3 `preview_*` tools or Playwright for this; if no browser is available, say so in the report.)
- [ ] **Step 6: Commit** `feat(lists): caché de listas, favoritas, modo página de lista y fetch secuencial`.

---

### Task 4: F1 — tabs on the release lists section

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (runtime; new CSS in the `GM_addStyle` block; new `renderReleaseLists()` called from `render()` when `PAGE === "release"`)

**Interfaces:**
- Consumes: `parseReleaseListsSection`, `classifyList`, `sortListsByScore`, `listCache`, `starred`, `fetchListsSequentially`, `setListOverride`, `toggleStarred`, `selectCompatUsers(compat, settings)` (for the compat set, usernames lowercased).
- Produces: `releaseLists = parseReleaseListsSection(document)` computed once at startup; `renderReleaseLists()` idempotent (rebuilds `#rym-lists-view` inside a wrapper inserted right **before** `releaseLists.container`; adds class `rym-lists-native-hidden` to the container, CSS `display:none`); `state.listsTab` (`"curated"|"unrated"|"logs"|"all"`), `state.listsShowNative` (boolean).

- [ ] **Step 1: Implement** per spec F1:
  - Header: `Lists · N`, tabs with counts, button `Rate N unrated (~Xs)` where X = `ceil(N * listFetchDelayMs / 1000)` capped to `listFetchMax`, `Stop` while running, link `Show RYM's view` / `Show Chart Picker+ view` toggling `state.listsShowNative`.
  - Default tab per spec (Curated if ≥1, else Unrated, else All). `other` rows render inside the Logs & other tab under a `Other` sub-heading after the logs.
  - Row: cover (img or empty box), title link (native href, no truncation), author link, chips: category (first category; class `rym-chip-log` red for `log`, `rym-chip-curated` green, `rym-chip-other` grey; `log?` when provisional), `♥ N` when fetched, `N items` when known, `compat` when author in compat set, star button `☆/★`, override `<select>` with `auto / curated / log / other`.
  - Rate button: keys = entries whose cache entry is missing or not fresh, in page order; `onEach` → `upsertListEntry` + `saveListCache` + `renderReleaseLists()`; on `blocked` → status text `RYM blocked the fetch; open lists manually, they get rated as you visit them.`
  - Guard: if `releaseLists` is `null`, nothing is inserted. Wrap the whole insertion in `try/catch` that logs with the `[RYM Chart Picker+]` prefix and leaves the native section visible.
- [ ] **Step 2: Smoke test** on `http://localhost:8765/release/album/ecco2k/e/` with the fixture from Task 2: four rows appear, `listening log 2026` and `2024 : LOG` are under Logs & other with `log?`, Unrated shows the other two, default tab is Unrated; after visiting `/list/` (passive capture) and reloading the release, `listening log 2026` shows `Diary`, `♥ 1`, `369 items` without the `?`. Override `Ranking EPs of 2024` to curated → it moves to Curated and survives reload. `window.__errors` empty. Also remove the lists block from a copy of the fixture (or test with `charts` fixture page) and confirm no errors.
- [ ] **Step 3: Commit** `feat(lists): pestañas Curated/Unrated/Logs en la sección de listas del release`.

---

### Task 5: F4 — list page panel and starred lists in the panel

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (panel HTML template near line 1300–1360; `render()`; CSS)

**Interfaces:**
- Consumes: `listCache`, `starred`, `toggleStarred`, `setListOverride`, `classifyList`.
- Produces: panel section `#rym-picker-lists` (a `.rym-picker-row` placed after the Users row, before `#rym-picker-url`) with: on `PAGE === "list"` a "This list" block (title, chips as in Task 4, star, override select); on every page a "Starred" block: up to 10 links `title · author · ♥N` with an `×` unstar on hover, `show all (N)` toggle (`state.starredShowAll`). `renderListsSection()` called from `render()`.
- On `PAGE === "list"`: the genre/year/type/language/users rows, the `Open chart` button, the URL preview and the Chart Search toggle are hidden (`rym-picker-hidden`); main button text `Chart Picker+: lists`; status `Viewing a list`.

- [ ] **Step 1: Implement** as above. Keep `render()` safe on list pages: every `$("…")` the function touches must exist in the template (do not remove template nodes; hide them).
- [ ] **Step 2: Smoke test** `http://localhost:8765/list/adontomas/listening-log-2026/`: panel shows title `listening log 2026`, chip `Diary`, `♥ 1`, `369 items`; star it → `window.__store.rym_chart_picker_starred_lists_v1` contains it; open `/release/album/ecco2k/e/` → panel Starred block lists it; unstar from there → gone. `window.__errors` empty on both pages and on `/charts/top/…` fixture.
- [ ] **Step 3: Commit** `feat(lists): panel en página de lista y listas favoritas`.

---

### Task 6: F3 — "Find lists on RYM"

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (Lists section of the panel from Task 5; settings panel)

**Interfaces:**
- Consumes: `buildListSearchUrl(state, settings)`.
- Produces: button `Find lists on RYM` in `#rym-picker-lists` on release and chart pages; disabled with title `Select a genre or a year first` when the URL is `null`; opens in a new tab (`window.open(url, "_blank", "noopener,noreferrer")`). Settings: text input `List search type` bound to `settings.listSearchType` (default `l`) with help text `RYM's searchtype parameter for lists; change it if the search opens the wrong tab.`; number inputs for `listFetchDelayMs` (label `Delay between list fetches (ms)`) and `listFetchMax` (label `Max lists per click`).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Smoke test** on the release fixture: with a primary genre selected the button is enabled and the URL in `title` matches `buildListSearchUrl`; with nothing selected and year all-time it is disabled. Settings inputs persist across reload.
- [ ] **Step 3: Commit** `feat(lists): botón Find lists y settings de fetch`.

---

### Task 7: F2 — lists by compatible users

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (header `@match` for `https://rateyourmusic.com/list/*` already covers `/list/<user>/`; runtime)

**Interfaces:**
- Consumes: `selectCompatUsers(compat, settings)`, `parseUserListsDocument`, `listCache.compatLists`, `classifyList`, `sortListsByScore`, `fetchListsSequentially` pattern (write a sibling `fetchUserListsSequentially(usernames, {onEach, onDone})` with the same policy, cap 10 users per click, 7-day freshness per user via `compatLists[user].fetchedAt`).
- Produces: in `#rym-picker-lists` on release/chart pages a button `Lists by compatible users` (disabled with title `Sync compatible users first` when `!compat`); clicking fetches stale users then opens a modal `#rym-lists-modal` (fixed, centered, closable with `×`/Esc) listing all cached compat lists grouped Curated / Unrated / Logs & other, each row as in Task 4 (author shown, `Rate N unrated` button reusing `fetchListsSequentially`). On `blocked` at the first user: the button turns into `Open <user>'s lists` which opens `/list/<user>/` in a new tab; when `PAGE` detection sees `/list/<user>/` (index page, 2 segments), the script calls `captureUserListsFromCurrentPage()` → `parseUserListsDocument(document)` → store under `compatLists[user]` → toast `Saved N lists by <user>.` and returns (no panel). Add `"userlists"` to `PAGE` detection for `/^\/list\/[^/]+\/?$/`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Smoke test**: add `<script src="/stub.js"></script><script src="/script.js"></script>` to `test/fixtures/list/adontomas/index.html`; open `http://localhost:8765/list/adontomas/` → store contains `compatLists.adontomas` with 5 lists and `items` parsed; on the release fixture with a stubbed `compat` in `window.__store` (`rym_chart_picker_compat_v1` = `{"users":[{"username":"adontomas","score":100,"rank":1}],"forUser":"alonsoreyna","syncedAt":<now>}`), the button opens the modal and shows the 5 lists, `listening log 2026` under Logs with `log?` (or `Diary` if cached). `window.__errors` empty.
- [ ] **Step 3: Commit** `feat(lists): listas de usuarios compatibles`.

---

### Task 8: Docs, version, fixtures hygiene

**Files:**
- Modify: `rym-chart-picker-plus.user.js` (`@version 1.3.0`), `TUTORIAL.md`, `CLAUDE.md`, `brainstorms/2026-10-21-rym-chart-picker-lists.md` (estado), `test/fixtures/list/adontomas/listening-log-2026/index.html` and `test/fixtures/list/adontomas/index.html` (keep the script tags, like the other fixtures)

- [ ] **Step 1:** Bump `@version` to `1.3.0`.
- [ ] **Step 2:** `TUTORIAL.md`: new section "Listas" (pestañas en el release, botón Rate y qué pasa si RYM bloquea, estrella y favoritas, Find lists, Lists by compatible users, overrides, settings nuevos). Spanish.
- [ ] **Step 3:** `CLAUDE.md`: add to "Hechos de RYM verificados" (dated 2026-10-21): list page selectors (`#content h1`, `a.user`, `a.genre[href^="/list_classifier/"]`, `[List<id>]`, `span[id^="favtext_"]`, `#nav_bottom .navlinkcurrent` = "max - min" items, `table#user_list td.number`), user lists index `/list/<user>/` with `a.listpage_list` + `.smallgray` "N items", classifier pages are flat and unranked, `searchtype=l` returned releases (list search type unverified), release lists-section markup **unverified** (fixture is a guess; parser is anchor-based). Add new storage keys and the anti-Cloudflare policy to "Convenciones" / "Semántica que no hay que romper". Add "Lo que el usuario descartó: agregación 'lists you keep running into'".
- [ ] **Step 4:** Spec file: append `## Estado (2026-10-21)` with what was implemented and what remains to verify in real RYM (release section markup, searchtype).
- [ ] **Step 5:** Run `node test/pure.test.js` → PASS; `git status` shows no `test/fixtures/script.js`.
- [ ] **Step 6: Commit** `1.3.0: listas curadas, favoritas y listas de usuarios compatibles`.
