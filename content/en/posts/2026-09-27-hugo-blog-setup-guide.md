---
title: "Building a Personal Blog with Hugo: From Design to Auto-Deploy"
date: 2026-09-27T11:00:00+08:00
draft: false
slug: "hugo-blog-setup-guide"
summary: "A complete Hugo blogging practice: motivation and stack choice, directory structure, configuration, content organization, template system, AI-assisted design iteration, and the full path to auto-deploying on GitHub Pages — all based on this blog's real configuration."
categories:
  - projects
tags:
  - hugo
  - static-site
  - github-pages
  - workflow
---

# Building a Personal Blog with Hugo: From Design to Auto-Deploy

## 1. Why build this blog

For a personal blog, what I wanted was not "a website where I can publish posts", but:

- **Free**: no server bills, no domain renewals; long-term maintenance cost is zero
- **Controllable**: content is plain Markdown files in my own repository, migratable at any time
- **Long-term accumulation**: distill scattered inputs into reusable understanding, instead of publishing and forgetting
- **Designed**: not a ready-made theme template, but something I can iterate into the exact shape I want

Among static site generators, I compared Jekyll, Hexo and Hugo, and the reasons for choosing Hugo were concrete:

- **Single binary**: the whole tool is one executable; on macOS you just drop it into `~/bin`, no Ruby / Node runtime required
- **Fast builds**: a site with dozens of posts builds in tens of milliseconds; local preview refreshes instantly
- **Powerful templates**: `baseof` inheritance, `partials` reuse, and native taxonomy support are enough to express custom designs without modifying theme source code
- **Data-driven**: with the `data/` directory plus template iteration, metadata like "category definitions" can be a single source of truth

## 2. Overall architecture

```mermaid
flowchart LR
    A["Content: Markdown files<br/>content/ + data/"] --> B["Hugo static site generator<br/>layouts/ + static/"]
    B --> C["Build output public/"]
    C --> D["GitHub Actions<br/>hugo.yml auto build"]
    D --> E["GitHub Pages hosting<br/>wqt123.github.io"]
```

- **Hugo**: turns Markdown into HTML. Fast, single binary, flexible template system
- **GitHub Pages**: free static hosting, bound to the free `wqt123.github.io` domain
- **GitHub Actions**: auto-builds and publishes after every push to `main` — no manual uploads at all
- **AI agent (Doubao Work)**: collaborates directly in the local repository — reading the project, writing templates, iterating design, running commands, committing and pushing

## 3. Directory structure

A Hugo site has only a few core directories:

```text
wqt123.github.io/
├── hugo.toml            # global configuration
├── content/             # content (Markdown)
│   ├── _index.md        # homepage content
│   ├── posts/           # posts section
│   │   ├── _index.md    # posts list page content
│   │   └── 2026-xx-xx-xxx.md
│   └── categories/      # category taxonomy term content
│       ├── notes/_index.md
│       ├── projects/_index.md
│       ├── topics/_index.md
│       └── thoughts/_index.md
├── layouts/             # templates
│   ├── _default/
│   │   ├── baseof.html  # site-wide skeleton
│   │   ├── index.html   # homepage
│   │   ├── list.html    # list pages
│   │   └── single.html  # post pages
│   ├── partials/        # reusable fragments
│   └── taxonomy/        # category page templates
├── data/                # non-content data (category definitions)
├── static/              # static assets published as-is (CSS/JS)
├── archetypes/          # templates for new posts
└── .github/workflows/   # CI deployment
```

The key insight: **`content/` holds content, `layouts/` holds structure, `data/` holds metadata, `static/` holds assets.** These four are decoupled — that is why the Hugo template system is pleasant to work with.

## 4. Configuration: hugo.toml

Core configuration of this blog (excerpt):

```toml
baseURL = "https://wqt123.github.io/"
languageCode = "zh-cn"
title = "WQT Agent Lab"
hasCJKLanguage = true
enableRobotsTXT = true

[params]
description = "一个 Agent 工程师持续学习、构建和思考的个人工作台。"
subtitle = "和智能体一起，持续构建。"

[taxonomies]
tag = "tags"
series = "series"
category = "categories"

[permalinks]
posts = "/posts/:slug/"
```

A few points worth noting:

- `hasCJKLanguage = true`: lets Hugo truncate summaries using CJK language rules; otherwise Chinese summary cut-off points look odd
- `taxonomies`: built-in tag/series plus a new category — three classification systems each doing its own job
- `permalinks`: post URLs use `:slug`, hiding dates for stable long-term references
- `summaryLength`: controls how much body text is truncated on list pages

## 5. Content organization: sections and taxonomies

The fastest way for a personal blog to lose control is "content without structure". I use a two-layer model:

**Primary category (taxonomy, exactly one)** — expresses "what kind of content this is":

| Category | Positioning |
| --- | --- |
| notes | Concept breakdowns, paper reading, tool exploration |
| projects | Real implementations, lessons learned, engineering retrospectives |
| topics | Systematically organized knowledge for long-term reuse |
| thoughts | Industry observations, personal judgments, unfinished ideas |

**Tags (multiple optional)** — express "what technology this content involves".

Category definitions live in `data/categories.toml` as the single source of truth:

```toml
[[categories]]
slug = "projects"
title = "项目实践"
code = "BUILD"
description = "真实实现、踩坑记录、工程复盘。"
empty = "正在构建"
```

Each post declares its category in front matter:

```yaml
---
title: "用 Hugo 搭建个人博客"
date: 2026-09-27T11:00:00+08:00
categories:
  - projects
tags: ["hugo", "github-pages"]
---
```

**Turning content conventions into engineering constraints**: a partial specifically validates category legality — a post without a category, or with a category not in the definition table, fails the build. Enforce it at build time instead of relying on discipline.

## 6. Template system

### baseof: the site-wide skeleton

All pages inherit one skeleton; navigation and footer are written once:

```go-html-template
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ if .IsHome }}{{ .Site.Title }}{{ else }}{{ .Title }} | {{ .Site.Title }}{{ end }}</title>
  <link rel="stylesheet" href="{{ "css/main.css" | relURL }}">
</head>
<body>
  <header class="site-header">…</header>
  <main id="main-content" class="site-main">
    {{ block "main" . }}{{ end }}
  </main>
  <footer class="site-footer">…</footer>
</body>
</html>
```

### Homepage: data-driven category entries

The homepage does not show a post stream. Instead it iterates `data/categories.toml` and renders four category entry cards. Data changes, the homepage changes, and the template does not move:

```go-html-template
{{ range $index, $category := .Site.Data.categories.categories }}
  {{ $term := $.Site.GetPage (printf "/categories/%s" $category.slug) }}
  <a class="category-path" href="{{ $term.RelPermalink }}">
    <span>{{ printf "%02d" (add $index 1) }} / {{ $category.code }}</span>
    <h3>{{ $category.title }}</h3>
    <p>{{ $category.description }}</p>
    <span>{{ if gt (len $term.Pages) 0 }}{{ len $term.Pages }} 篇{{ else }}{{ $category.empty }}{{ end }}</span>
  </a>
{{ end }}
```

### single: the post page

The post page assembles the category label, date, reading time, a conditional sticky table of contents, and the body:

```go-html-template
<article class="article-page">
  <header class="article-head">
    <p class="section-label">{{ $category.title }}</p>
    <h1>{{ .Title }}</h1>
    <div class="article-meta">
      <time datetime="{{ .Date.Format "2006-01-02" }}">{{ .Date.Format "2006-01-02" }}</time>
      <span>约 {{ .ReadingTime }} 分钟</span>
    </div>
  </header>
  <div class="article-shell">
    {{ if gt (len .TableOfContents) 40 }}
      <aside class="article-toc">{{ .TableOfContents }}</aside>
    {{ end }}
    <div class="article-content">{{ .Content }}</div>
  </div>
</article>
```

Note `{{ .TableOfContents }}`: Hugo natively generates the table-of-contents HTML, and the template only needs to decide "show the sidebar TOC if the content is long enough". Long posts automatically get a TOC; short posts do not waste layout space.

## 7. Iterating the visual design with AI

This is the most interesting part. I did not install a theme — instead I handed the design requirements to Doubao Work (an AI agent):

1. First let it get familiar with the existing site: read the structure, read the styles, understand "what it looks like now"
2. Produce several explicit design directions (high-fidelity HTML mockups), each covering the homepage, the post list, and the reading page, so they can be compared directly in the browser
3. Give feedback round after round: remove the "current focus" block, remove section titles, keep only GitHub in the navigation… after each change the AI automatically screenshots and checks layout and overflow
4. After sign-off, translate the approved direction into Hugo templates and CSS tokens

The final direction is "Signal White · Editorial Lab": true white background, indigo primary color, amber signal dots, zero border radius, editorial-magazine typography. The design principle is **restraint** — the homepage has only a main tagline and four category entries, no post stream, no card stacking. The value of AI is not "generating a website" but turning "the website I imagine" into "the website that actually runs", step by step.

## 8. Local build and preview

Installation (a version identical to CI):

```bash
mkdir -p ~/bin
curl -L -o /tmp/hugo.tar.gz \
  https://github.com/gohugoio/hugo/releases/download/v0.145.0/hugo_extended_0.145.0_darwin-universal.tar.gz
tar -xzf /tmp/hugo.tar.gz -C /tmp
mv /tmp/hugo ~/bin/hugo
hugo version   # v0.145.0+extended
```

Preview and build:

```bash
hugo server          # local live preview, default http://localhost:1313
HUGO_ENVIRONMENT=production hugo --minify   # production build, output to public/
```

**Version alignment principle**: your local version must exactly match `hugo-version` in the CI workflow, otherwise template syntax differences will explode online. The `extended` build is mandatory, or SCSS/SASS-related template compilation fails.

## 9. Auto-deploy: GitHub Pages + Actions

The core of deployment is `.github/workflows/hugo.yml`:

```yaml
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "0.145.0"
          extended: true
      - run: hugo --minify
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

The **one-time setup** that goes with it (GitHub repo Settings → Pages):

1. Build and deployment → set Source to **GitHub Actions** (not "Deploy from a branch"!)
2. From then on, every `git push main` automatically runs build → upload artifact → publish

## 10. Pitfalls we hit

1. **A BOM in hugo.toml breaks parsing**: the editor saved a TOML with a BOM, and Hugo reported `invalid character at start of key`. Strip the first three bytes with `python3 -c` and it is fine
2. **Pages was in branch-deploy mode, so the live site kept serving old static files**: this is the sneakiest pitfall. Actions built successfully, yet the live site did not move — because the repository was previously "deploying from a branch", publishing the old HTML at the repo root. Switching the Source to GitHub Actions finally made it serve the build output
3. **Taxonomy list pages crash without a dedicated template**: `/categories/`, `/tags/` and similar taxonomy list pages (Kind = taxonomy) fall back to `_default/list.html`, and if list.html assumes "children are all posts" you get a nil pointer. Branch on `Kind` instead
4. **Local and CI versions differ**: template behavior (partial return values, `errorf`) varies between versions, so the version must be pinned identically
5. **A successful build ≠ a successful deploy**: passing local `hugo --minify` is only the first step; always verify against the real response of the live URL

## 11. Cost and summary

- **Money**: 0. Hugo is free, GitHub Pages is free
- **Maintenance**: writing a post means adding one Markdown file and pushing it; it goes live automatically
- **Control**: all code, content and styles live in your own repository

The complete Hugo pipeline: **content (Markdown) → templates (layouts) → build (hugo) → publish (Actions + Pages)**. Its core value is not "speed" but **the thorough decoupling of content and structure**: a post is plain Markdown, switching templates does not touch content; category metadata lives in `data/`, the homepage structure lives in templates, and the two never interfere. With GitHub Actions, writing becomes "write a file, push it, the site updates".

> What really proves you can run a blog is not "getting it running" but "every future post gets published reliably, the way you want it to".
