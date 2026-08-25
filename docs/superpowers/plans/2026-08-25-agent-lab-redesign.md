# WQT Agent Lab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Hugo blog as the approved `WQT Agent Lab` editorial homepage with four exclusive content categories, article-only GoatCounter views, and article-only Giscus comments.

**Architecture:** Keep Hugo and GitHub Pages. Store the ordered category model in `data/categories.toml`, enforce each post's single `category` during Hugo rendering, and keep third-party integrations isolated in partials controlled by `hugo.toml` parameters. Replace the current card-heavy CSS with a single token-driven editorial stylesheet and verify rendered HTML plus desktop/mobile screenshots.

**Tech Stack:** Hugo Extended 0.145.0, Go templates, Markdown/YAML front matter, CSS, vanilla JavaScript, GoatCounter, Giscus, GitHub Actions/Pages.

## Global Constraints

- Preserve Hugo, Markdown, Mermaid, GitHub Pages, and `.github/workflows/hugo.yml` deployment.
- The site name is exactly `WQT Agent Lab`; do not show an author byline.
- Use a true-white background, ink text, indigo primary accent, amber signal accent, and cool-gray rules; no green tint or gradient.
- Do not add homepage featured posts, recent posts, popularity rankings, fake counts, or placeholder articles.
- Every post has exactly one category from `notes`, `projects`, `topics`, or `thoughts`; tags remain multi-valued technical topics.
- Show GoatCounter views only on single article pages.
- Load Giscus only on single article pages and require GitHub login.
- Third-party failures must never block or shift article content.
- Respect visible keyboard focus, WCAG AA contrast, and `prefers-reduced-motion`.
- Do not introduce React, Tailwind, a component framework, search, accounts, CMS, or subscriptions.

---

## File Map

- `hugo.toml`: site identity, taxonomy, GoatCounter flags, and Giscus flags/IDs.
- `data/categories.toml`: ordered source of truth for four category slugs, names, descriptions, and state labels.
- `content/categories/{notes,projects,topics,thoughts}/_index.md`: force stable category URLs to exist even while a category has no posts.
- `content/posts/2026-04-11-bigdata-graph-agent-learning-guide.md`: assign the existing post to `topics`.
- `archetypes/default.md`: require a valid category for future posts.
- `layouts/partials/category-data.html`: resolve a category slug to its data record and fail the build for invalid/missing post categories.
- `layouts/partials/page-views.html`: render the stable GoatCounter placeholder and production-only scripts.
- `layouts/partials/comments.html`: render Giscus or a deterministic disabled/error state.
- `layouts/_default/baseof.html`: semantic shell, compact navigation, metadata, footer, and Mermaid loading.
- `layouts/index.html`: identity, current focus, and four content paths only.
- `layouts/_default/list.html`: editorial article directory and category empty state.
- `layouts/_default/single.html`: article header, responsive TOC, content, tags, views, and comments.
- `layouts/categories/terms.html`: content-map page for the four main categories.
- `layouts/categories/taxonomy.html`: category article directory.
- `static/css/main.css`: complete token-driven visual system and responsive rules.
- `static/js/page-views.js`: delay GoatCounter rendering until its client is ready, then settle to `—` on failure.
- `scripts/check-rendered-site.sh`: deterministic assertions against generated HTML.

---

### Task 1: Establish and enforce the content model

**Files:**
- Create: `data/categories.toml`
- Create: `layouts/partials/category-data.html`
- Create: `content/categories/notes/_index.md`
- Create: `content/categories/projects/_index.md`
- Create: `content/categories/topics/_index.md`
- Create: `content/categories/thoughts/_index.md`
- Modify: `hugo.toml`
- Modify: `archetypes/default.md`
- Modify: `content/posts/2026-04-11-bigdata-graph-agent-learning-guide.md`

**Interfaces:**
- Produces: `.Site.Data.categories` as an ordered array of `{slug, title, code, description, empty}`.
- Produces: partial `category-data.html` accepting a page and returning its category record.
- Consumed by: homepage, list, taxonomy, and single templates in Tasks 3–4.

- [ ] **Step 1: Make the current post fail the future category assertion conceptually**

Run:

```bash
rg -n '^category:' content/posts/*.md
```

Expected: no matches and exit status 1.

- [ ] **Step 2: Add the ordered category data**

Create `data/categories.toml`:

```toml
[[categories]]
slug = "notes"
title = "学习笔记"
code = "INPUT"
description = "概念拆解、论文阅读与工具探索。"
empty = "正在积累"

[[categories]]
slug = "projects"
title = "项目实践"
code = "BUILD"
description = "真实实现、踩坑记录与工程复盘。"
empty = "正在构建"

[[categories]]
slug = "topics"
title = "深度专题"
code = "SYNTHESIS"
description = "系统整理后可长期复用的内容。"
empty = "持续沉淀"

[[categories]]
slug = "thoughts"
title = "随想"
code = "SIGNAL"
description = "行业观察、个人判断与未完成想法。"
empty = "等待信号"
```

- [ ] **Step 3: Register the taxonomy and integration defaults**

Update `hugo.toml` so the relevant sections are exactly:

```toml
title = "WQT Agent Lab"

[params]
description = "一个 Agent 工程师持续学习、构建和思考的个人工作台。"
subtitle = "和智能体一起，持续构建。"
currentFocus = "Agent 基础设施、上下文工程与安全执行。"

  [params.goatcounter]
  enabled = false
  code = ""

  [params.giscus]
  enabled = false
  repo = "wqt123/wqt123.github.io"
  repoId = ""
  category = "Announcements"
  categoryId = ""

[taxonomies]
tag = "tags"
series = "series"
category = "categories"
```

Change the main menu to `内容地图` (`/categories/`), `全部文章` (`/posts/`), `关于` (`/about/`), and `GitHub`.

- [ ] **Step 4: Add category validation**

Create `layouts/partials/category-data.html`:

```go-html-template
{{- $page := . -}}
{{- $slug := $page.Params.category | default "" -}}
{{- $valid := slice "notes" "projects" "topics" "thoughts" -}}
{{- if not (in $valid $slug) -}}
  {{- errorf "post %q must define one category from %v" $page.File.Path $valid -}}
{{- end -}}
{{- $matches := where $page.Site.Data.categories.categories "slug" $slug -}}
{{- return (index $matches 0) -}}
```

- [ ] **Step 5: Create stable empty-category pages**

Create each `content/categories/<slug>/_index.md` with only its matching title. For example, `content/categories/notes/_index.md` is:

```yaml
---
title: "学习笔记"
---
```

Use `项目实践`, `深度专题`, and `随想` in the other three files. These files are content metadata for Hugo taxonomy terms, not placeholder articles.

- [ ] **Step 6: Update authoring defaults and existing content**

Add `category: "notes"` to `archetypes/default.md`. Add `category: "topics"` to the existing post's YAML front matter, leaving all existing tags unchanged.

- [ ] **Step 7: Verify the source model**

Run:

```bash
rg -n '^title = "WQT Agent Lab"|^category = "categories"' hugo.toml
rg -n '^category: "topics"' content/posts/2026-04-11-bigdata-graph-agent-learning-guide.md
rg -n '^slug = ' data/categories.toml
find content/categories -name _index.md | sort
```

Expected: two config matches, one post match, exactly four slug matches, and exactly four category `_index.md` paths.

- [ ] **Step 8: Commit**

```bash
git add hugo.toml data/categories.toml content/categories layouts/partials/category-data.html archetypes/default.md content/posts/2026-04-11-bigdata-graph-agent-learning-guide.md
git commit -m "feat: define Agent Lab content categories"
```

---

### Task 2: Build the editorial shell and visual tokens

**Files:**
- Modify: `layouts/_default/baseof.html`
- Replace: `static/css/main.css`

**Interfaces:**
- Produces CSS tokens: `--color-bg`, `--color-ink`, `--color-muted`, `--color-rule`, `--color-indigo`, `--color-indigo-soft`, `--color-amber`, `--font-display`, `--font-body`, `--font-mono`, `--page-width`, `--reading-width`.
- Produces shared classes consumed later: `.site-header`, `.site-nav`, `.site-main`, `.section-label`, `.category-paths`, `.post-directory`, `.article-shell`, `.article-toc`, `.integration-panel`.

- [ ] **Step 1: Record the current forbidden visual primitives**

Run:

```bash
rg -n 'gradient|border-radius: 28px|box-shadow: var\(--shadow\)|#f7fbfa' static/css/main.css
```

Expected: matches proving the old green/card system is present.

- [ ] **Step 2: Replace the base shell**

Keep the existing title, description, canonical, RSS, stylesheet, and Mermaid behavior. Replace body markup with this structure:

```go-html-template
<body>
  <a class="skip-link" href="#main-content">跳到正文</a>
  <header class="site-header">
    <div class="site-header__inner">
      <a class="site-mark" href="{{ "/" | relURL }}">WQT<span aria-hidden="true">●</span>AGENT LAB</a>
      <nav class="site-nav" aria-label="主导航">
        {{ range .Site.Menus.main }}
          <a href="{{ .URL }}"{{ if hasPrefix .URL "http" }} target="_blank" rel="noreferrer"{{ end }}>{{ .Name }}</a>
        {{ end }}
      </nav>
    </div>
  </header>
  <main id="main-content" class="site-main">{{ block "main" . }}{{ end }}</main>
  <footer class="site-footer"><span>WQT Agent Lab</span><a href="{{ "index.xml" | relURL }}">RSS</a></footer>
  <script type="module" src="{{ "js/mermaid-init.js" | relURL }}"></script>
</body>
```

- [ ] **Step 3: Replace the stylesheet with the approved token system**

Start `static/css/main.css` with these exact tokens and apply them throughout; do not retain any old token names:

```css
:root {
  --color-bg: #ffffff;
  --color-ink: #18181b;
  --color-muted: #667085;
  --color-rule: #d0d5dd;
  --color-indigo: #4f46e5;
  --color-indigo-soft: #eef2ff;
  --color-amber: #f59e0b;
  --font-display: "Arial Black", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-body: Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: "SFMono-Regular", Consolas, monospace;
  --page-width: 1180px;
  --reading-width: 760px;
}
```

Implement: true-white body; 1px cool-gray rules; zero radius on structural regions; no page shadows; `:focus-visible` with a 3px indigo outline; a compact non-blurred header; strong display headlines; readable CJK body at `line-height: 1.8`; indigo links; amber limited to `.site-mark span`, `.section-label`, and status markers. Add `@media (prefers-reduced-motion: reduce)` that disables smooth scroll and animation.

- [ ] **Step 4: Verify forbidden styles are gone**

Run:

```bash
rg -n 'gradient|#f7fbfa|#0f766e|box-shadow: var\(--shadow\)' static/css/main.css
```

Expected: no output and exit status 1.

- [ ] **Step 5: Commit**

```bash
git add layouts/_default/baseof.html static/css/main.css
git commit -m "feat: add Agent Lab editorial design system"
```

---

### Task 3: Implement the homepage and content map

**Files:**
- Modify: `layouts/index.html`
- Create: `layouts/categories/terms.html`
- Create: `layouts/categories/taxonomy.html`

**Interfaces:**
- Consumes: `.Site.Data.categories.categories` and category taxonomy pages.
- Produces: homepage with hero/current focus/four paths only; category terms page; per-category list page.

- [ ] **Step 1: Prove the old homepage exposes posts**

Run:

```bash
rg -n '最新文章|RegularPages|post-grid' layouts/index.html
```

Expected: matches.

- [ ] **Step 2: Replace the homepage**

Use the approved hierarchy exactly:

```go-html-template
{{ define "main" }}
<section class="home-hero">
  <div class="home-hero__main">
    <p class="section-label">BUILD / LEARN / THINK</p>
    <h1>和智能体一起，<span>持续构建。</span></h1>
    <p>{{ .Site.Params.description }}</p>
  </div>
  <aside class="current-focus" aria-label="当前关注">
    <p class="section-label">CURRENT FOCUS</p>
    <p>{{ .Site.Params.currentFocus }}</p>
  </aside>
</section>
<section class="content-map" aria-labelledby="content-map-title">
  <header><h2 id="content-map-title">四条内容路径</h2><span>CHOOSE YOUR ENTRY</span></header>
  <div class="category-paths">
    {{ range $index, $category := .Site.Data.categories.categories }}
      {{ $term := $.Site.GetPage (printf "/categories/%s" $category.slug) }}
      <a class="category-path" href="{{ $term.RelPermalink }}">
        <span>{{ printf "%02d" (add $index 1) }} / {{ $category.code }}</span>
        <h3>{{ $category.title }}</h3><p>{{ $category.description }}</p>
        <strong>{{ if gt (len $term.Pages) 0 }}{{ len $term.Pages }} 篇{{ else }}{{ $category.empty }}{{ end }} →</strong>
      </a>
    {{ end }}
  </div>
</section>
{{ end }}
```

- [ ] **Step 3: Build category terms and taxonomy templates**

`terms.html` uses the same ordered data and path component as the homepage. `taxonomy.html` resolves the current slug from `.Data.Term`, finds its category record, prints the category title/description, then renders `.Pages.ByDate.Reverse` as an editorial directory. When empty, render `<p class="empty-state">{{ $category.empty }}。返回<a href="/categories/">内容地图</a>。</p>`.

- [ ] **Step 4: Source-level homepage regression check**

Run:

```bash
! rg -n '最新文章|RegularPages|post-grid|精选' layouts/index.html
rg -n '四条内容路径|currentFocus|Site.Data.categories' layouts/index.html
```

Expected: the first command succeeds with no matches; the second prints three matches.

- [ ] **Step 5: Commit**

```bash
git add layouts/index.html layouts/categories/terms.html layouts/categories/taxonomy.html
git commit -m "feat: build Agent Lab content map homepage"
```

---

### Task 4: Redesign article directories and reading pages

**Files:**
- Modify: `layouts/_default/list.html`
- Modify: `layouts/_default/single.html`
- Create: `layouts/partials/tag-list.html`
- Create: `layouts/partials/page-views.html`
- Create: `layouts/partials/comments.html`

**Interfaces:**
- Consumes: `partial "category-data.html" .` and later `page-views.html`/`comments.html`.
- Produces: `.post-directory` rows and `.article-shell` with semantic metadata/TOC/content slots.

- [ ] **Step 1: Replace list cards with directory rows**

For every post in `.Pages.ByDate.Reverse`, call `{{ $category := partial "category-data.html" . }}` and render:

```go-html-template
<article class="post-directory__item">
  <div class="post-directory__meta"><time datetime="{{ .Date.Format "2006-01-02" }}">{{ .Date.Format "2006-01-02" }}</time><span>{{ $category.title }}</span></div>
  <div><h2><a href="{{ .RelPermalink }}">{{ .Title }}</a></h2><p>{{ .Params.summary | default .Summary }}</p>{{ partial "tag-list.html" . }}</div>
</article>
```

Create the small `layouts/partials/tag-list.html` partial while doing this task; it renders linked taxonomy tags as plain inline text, not pills.

- [ ] **Step 2: Replace the single article layout**

The template must call the category validator, place metadata in this order—category, title, date, reading time, page-view partial—then use a two-column `.article-shell` with `<aside class="article-toc">` and `<div class="article-content">`. Render TOC only when its length exceeds 40. After content render tags, then `partial "comments.html" .`.

- [ ] **Step 3: Add buildable integration placeholders**

Create `layouts/partials/page-views.html`:

```go-html-template
<span class="page-views" aria-label="文章浏览量"><span id="page-view-count">—</span> 次阅读</span>
```

Create `layouts/partials/comments.html`:

```go-html-template
<section id="comments" class="integration-panel" aria-labelledby="comments-title">
  <header><p class="section-label">DISCUSSION</p><h2 id="comments-title">评论</h2></header>
  <p class="integration-message">评论区尚未启用。</p>
</section>
```

- [ ] **Step 4: Add responsive reading CSS**

Desktop: content column max 760px and a 240px sticky TOC. At `max-width: 900px`, collapse to one column and make TOC static. Ensure tables and Mermaid can horizontally scroll without causing body overflow. Inline code uses indigo-soft; code blocks use ink background with light text.

- [ ] **Step 5: Verify template structure**

Run:

```bash
rg -n 'category-data|page-views|article-toc|article-content|comments' layouts/_default/single.html
! rg -n 'post-card|tag-chip|toc-box' layouts/_default/list.html layouts/_default/single.html
```

Expected: all five new integration/reading hooks match; old card hooks do not.

- [ ] **Step 6: Commit**

```bash
git add layouts/_default/list.html layouts/_default/single.html layouts/partials/tag-list.html layouts/partials/page-views.html layouts/partials/comments.html static/css/main.css
git commit -m "feat: redesign article browsing and reading"
```

---

### Task 5: Add article-only GoatCounter views

**Files:**
- Modify: `layouts/partials/page-views.html`
- Create: `static/js/page-views.js`
- Modify: `static/css/main.css`

**Interfaces:**
- Consumes: `.Site.Params.goatcounter.enabled`, `.Site.Params.goatcounter.code`, `hugo.IsProduction`, and `.RelPermalink`.
- Produces: `#page-view-count` with initial/failure text `—`; loads GoatCounter only on production article pages.

- [ ] **Step 1: Add the partial with strict enablement**

Create `layouts/partials/page-views.html`:

```go-html-template
<span class="page-views" aria-label="文章浏览量">
  <span id="page-view-count" data-path="{{ .RelPermalink }}">—</span> 次阅读
</span>
{{ if and hugo.IsProduction .Site.Params.goatcounter.enabled .Site.Params.goatcounter.code }}
  <script data-goatcounter="https://{{ .Site.Params.goatcounter.code }}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
  <script type="module" src="{{ "js/page-views.js" | relURL }}"></script>
{{ end }}
```

- [ ] **Step 2: Add bounded client behavior**

Create `static/js/page-views.js` with a 5-second deadline. Poll every 100ms for `window.goatcounter.visit_count`; when present call `visit_count({ append: '#page-view-count', no_branding: true, path: element.dataset.path })`; on timeout or exception keep `—` and stop polling. Clear the placeholder's text immediately before a successful append so the count is not duplicated.

- [ ] **Step 3: Style without layout shift**

Give `#page-view-count` `display:inline-block; min-width:2ch; font-variant-numeric:tabular-nums`. Do not animate the number.

- [ ] **Step 4: Verify integration isolation**

Run:

```bash
rg -n 'page-views' layouts/_default/single.html
! rg -n 'goatcounter|page-views' layouts/index.html layouts/_default/list.html
rg -n 'hugo.IsProduction.*goatcounter.enabled.*goatcounter.code' layouts/partials/page-views.html
```

Expected: single layout contains the partial; homepage/list contain none; strict production guard matches.

- [ ] **Step 5: Commit**

```bash
git add layouts/partials/page-views.html static/js/page-views.js static/css/main.css layouts/_default/single.html
git commit -m "feat: add article view counts"
```

---

### Task 6: Add article-only Giscus comments

**Files:**
- Modify: `layouts/partials/comments.html`
- Modify: `static/css/main.css`

**Interfaces:**
- Consumes: `.Site.Params.giscus.{enabled,repo,repoId,category,categoryId}`.
- Produces: `#comments` with Giscus mapped by `pathname`, or a stable disabled configuration message.

- [ ] **Step 1: Create the guarded comments partial**

Create `layouts/partials/comments.html`:

```go-html-template
<section id="comments" class="integration-panel" aria-labelledby="comments-title">
  <header><p class="section-label">DISCUSSION</p><h2 id="comments-title">评论</h2></header>
  {{ $g := .Site.Params.giscus }}
  {{ if and $g.enabled $g.repo $g.repoId $g.category $g.categoryId }}
    <script src="https://giscus.app/client.js"
      data-repo="{{ $g.repo }}" data-repo-id="{{ $g.repoId }}"
      data-category="{{ $g.category }}" data-category-id="{{ $g.categoryId }}"
      data-mapping="pathname" data-strict="1" data-reactions-enabled="1"
      data-emit-metadata="0" data-input-position="top" data-theme="light"
      data-lang="zh-CN" data-loading="lazy" crossorigin="anonymous" async></script>
    <noscript>请启用 JavaScript，或前往 <a href="https://github.com/{{ $g.repo }}/discussions">GitHub Discussions</a> 参与讨论。</noscript>
  {{ else }}
    <p class="integration-message">评论区尚未启用。</p>
  {{ end }}
</section>
```

- [ ] **Step 2: Add restrained integration styling**

Use a top rule and generous top margin; no rounded wrapper, shadow, or tinted panel. Reserve at least 160px minimum height only when Giscus is enabled. Keep the disabled message compact.

- [ ] **Step 3: Verify mapping and isolation**

Run:

```bash
rg -n 'data-mapping="pathname"|data-lang="zh-CN"|data-theme="light"' layouts/partials/comments.html
! rg -n 'giscus|comments' layouts/index.html layouts/_default/list.html
```

Expected: all three settings match; homepage/list do not load comments.

- [ ] **Step 4: Commit**

```bash
git add layouts/partials/comments.html static/css/main.css
git commit -m "feat: add GitHub Discussions comments"
```

---

### Task 7: Add rendered-site checks and complete visual QA

**Files:**
- Create: `scripts/check-rendered-site.sh`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Consumes: generated `public/` output from Hugo 0.145.0 Extended.
- Produces: a single executable validation command for local and CI use.

- [ ] **Step 1: Match the deployment Hugo version locally**

Run `hugo version`. If absent, install Hugo Extended 0.145.0 using the platform package manager or official release, then verify the output contains `v0.145.0+extended`. Do not change the workflow version.

- [ ] **Step 2: Write the rendered-site checker**

Create executable `scripts/check-rendered-site.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f public/index.html
rg -q 'WQT Agent Lab' public/index.html
rg -q '四条内容路径' public/index.html
! rg -q '最新文章|人工精选|神秘人哈哈哈' public/index.html
for slug in notes projects topics thoughts; do
  test -f "public/categories/${slug}/index.html"
done
article='public/posts/bigdata-graph-agent-learning-guide/index.html'
test -f "$article"
rg -q '深度专题' "$article"
rg -q 'page-view-count' "$article"
rg -q '评论区尚未启用|giscus.app/client.js' "$article"
! rg -q 'page-view-count|giscus.app/client.js' public/index.html
echo 'Rendered site checks passed.'
```

- [ ] **Step 3: Build and run checks**

Run:

```bash
rm -rf public
HUGO_ENVIRONMENT=production hugo --minify
bash scripts/check-rendered-site.sh
```

Expected: Hugo exits 0 and checker prints `Rendered site checks passed.`

- [ ] **Step 4: Document external activation**

In `README.md`, add exact setup notes: create a GoatCounter site and set `params.goatcounter.code/enabled`; enable repository Discussions, install the Giscus App, retrieve repo/category IDs from Giscus, and set `params.giscus.enabled = true`. State that blank IDs intentionally leave integrations disabled.

- [ ] **Step 5: Keep visual companion output out of Git**

Add `.superpowers/` to `.gitignore`. Do not remove the local directory while the brainstorming browser is active.

- [ ] **Step 6: Browser QA round 1**

Serve with `hugo server --disableFastRender`. Capture desktop at 1440×1000 and mobile at 390×844 for homepage, categories map, one empty category, posts list, and the existing article. Record ten concrete issues covering hierarchy, spacing, typography, color, focus, TOC, tables/Mermaid, and overflow; fix all actionable issues in templates/tokens.

- [ ] **Step 7: Browser QA round 2**

Repeat the same screenshots after fixes. Compare against `.superpowers/brainstorm/78942-1787670093/content/signal-white-homepage.html` and `signal-palette.html`. Verify: true-white background; indigo/amber palette; no card grid; four content paths dominate homepage; no featured/recent content; mobile ordering is preserved; no horizontal body overflow.

- [ ] **Step 8: Accessibility and failure checks**

Navigate all links with keyboard, verify visible focus, emulate `prefers-reduced-motion: reduce`, block `gc.zgo.at` and `giscus.app`, and confirm the article remains readable with `— 次阅读` plus a stable comments message.

- [ ] **Step 9: Final build and repository verification**

Run:

```bash
HUGO_ENVIRONMENT=production hugo --minify
bash scripts/check-rendered-site.sh
git diff --check
git status --short
```

Expected: build/checker pass, `git diff --check` has no output, and status contains only intentional Task 7 files before commit.

- [ ] **Step 10: Commit**

```bash
git add scripts/check-rendered-site.sh .gitignore README.md static/css/main.css layouts
git commit -m "test: verify Agent Lab redesign"
```

---

## External Activation Gate

Code can ship safely with both integrations disabled. Full production activation additionally requires user-owned external values:

1. GoatCounter site code.
2. GitHub Discussions enabled on `wqt123/wqt123.github.io`.
3. Giscus App installed for the repository.
4. Giscus repo ID, category name, and category ID.

Never invent these values. After they are supplied, enable each integration in a separate configuration commit and rerun Task 7's complete production build and browser failure checks.
