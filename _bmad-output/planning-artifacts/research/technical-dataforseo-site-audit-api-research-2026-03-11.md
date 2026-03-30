# DataForSEO API Research: Website/Blog SEO Audit Capabilities

**Date:** 2026-03-11
**Source:** Official DataForSEO documentation (docs.dataforseo.com) + pricing pages
**Purpose:** Exhaustive API reference for implementing site-level SEO audit features

---

## Table of Contents

1. [On-Page API](#1-on-page-api)
2. [Backlinks API](#2-backlinks-api)
3. [Content Analysis API](#3-content-analysis-api)
4. [Domain Analytics API](#4-domain-analytics-api)
5. [Pricing Summary](#5-pricing-summary)
6. [Rate Limits Summary](#6-rate-limits-summary)
7. [Implementation Recommendations](#7-implementation-recommendations)

---

## 1. ON-PAGE API

**Base URL:** `https://api.dataforseo.com/v3/on_page/`

The On-Page API is a customizable crawling engine for extracting website performance data. It supports both **task-based** (async POST/GET) and **live** (instant) modes.

### 1.1 Task POST (Initiate Crawl)

**Endpoint:** `POST /v3/on_page/task_post`
**Mode:** Async (task-based)
**Rate Limit:** 2000 calls/min, max 100 tasks per POST
**Cost:** $0.000125 per crawled page (base)

#### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | string | Domain without `https://` or `www.` |
| `max_crawl_pages` | integer | Number of pages to crawl |

#### Key Optional Parameters

| Parameter | Type | Default | Description | Extra Cost |
|-----------|------|---------|-------------|------------|
| `start_url` | string | -- | Absolute URL for initial crawl page | No |
| `force_sitewide_checks` | boolean | false | Enable sitewide checks for single-page crawl | No |
| `priority_urls` | array | -- | Up to 20 URLs to crawl first | No |
| `max_crawl_depth` | integer | -- | Max link depth | No |
| `crawl_delay` | integer | 2000 | Delay between requests (ms) | No |
| `store_raw_html` | boolean | false | Store HTML for raw retrieval | No |
| `enable_content_parsing` | boolean | false | Parse page content structurally | +$0.000125/page |
| `support_cookies` | boolean | false | Support cookies during crawl | No |
| `accept_language` | string | -- | Language header (e.g. `en-US`) | No |
| `custom_robots_txt` | string | -- | Custom robots.txt rules | No |
| `robots_txt_merge_mode` | string | merge | `merge` or `override` | No |
| `custom_user_agent` | string | RSiteAuditor | Custom UA string | No |
| `browser_preset` | string | -- | `desktop`, `mobile`, `tablet` | No |
| `browser_screen_width` | integer | -- | 240-9999 px (requires JS) | No |
| `browser_screen_height` | integer | -- | 240-9999 px (requires JS) | No |
| `browser_screen_scale_factor` | float | -- | 0.5-3 (requires JS) | No |
| `respect_sitemap` | boolean | false | Follow sitemap page order | No |
| `custom_sitemap` | string | -- | Alternative sitemap URL | No |
| `crawl_sitemap_only` | boolean | false | Only crawl sitemap pages | No |
| `load_resources` | boolean | false | Load images, CSS, scripts | +$0.000375/page |
| `enable_www_redirect_check` | boolean | false | Check www redirect | No |
| `enable_javascript` | boolean | false | Execute page JS | +$0.00125/page |
| `enable_xhr` | boolean | false | Allow XMLHttpRequest (needs JS) | No |
| `enable_browser_rendering` | boolean | false | Full browser rendering + Core Web Vitals | +$0.00425/page |
| `disable_cookie_popup` | boolean | false | Dismiss cookie popups | No |
| `custom_js` | string | -- | Custom JS (max 2000 chars, 700ms exec) | +$0.00025/page |
| `validate_micromarkup` | boolean | false | Validate structured data | No |
| `allow_subdomains` | boolean | false | Crawl all subdomains | No |
| `allowed_subdomains` | array | -- | Specific subdomains to include | No |
| `disallowed_subdomains` | array | -- | Subdomains to exclude | No |
| `check_spell` | boolean | false | Hunspell spelling check | No |
| `check_spell_language` | string | auto | Language code for spellcheck | No |
| `check_spell_exceptions` | array | -- | Words to exclude (max 1000) | No |
| `calculate_keyword_density` | boolean | false | Calculate keyword frequency | +$0.00025/page |
| `checks_threshold` | object | -- | Custom threshold values | No |
| `disable_sitewide_checks` | array | -- | Skip specific checks | No |
| `disable_page_checks` | array | -- | Skip page checks from score | No |
| `switch_pool` | boolean | false | Use additional proxies | No |
| `return_despite_timeout` | boolean | false | Return data on timeout | No |
| `tag` | string | -- | Custom identifier (max 255 chars) | No |
| `pingback_url` | string | -- | Notification URL ($id, $tag vars) | No |

#### Customizable Thresholds (`checks_threshold`)

| Parameter | Default | Type |
|-----------|---------|------|
| `title_too_short` | 30 | int (chars) |
| `title_too_long` | 65 | int (chars) |
| `small_page_size` | 1024 | int (bytes) |
| `large_page_size` | 1048576 | int (bytes) |
| `low_character_count` | 1024 | int |
| `high_character_count` | 256000 | int |
| `low_content_rate` | 0.1 | float |
| `high_content_rate` | 0.9 | float |
| `high_loading_time` | 3000 | int (ms) |
| `high_waiting_time` | 1500 | int (ms) |
| `low_readability_rate` | 15.0 | float |
| `irrelevant_description` | 0.2 | float |
| `irrelevant_title` | 0.3 | float |
| `irrelevant_meta_keywords` | 0.6 | float |

#### Example Request

```json
[
  {
    "target": "dataforseo.com",
    "max_crawl_pages": 10,
    "load_resources": true,
    "enable_javascript": true,
    "enable_browser_rendering": true,
    "validate_micromarkup": true,
    "check_spell": true,
    "calculate_keyword_density": true,
    "enable_content_parsing": true,
    "tag": "site-audit-v1",
    "pingback_url": "https://your-server.com/pingscript?id=$id&tag=$tag"
  }
]
```

#### Example Response

```json
{
  "version": "0.1.20200805",
  "status_code": 20000,
  "status_message": "Ok.",
  "time": "0.0815 sec.",
  "cost": 0.00125,
  "tasks_count": 1,
  "tasks_error": 0,
  "tasks": [
    {
      "id": "08071719-1535-0216-0000-3aabdf68a6ef",
      "status_code": 20100,
      "status_message": "Task Created.",
      "time": "0.0044 sec.",
      "cost": 0.00125,
      "result_count": 0,
      "path": ["v3", "on_page", "task_post"],
      "data": {
        "api": "on_page",
        "function": "task_post",
        "target": "dataforseo.com",
        "max_crawl_pages": 10
      },
      "result": null
    }
  ]
}
```

---

### 1.2 Tasks Ready

**Endpoint:** `GET /v3/on_page/tasks_ready`
**Mode:** Polling alternative to pingback
**Cost:** Free

Returns list of completed tasks not yet collected.

---

### 1.3 Force Stop

**Endpoint:** `POST /v3/on_page/force_stop`
**Cost:** Free

Terminates an ongoing crawl process.

---

### 1.4 Summary (Site-Level Results)

**Endpoint:** `GET /v3/on_page/summary/{task_id}`
**Mode:** Task-based (requires completed crawl)
**Cost:** Free (charged at task_post time)

#### Response: Domain Info Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Domain name |
| `cms` | string | Detected CMS |
| `ip` | string | Domain IP |
| `server` | string | Server version |
| `crawl_start` | string | UTC timestamp |
| `crawl_end` | string | UTC timestamp (null if running) |
| `extended_crawl_status` | string | `no_errors`, `site_unreachable`, `invalid_page_status_code`, `forbidden_meta_tag`, `forbidden_robots`, `forbidden_http_header`, `too_many_redirects`, `unknown` |
| `total_pages` | integer | Total crawled pages |
| `page_not_found_status_code` | integer | 404 status |
| `canonicalization_status_code` | integer | Canonical status |
| `www_redirect_status_code` | integer | www redirect status |

#### Response: SSL Info Object

| Field | Type | Description |
|-------|------|-------------|
| `valid_certificate` | boolean | SSL validity |
| `certificate_issuer` | string | Issuing authority |
| `certificate_subject` | string | Associated entity |
| `certificate_version` | string | X.509 version |
| `certificate_hash` | string | Hash function |
| `certificate_expiration_date` | string | Expiration UTC |

#### Response: Domain-Level Checks

| Field | Type | Description |
|-------|------|-------------|
| `sitemap` | boolean | Sitemap exists |
| `robots_txt` | boolean | robots.txt exists |
| `start_page_deny_flag` | boolean | 403 on start page |
| `ssl` | boolean | SSL present |
| `http2` | boolean | HTTP/2 support |
| `test_canonicalization` | boolean | Canonical behavior |
| `test_www_redirect` | boolean | www redirect works |
| `test_hidden_server_signature` | boolean | Server sig hidden |
| `test_page_not_found` | boolean | 404 behavior correct |
| `test_directory_browsing` | boolean | Directory listing restricted |
| `test_https_redirect` | boolean | HTTP to HTTPS redirect |

#### Response: Aggregate Page Metrics

| Field | Type | Description |
|-------|------|-------------|
| `links_external` | integer | Total external links |
| `links_internal` | integer | Total internal links |
| `duplicate_title` | integer | Pages with duplicate titles |
| `duplicate_description` | integer | Pages with duplicate descriptions |
| `duplicate_content` | integer | Pages with duplicate content |
| `broken_links` | integer | Broken link count |
| `broken_resources` | integer | Broken resource count |
| `links_relation_conflict` | integer | Link relation conflicts |
| `redirect_loop` | integer | Redirect loops |
| `onpage_score` | float | 0-100 optimization score |
| `non_indexable` | integer | Non-indexable pages |

#### Response: Page-Level Check Aggregates (50+ checks)

Each field contains the COUNT of pages with that issue:

- `canonical`, `no_title`, `title_too_short`, `title_too_long`, `no_description`
- `no_h1_tag`, `no_image_alt`, `no_favicon`
- `is_https`, `is_http`, `is_broken`, `is_4xx_code`, `is_5xx_code`, `is_redirect`
- `low_content_rate`, `high_content_rate`, `low_character_count`, `high_character_count`
- `low_readability_rate`, `irrelevant_description`, `irrelevant_title`
- `seo_friendly_url`, `deprecated_html_tags`, `duplicate_meta_tags`
- `has_micromarkup`, `has_micromarkup_errors`
- `is_orphan_page`, `redirect_chain`, `canonical_chain`
- `canonical_to_broken`, `canonical_to_redirect`
- `https_to_http_links`, `has_render_blocking_resources`
- `has_misspelling`, `lorem_ipsum`
- `size_greater_than_3mb`, `large_page_size`, `small_page_size`
- `no_content_encoding`, `high_loading_time`, `high_waiting_time`
- Many more...

---

### 1.5 Pages (Per-Page SEO Data)

**Endpoint:** `POST /v3/on_page/pages`
**Mode:** Task-based
**Cost:** Free (charged at task_post time)

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task ID (required) |
| `limit` | integer | Max 1000, default 100 |
| `offset` | integer | Default 0 |
| `filters` | array | Up to 8 conditions |
| `order_by` | array | Max 3 sort rules |
| `search_after_token` | string | Pagination beyond 20k |
| `tag` | string | Custom identifier |

#### Response: Per-Page Fields

**Meta Object:**
- `title`, `meta_title`, `description`, `charset`, `meta_keywords`
- `canonical`, `favicon`, `generator`, `follow` (boolean)
- `internal_links_count`, `external_links_count`, `inbound_links_count`
- `images_count`, `images_size`, `scripts_count`, `scripts_size`
- `stylesheets_count`, `stylesheets_size`
- `render_blocking_scripts_count`, `render_blocking_stylesheets_count`
- `title_length`, `description_length`
- `cumulative_layout_shift` (CLS metric)

**Content Object:**
- `plain_text_size` (bytes), `plain_text_rate` (text-to-size ratio)
- `plain_text_word_count`
- `automated_readability_index`, `coleman_liau_readability_index`
- `dale_chall_readability_index`, `flesch_kincaid_readability_index`
- `smog_readability_index`
- `title_to_content_consistency` (0-1)
- `description_to_content_consistency` (0-1)
- `meta_keywords_to_content_consistency` (0-1)

**Page Timing Object:**
- `connection_time`, `time_to_secure_connection` (ms)
- `request_sent_time`, `waiting_time` (TTFB, ms)
- `download_time`, `duration_time` (ms)
- `fetch_start`, `fetch_end` (ms)
- `time_to_interactive` (TTI, ms)
- `dom_complete` (ms)
- `largest_contentful_paint` (LCP, ms)
- `first_input_delay` (FID, ms)
- `cumulative_layout_shift` (CLS)

**Scoring:**
- `onpage_score` (0-100)

**Page Sizing:**
- `size`, `encoded_size`, `total_transfer_size` (bytes)
- `total_dom_size`, `url_length`, `relative_url_length`

**Cache Control:**
- `cachable` (boolean), `ttl` (seconds)

**Checks Object (60+ boolean flags):**

*Performance:*
- `no_content_encoding`, `high_loading_time`, `high_waiting_time`
- `has_render_blocking_resources`

*HTTP/Redirect:*
- `is_redirect`, `is_4xx_code`, `is_5xx_code`, `is_broken`
- `redirect_chain`, `has_links_to_redirects`
- `canonical_to_redirect`, `canonical_chain`, `recursive_canonical`

*Protocol/Structure:*
- `is_www`, `is_https`, `is_http`
- `no_doctype`, `has_html_doctype`, `no_encoding_meta_tag`
- `meta_charset_consistency`, `has_meta_refresh_redirect`

*Meta Tag:*
- `no_title`, `title_too_short`, `title_too_long`, `has_meta_title`
- `no_description`, `irrelevant_description`, `irrelevant_title`
- `irrelevant_meta_keywords`
- `duplicate_title_tag`, `duplicate_meta_tags`, `deprecated_html_tags`

*Content:*
- `no_h1_tag`, `no_image_alt`, `no_image_title`, `no_favicon`
- `low_content_rate`, `high_content_rate`
- `low_character_count`, `high_character_count`
- `low_readability_rate`, `lorem_ipsum`, `has_misspelling`

*Size:*
- `small_page_size`, `large_page_size`, `size_greater_than_3mb`

*URL:*
- `seo_friendly_url`, `seo_friendly_url_characters_check`
- `seo_friendly_url_dynamic_check`, `seo_friendly_url_keywords_check`
- `seo_friendly_url_relative_length_check`

*Markup:*
- `has_micromarkup`, `has_micromarkup_errors`
- `frame`, `flash`

*Linking:*
- `broken_resources`, `broken_links`
- `duplicate_title`, `duplicate_description`, `duplicate_content`
- `is_orphan_page`, `is_link_relation_conflict`
- `https_to_http_links`, `from_sitemap`

**Additional Fields:**
- `click_depth` (clicks from homepage)
- `deprecated_tags` (array), `duplicate_meta_tags` (array)
- `spell.hunspell_language_code`, `spell.misspelled` (array)
- `social_media_tags` (Open Graph, Twitter Card)
- `resource_errors.errors[]`, `resource_errors.warnings[]`
- `content_encoding`, `media_type`, `server`
- `last_modified.header`, `last_modified.sitemap`, `last_modified.meta_tag`

---

### 1.6 Instant Pages (Live Mode)

**Endpoint:** `POST /v3/on_page/instant_pages`
**Mode:** Live (immediate results)
**Rate Limit:** 2000/min, max 20 tasks per request, max 5 identical domains
**Cost:** $0.000125 per page (base)

Analyzes a single URL immediately without a prior crawl task. Returns the same comprehensive per-page data as the Pages endpoint (meta, content, timing, checks, score).

#### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | Target page URL (absolute) |

#### Key Optional Parameters

Same as Task POST for per-page settings: `browser_preset`, `enable_javascript`, `enable_browser_rendering`, `load_resources`, `validate_micromarkup`, `check_spell`, `checks_threshold`, `custom_user_agent`, `store_raw_html`, `disable_cookie_popup`, `accept_language`, `enable_xhr`, `custom_js`, `switch_pool`, `ip_pool_for_scan` (`us` or `de`), `return_despite_timeout`.

#### Response

Identical structure to Pages endpoint for a single page. All meta, content, timing, checks, and scoring fields available.

---

### 1.7 Keyword Density

**Endpoint:** `POST /v3/on_page/keyword_density`
**Mode:** Task-based (requires `calculate_keyword_density: true` in task_post)
**Cost:** Free retrieval (extra $0.00025/page at crawl time)

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Task ID |
| `keyword_length` | integer | Yes | 1-5 words per keyword |
| `url` | string | No | Specific page URL (omit for site-wide) |
| `limit` | integer | No | Default 100, max 1000 |
| `filters` | array | No | Max 8 filters |
| `order_by` | array | No | Max 3 sort rules |

#### Response Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `keyword` | string | The keyword phrase |
| `frequency` | integer | Occurrence count |
| `density` | float | Frequency ratio (decimal) |

#### Example Response

```json
{
  "items": [
    {"keyword": "read more", "frequency": 9, "density": 0.00757},
    {"keyword": "data api", "frequency": 8, "density": 0.00673}
  ]
}
```

---

### 1.8 Duplicate Content

**Endpoint:** `POST /v3/on_page/duplicate_content`
**Mode:** Task-based
**Cost:** Free retrieval

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task ID (required) |
| `url` | string | Initial page URL to find duplicates of |
| `similarity` | integer | Threshold 0-10 (default >= 6) |
| `limit` | integer | Default 100, max 1000 |
| `offset` | integer | Default 0 |

Uses **SimHash algorithm** for content comparison. Score of 10 = identical content.

#### Response Item Fields

- `url`: The reference URL
- `total_count`: Number of duplicates found
- `pages[]`: Array of duplicate pages, each with:
  - `similarity` (0-10 score)
  - Full page object with all meta, timing, checks fields

---

### 1.9 Duplicate Tags

**Endpoint:** `POST /v3/on_page/duplicate_tags`
**Mode:** Task-based
**Cost:** Free retrieval

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Task ID |
| `type` | string | Yes | `duplicate_title` or `duplicate_description` |
| `accumulator` | string | No | Specific tag value to filter |
| `limit` | integer | No | Default 100, max 1000 |

#### Response

Groups of pages sharing the same title or description, with full page data for each.

---

### 1.10 Links

**Endpoint:** `POST /v3/on_page/links`
**Mode:** Task-based
**Cost:** Free retrieval

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task ID (required) |
| `page_from` | string | Filter by source page (relative URL) |
| `page_to` | string | Filter by target page (relative URL) |
| `limit` | integer | Default 100, max 1000 |
| `offset` | integer | Default 0 |
| `filters` | array | Max 8 conditions |
| `search_after_token` | string | For > 20k results |

#### Link Types Detected

| Type | Description |
|------|-------------|
| `anchor` | `<a>` tags |
| `image` | `<img>` inside `<a>` |
| `link` | `<link>` tags (CSS, etc.) |
| `canonical` | `<meta rel="canonical">` |
| `meta` | Meta refresh redirects |
| `alternate` | hreflang links |
| `redirect` | HTTP 3xx |

#### Response Item Fields

- `type`, `domain_from`, `domain_to`, `page_from`, `page_to`
- `link_from`, `link_to` (absolute URLs)
- `direction`: `internal` or `external`
- `dofollow`: boolean
- `is_broken`: boolean
- `page_to_status_code`: integer
- `is_link_relation_conflict`: boolean
- For anchor/image: `text`, `image_alt`, `image_src`, `link_attribute[]`
- For alternate: `is_valid_hreflang`, `hreflang`

---

### 1.11 Redirect Chains

**Endpoint:** `POST /v3/on_page/redirect_chains`
**Mode:** Task-based
**Cost:** Free retrieval

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task ID (required) |
| `url` | string | Filter chains containing URL |
| `limit` | integer | Default 100, max 1000 |
| `filters` | array | Filter by `is_redirect_loop` |

#### Response Item Fields

- `is_redirect_loop`: boolean (true if final URL loops back)
- `chain[]`: Array of redirect links, each with:
  - `type`: `redirect`
  - `domain_from`, `domain_to`, `page_from`, `page_to`
  - `link_from`, `link_to` (absolute)
  - `dofollow`, `direction`, `is_broken`, `is_link_relation_conflict`
  - `page_from_scheme`, `page_to_scheme`

---

### 1.12 Non-Indexable Pages

**Endpoint:** `POST /v3/on_page/non_indexable`
**Mode:** Task-based
**Cost:** Free retrieval

#### Response Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `reason` | string | `robots_txt`, `meta_tag`, `http_header`, `attribute`, `too_many_redirects` |
| `url` | string | Non-indexable page URL |

---

### 1.13 Resources (Images, Scripts, CSS)

**Endpoint:** `POST /v3/on_page/resources`
**Mode:** Task-based (requires `load_resources: true` at crawl)
**Cost:** Free retrieval

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task ID (required) |
| `url` | string | Filter by page URL |
| `limit` | integer | Default 100, max 1000 |
| `filters` | array | Max 8 conditions |
| `relevant_pages_filters` | array | Filter by page properties |
| `order_by` | array | Max 3 sort rules |
| `search_after_token` | string | For > 20k results |

#### Response Item Fields

- `resource_type`: `script`, `image`, `stylesheet`, `broken`
- `status_code`, `url`, `size`, `encoded_size`, `total_transfer_size`
- `fetch_time`, `fetch_timing` (duration_time, fetch_start, fetch_end)
- `cache_control` (cachable, ttl)
- `checks` (no_content_encoding, is_broken, is_https, etc.)
- `content_encoding`, `media_type`, `accept_type`, `server`
- `meta` (type-dependent: alt text, dimensions for images)
- `resource_errors` (errors[], warnings[])

---

### 1.14 Waterfall (Page Speed)

**Endpoint:** `POST /v3/on_page/waterfall`
**Mode:** Task-based (requires `load_resources: true`)
**Cost:** Free retrieval

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task ID (required) |
| `url` | string | Page URL (required) |

#### Response Item Fields

- `page_url`, `time_to_interactive`, `dom_complete`
- `connection_time`, `time_to_secure_connection`
- `request_sent_time`, `waiting_time`, `download_time`
- `duration_time`, `fetch_start`, `fetch_end`
- `resources[]`: Array of resources with:
  - `resource_type`, `url`, `initiator`
  - `duration_time`, `fetch_start`, `fetch_end`
  - `location` (line, offset_left, offset_top)
  - `is_render_blocking` (boolean)

---

### 1.15 Raw HTML

**Endpoint:** `POST /v3/on_page/raw_html`
**Mode:** Task-based (requires `store_raw_html: true`)
**Cost:** Free retrieval

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task ID (required) |
| `url` | string | Page URL (required) |

#### Response

- `items.html`: Raw HTML string of the page

---

### 1.16 Content Parsing (Task-based)

**Endpoint:** `POST /v3/on_page/content_parsing`
**Mode:** Task-based (requires `enable_content_parsing: true`)
**Cost:** Free retrieval (+$0.000125/page at crawl)

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Task ID (required) |
| `url` | string | Page URL (required) |
| `markdown_view` | boolean | Return markdown (default: false) |

#### Response: Page Content Structure

```
page_content:
  header:        {primary_content, secondary_content, table_content}
  footer:        {primary_content, secondary_content, table_content}
  main_topic:    {primary_content, secondary_content, table_content}
  secondary_topic: {primary_content, secondary_content, table_content}
  ratings[]:     {name, value, max, count, relative}
  offers[]:      {name, price, currency, valid_until}
  comments[]:    {rating, title, publish_date, author, content}
  contacts:      {telephones[], emails[]}
  page_as_markdown: (if requested)
```

Content elements contain `text`, `url`, `urls[]` (with url + anchor_text).

---

### 1.17 Content Parsing Live

**Endpoint:** `POST /v3/on_page/content_parsing/live`
**Mode:** Live (immediate)
**Cost:** $0.000125 per page

Same parameters as Instant Pages for browser/rendering settings plus `markdown_view`.
Same response structure as task-based Content Parsing.

---

### 1.18 Page Screenshot

**Endpoint:** `POST /v3/on_page/page_screenshot`
**Mode:** Live
**Cost:** $0.004 per page

Captures a high-quality screenshot of any webpage.

---

### 1.19 Lighthouse (Multiple Endpoints)

**Live JSON Endpoint:** `POST /v3/on_page/lighthouse/live/json`
**Mode:** Live (also has Standard Queue variant)
**Cost:** $0.00425 per page (unified for both modes)
**Rate Limit:** 2000/min, 1 task per POST, max 30 simultaneous

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Target page (absolute URL) |
| `for_mobile` | boolean | No | Mobile emulation (default: false) |
| `categories` | array | No | `seo`, `pwa`, `performance`, `best_practices`, `accessibility` |
| `audits` | array | No | Specific audit names |
| `version` | string | No | Lighthouse version |
| `language_name` | string | No | Default: `English` |
| `language_code` | string | No | Default: `en` |

#### Response: Audit Objects

Each audit contains:
- `id`, `title`, `description`
- `score` (0-1 or null)
- `scoreDisplayMode` (`numeric`, `binary`, `informative`, `error`, `notApplicable`)
- `numericValue`, `numericUnit`
- `displayValue` (human-readable)
- `details` (tables, opportunities, diagnostics)

Categories: `seo`, `pwa`, `performance`, `best_practices`, `accessibility` -- each with overall score.

---

## 2. BACKLINKS API

**Base URL:** `https://api.dataforseo.com/v3/backlinks/`
**Mode:** All endpoints are Live (instant)
**Rate Limit:** 2000 calls/min, max 30 simultaneous
**Cost:** $0.02 per request + $0.00003 per row

### 2.1 Summary

**Endpoint:** `POST /v3/backlinks/summary/live`

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | string | Yes | Domain, subdomain, or page URL |
| `include_subdomains` | boolean | No | Default: true |
| `include_indirect_links` | boolean | No | Default: true |
| `exclude_internal_backlinks` | boolean | No | Default: true |
| `internal_list_limit` | integer | No | Max 1000, default: 10 |
| `backlinks_status_type` | string | No | `all`, `live`, `lost` (default: `live`) |
| `backlinks_filters` | array | No | Filter conditions |
| `rank_scale` | string | No | `one_hundred` or `one_thousand` |

#### Response Fields

**Target Metrics:**
- `target`, `rank` (0-1000), `backlinks` (total count)
- `backlinks_spam_score`, `first_seen`, `lost_date`

**Referring Stats:**
- `referring_domains`, `referring_domains_nofollow`
- `referring_main_domains`, `referring_main_domains_nofollow`
- `referring_ips`, `referring_subnets`
- `referring_pages`, `referring_pages_nofollow`

**Page Analysis:**
- `crawled_pages`, `internal_links_count`, `external_links_count`
- `broken_backlinks`, `broken_pages`

**Info Object:**
- `server`, `cms`, `platform_type[]`, `ip_address`
- `country`, `is_ip`, `target_spam_score`

**Distribution Objects:**
- `referring_links_tld` (TLD breakdown)
- `referring_links_types` (anchor, image, link, meta, canonical, alternate, redirect)
- `referring_links_attributes` (nofollow, noopener, noreferrer, external, ugc, sponsored)
- `referring_links_platform_types` (cms, blogs, ecommerce, message-boards, wikis, news, organization)
- `referring_links_semantic_locations` (article, section, summary, etc.)
- `referring_links_countries` (ISO country codes)

#### Example

```json
// Request
[{
  "target": "example.com",
  "internal_list_limit": 10,
  "include_subdomains": true,
  "backlinks_filters": ["dofollow", "=", true],
  "backlinks_status_type": "all"
}]

// Response (abbreviated)
{
  "cost": 0.02003,
  "result": [{
    "target": "example.com",
    "rank": 371,
    "backlinks": 41245,
    "backlinks_spam_score": 8,
    "referring_domains": 12372,
    "referring_main_domains": 11438,
    "crawled_pages": 2150
  }]
}
```

---

### 2.2 Backlinks (Detailed List)

**Endpoint:** `POST /v3/backlinks/backlinks/live`

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | string | Domain, subdomain, or page (required) |
| `mode` | string | `as_is`, `one_per_domain`, `one_per_anchor` |
| `custom_mode` | object | Advanced grouping (field + value, 1-1000) |
| `filters` | array | Max 8 filters |
| `order_by` | array | Max 3 rules |
| `offset` | integer | Max 20,000 |
| `search_after_token` | string | For > 20k results |
| `limit` | integer | Max 1000, default 100 |
| `backlinks_status_type` | string | `all`, `live`, `lost` |
| `include_subdomains` | boolean | Default: true |
| `include_indirect_links` | boolean | Default: true |
| `exclude_internal_backlinks` | boolean | Default: true |
| `rank_scale` | string | `one_hundred` or `one_thousand` |

#### Response: Backlink Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `domain_from` | string | Referring domain |
| `url_from` | string | Referring page URL |
| `url_from_https` | boolean | HTTPS |
| `domain_to` | string | Target domain |
| `url_to` | string | Target URL |
| `url_to_https` | boolean | HTTPS |
| `tld_from` | string | TLD of referrer |
| `is_new` | boolean | Found on last crawl |
| `is_lost` | boolean | Backlink removed |
| `backlink_spam_score` | integer | Spam score |
| `rank` | integer | Backlink rank |
| `page_from_rank` | integer | Referring page rank |
| `domain_from_rank` | integer | Referring domain rank |
| `domain_from_platform_type` | array | Platform types |
| `domain_from_ip` | string | Referring domain IP |
| `domain_from_country` | string | ISO country |
| `page_from_external_links` | integer | External links on page |
| `page_from_internal_links` | integer | Internal links on page |
| `page_from_size` | integer | Page size (bytes) |
| `page_from_encoding` | string | Encoding (utf-8) |
| `page_from_language` | string | ISO language |
| `page_from_title` | string | Page title |
| `page_from_status_code` | integer | HTTP status |
| `first_seen` | string | Discovery date |
| `prev_seen` | string | Previous visit |
| `last_seen` | string | Latest visit |
| `item_type` | string | anchor/image/meta/canonical/alternate/redirect |
| `attributes` | array | Link attributes (nofollow, etc.) |
| `dofollow` | boolean | Is dofollow |
| `original` | boolean | Present on first crawl |
| `alt` | string | Image alt text |
| `image_url` | string | Image URL |
| `anchor` | string | Anchor text |
| `text_pre` | string | Text before anchor |
| `text_post` | string | Text after anchor |
| `semantic_location` | string | HTML element (article, section...) |
| `links_count` | integer | Identical backlinks on page |
| `group_count` | integer | Total from domain (one_per_domain) |
| `is_broken` | boolean | Points to 4xx/5xx |
| `url_to_status_code` | integer | Target status code |
| `url_to_spam_score` | integer | Target spam score |
| `url_to_redirect_target` | string | Redirect target |
| `is_indirect_link` | boolean | Via redirect/canonical |
| `indirect_link_path` | array | URL sequence |

---

### 2.3 Anchors

**Endpoint:** `POST /v3/backlinks/anchors/live`

#### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | string | Required |
| `limit` | integer | Max 1000, default 100 |
| `offset` | integer | Default 0 |
| `internal_list_limit` | integer | Max 1000, default 10 |
| `backlinks_status_type` | string | `all`, `live`, `lost` |
| `filters` | array | Max 8 |
| `order_by` | array | Max 3 |
| `backlinks_filters` | array | Filter backlinks |
| `include_subdomains` | boolean | Default: true |
| `include_indirect_links` | boolean | Default: true |
| `exclude_internal_backlinks` | boolean | Default: true |
| `rank_scale` | string | Scale choice |

#### Response Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `anchor` | string | Anchor text |
| `rank` | integer | Rank volume via this anchor |
| `backlinks` | integer | Backlink count |
| `first_seen` | string | Discovery date |
| `lost_date` | string | Loss date |
| `backlinks_spam_score` | integer | Avg spam score |
| `broken_backlinks` | integer | Broken count |
| `broken_pages` | integer | 4xx/5xx pages |
| `referring_domains` | integer | Domain count |
| `referring_domains_nofollow` | integer | Nofollow domains |
| `referring_main_domains` | integer | Main domains |
| `referring_ips` | integer | IP count |
| `referring_subnets` | integer | Subnet count |
| `referring_pages` | integer | Page count |
| `referring_pages_nofollow` | integer | Nofollow pages |
| `referring_links_tld` | object | TLD distribution |
| `referring_links_types` | object | Link type breakdown |
| `referring_links_attributes` | object | Attribute breakdown |
| `referring_links_platform_types` | object | Platform breakdown |
| `referring_links_semantic_locations` | object | Semantic locations |
| `referring_links_countries` | object | Country distribution |

---

### 2.4 Referring Domains

**Endpoint:** `POST /v3/backlinks/referring_domains/live`

#### Request Parameters

Same as Anchors endpoint: `target`, `limit`, `offset`, `internal_list_limit`, `backlinks_status_type`, `filters`, `order_by`, `backlinks_filters`, `include_subdomains`, `include_indirect_links`, `exclude_internal_backlinks`, `rank_scale`.

#### Response Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `domain` | string | Referring domain |
| `rank` | integer | Domain rank |
| `backlinks` | integer | Backlink count to target |
| `first_seen` | string | Discovery date |
| `lost_date` | string | Loss date (null if active) |
| `backlinks_spam_score` | integer | Avg spam score |
| `broken_backlinks` | integer | Broken link count |
| `broken_pages` | integer | 4xx/5xx page count |
| `referring_domains` | integer | Domains count |
| `referring_main_domains` | integer | Main domains |
| `referring_ips` | integer | IP count |
| `referring_subnets` | integer | Subnet count |
| `referring_pages` | integer | Page count |
| `referring_links_tld` | object | TLD distribution |
| `referring_links_types` | object | Link types |
| `referring_links_attributes` | object | Attributes |
| `referring_links_platform_types` | object | Platforms |
| `referring_links_semantic_locations` | object | Semantic elements |
| `referring_links_countries` | object | Countries |

---

### 2.5 Other Backlink Endpoints

| Endpoint | Path | Description |
|----------|------|-------------|
| History | `/v3/backlinks/history/live` | Historical link-building data |
| Domain Pages | `/v3/backlinks/domain_pages/live` | Pages ranked by backlink count |
| Domain Pages Summary | `/v3/backlinks/domain_pages_summary/live` | Summary per domain page |
| Referring Networks | `/v3/backlinks/referring_networks/live` | IPs/subnets sending links |
| Competitors | `/v3/backlinks/competitors/live` | Domains sharing backlink profile |
| Domain Intersection | `/v3/backlinks/domain_intersection/live` | Common referring domains |
| Page Intersection | `/v3/backlinks/page_intersection/live` | Common referring pages |
| Timeseries Summary | `/v3/backlinks/timeseries_summary/live` | Backlinks within date range |
| New/Lost Timeseries | `/v3/backlinks/timeseries_new_lost_summary/live` | New/lost over time |

### 2.6 Bulk Endpoints (up to 1000 targets)

| Endpoint | Path |
|----------|------|
| Bulk Ranks | `/v3/backlinks/bulk_ranks/live` |
| Bulk Backlinks | `/v3/backlinks/bulk_backlinks/live` |
| Bulk Spam Score | `/v3/backlinks/bulk_spam_score/live` |
| Bulk Referring Domains | `/v3/backlinks/bulk_referring_domains/live` |
| Bulk New/Lost Backlinks | `/v3/backlinks/bulk_new_lost_backlinks/live` |
| Bulk New/Lost Referring Domains | `/v3/backlinks/bulk_new_lost_referring_domains/live` |

---

## 3. CONTENT ANALYSIS API

**Base URL:** `https://api.dataforseo.com/v3/content_analysis/`
**Mode:** All endpoints are Live
**Rate Limit:** 2000 calls/min
**Cost:** $0.02 per request + $0.00003 per row

**NOTE:** This API is for discovering brand/keyword citations across the web and analyzing sentiment. It is NOT a page-level content quality analysis tool. It tracks how your brand/keywords appear on other websites.

### 3.1 Search

**Endpoint:** `POST /v3/content_analysis/search/live`

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | string | Yes | Target keyword (UTF-8, converted to lowercase) |
| `keyword_fields` | object | No | Filter: `title`, `main_title`, `previous_title`, `snippet` |
| `page_type` | array | No | `ecommerce`, `news`, `blogs`, `message-boards`, `organization` |
| `search_mode` | string | No | `as_is` or `one_per_domain` |
| `limit` | integer | No | Max 1000, default 100 |
| `offset` | integer | No | For up to 10k results |
| `offset_token` | string | No | For > 10k results |
| `filters` | array | No | Max 8 |
| `order_by` | array | No | Max 3 |
| `rank_scale` | string | No | `one_hundred` or `one_thousand` |

#### Response Item Fields

- `url`, `domain`, `main_domain`
- `url_rank`, `domain_rank`, `spam_score`
- `fetch_time`, `country`, `language`
- `score` (citation prominence)
- `page_category`, `page_types`
- `ratings`, `social_metrics`

**content_info:**
- `title`, `main_title`, `previous_title`
- `snippet`, `snippet_length`
- `author`, `date_published`
- `content_quality_score`
- `semantic_location`

**Sentiment:**
- `sentiment_connotations`: `anger`, `happiness`, `love`, `sadness`, `share`, `fun` (probabilities)
- `connotation_types`: `positive`, `negative`, `neutral` (probabilities)

---

### 3.2 Summary

**Endpoint:** `POST /v3/content_analysis/summary/live`

#### Key Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `keyword` | string | Target keyword (required) |
| `keyword_fields` | object | Field filters |
| `page_type` | array | Page type filters |
| `internal_list_limit` | integer | Max 20, default 1 |
| `positive_connotation_threshold` | float | 0-1, default 0.4 |
| `sentiments_connotation_threshold` | float | 0-1, default 0.4 |
| `initial_dataset_filters` | array | Advanced filters |

#### Response Fields

- `total_count`, `rank` (normalized sum)
- `top_domains[]` (domains citing keyword)
- `sentiment_connotations` (anger, happiness, love, sadness, share, fun counts)
- `connotation_types` (positive, negative, neutral counts)
- `text_categories[]`, `page_categories[]`
- `page_types`, `countries`, `languages`

---

### 3.3 Other Content Analysis Endpoints

| Endpoint | Path | Description |
|----------|------|-------------|
| Sentiment Analysis | `/v3/content_analysis/sentiment_analysis/live` | Stats by sentiment polarity |
| Rating Distribution | `/v3/content_analysis/rating_distribution/live` | Stats by content rating |
| Phrase Trends | `/v3/content_analysis/phrase_trends/live` | Citation stats by date |
| Category Trends | `/v3/content_analysis/category_trends/live` | Trends by category |

---

## 4. DOMAIN ANALYTICS API

**Base URL:** `https://api.dataforseo.com/v3/domain_analytics/`
**Mode:** Live only
**Rate Limit:** 2000 calls/min, max 30 simultaneous

**NOTE:** This API does NOT provide site audit capabilities. It focuses on:

### 4.1 Technologies API

Identifies technologies used to build websites.

| Endpoint | Description |
|----------|-------------|
| Aggregation Technologies | Technology statistics |
| Technologies Summary | Summary by technology |
| Technology Stats | Stats for a technology |
| Domains by Technology | Find domains using a technology |
| Domains by HTML Terms | Find domains by HTML patterns |
| Domain Technologies | Technologies of a specific domain |

### 4.2 Whois API

Whois data enriched with backlink stats, ranking, and traffic info.

### 4.3 Relevance for Site Audit

The Domain Analytics API is useful for:
- Detecting CMS/technology stack of a domain
- Getting Whois registration data
- Finding competitors using same technologies

It does NOT provide: page crawling, broken links, duplicate content, sitemap analysis, or robots.txt analysis. Those are all in the **On-Page API**.

---

## 5. PRICING SUMMARY

### On-Page API

| Feature | Cost per Page |
|---------|--------------|
| **Base crawl** (60+ checks, links, duplicates, speed) | $0.000125 |
| **+ Load Resources** (images, CSS, scripts, broken) | $0.000375 |
| **+ Enable JavaScript** | $0.00125 |
| **+ Custom JavaScript** | $0.00025 |
| **+ Enable Browser Rendering** (CWV) | $0.00425 |
| **+ Calculate Keyword Density** | $0.00025 |
| **+ Content Parsing** | $0.000125 |
| **Instant Pages** (live single-page) | $0.000125 (base) |
| **Page Screenshot** | $0.004 |
| **Lighthouse** (all modes) | $0.00425 |

**Cost Examples:**
- 100-page base crawl: $0.0125
- 100-page full crawl (resources + JS + rendering + keyword density): $0.55
- Single Lighthouse audit: $0.00425
- Single Instant Pages check: $0.000125 (base)

### Backlinks API

| Component | Cost |
|-----------|------|
| Per request | $0.02 |
| Per row | $0.00003 ($0.03/1000 rows) |
| **Example:** 1 request + 1000 rows | $0.05 |

### Content Analysis API

| Component | Cost |
|-----------|------|
| Per request | $0.02 |
| Per row | $0.00003 ($0.03/1000 rows) |
| **Example:** 1 request + 1000 rows | $0.05 |

### Minimum Commitment

**$100/month** (credited to account balance, usable across all APIs).
Exception: waived when using through Make.com, n8n, or Google Sheets Connector.

---

## 6. RATE LIMITS SUMMARY

| API | Calls/Minute | Max Simultaneous | Tasks/Request |
|-----|-------------|------------------|---------------|
| On-Page Task POST | 2000 | 30 | 100 |
| On-Page Instant Pages | 2000 | 30 | 20 (max 5 same domain) |
| On-Page Lighthouse | 2000 | 30 | 1 |
| On-Page Other | 2000 | 30 | 100 |
| Backlinks (all) | 2000 | 30 | -- |
| Content Analysis | 2000 | 30 | -- |
| Domain Analytics | 2000 | 30 | -- |

---

## 7. IMPLEMENTATION RECOMMENDATIONS

### For Blog/Website SEO Audit

**Recommended workflow:**

1. **Site-Level Audit** (On-Page API Task-based):
   - POST `/v3/on_page/task_post` with comprehensive settings
   - Wait for pingback or poll `/v3/on_page/tasks_ready`
   - Retrieve: Summary, Pages, Links, Duplicate Content, Duplicate Tags, Non-Indexable, Redirect Chains, Keyword Density

2. **Single Page Analysis** (On-Page API Live):
   - POST `/v3/on_page/instant_pages` for immediate per-page SEO data
   - POST `/v3/on_page/content_parsing/live` for structured content extraction
   - POST `/v3/on_page/lighthouse/live/json` for performance + accessibility

3. **Backlink Profile** (Backlinks API):
   - POST `/v3/backlinks/summary/live` for overview
   - POST `/v3/backlinks/anchors/live` for anchor text distribution
   - POST `/v3/backlinks/referring_domains/live` for referring domains

4. **Brand Monitoring** (Content Analysis API):
   - POST `/v3/content_analysis/summary/live` for brand mention overview
   - POST `/v3/content_analysis/search/live` for detailed citations

### Key Parameters for Blog Audit

```json
{
  "target": "yourblog.com",
  "max_crawl_pages": 500,
  "load_resources": true,
  "enable_javascript": true,
  "enable_browser_rendering": true,
  "enable_content_parsing": true,
  "calculate_keyword_density": true,
  "validate_micromarkup": true,
  "check_spell": true,
  "respect_sitemap": true,
  "checks_threshold": {
    "title_too_short": 30,
    "title_too_long": 60,
    "low_content_rate": 0.1,
    "high_loading_time": 3000
  },
  "pingback_url": "https://yourapp.com/api/dataforseo/callback?id=$id"
}
```

**Estimated cost for 500-page full audit:** ~$2.75

### What DataForSEO On-Page API Checks (Comprehensive List)

**Technical SEO:**
- SSL certificate validation
- HTTP/2 support
- robots.txt presence and analysis
- Sitemap presence
- www/non-www redirect
- HTTPS redirect
- Server signature
- 404 page behavior
- Directory browsing
- Content encoding (gzip/brotli)

**Page-Level SEO:**
- Title tag (length, relevance, duplicates)
- Meta description (length, relevance, duplicates)
- Meta keywords relevance
- H1 tag presence
- Image alt/title attributes
- Favicon presence
- Canonical tags (chains, broken, recursive)
- Structured data validation
- Social media tags (OG, Twitter)

**Content Quality:**
- Word count, character count
- Text-to-code ratio (content rate)
- 5 readability indices (Flesch-Kincaid, Coleman-Liau, Dale-Chall, SMOG, ARI)
- Title-to-content consistency
- Description-to-content consistency
- Keyword density (1-5 word phrases)
- Spelling errors (Hunspell)
- Lorem ipsum detection
- Duplicate content detection (SimHash)

**Performance:**
- Core Web Vitals (LCP, FID, CLS)
- Time to Interactive (TTI)
- DOM Complete
- TTFB (waiting time)
- Connection time, download time
- Page size, encoded size, transfer size
- Render-blocking resources
- Resource waterfall analysis

**URL Analysis:**
- SEO-friendly URL check (4 sub-checks)
- URL length
- Dynamic parameter detection
- URL-title keyword consistency

**Link Analysis:**
- Internal/external link counts
- Broken links detection
- Redirect chains and loops
- Orphan page detection
- Link relation conflicts
- HTTP/HTTPS mixed content
- Nofollow/dofollow analysis
- hreflang validation

**Resource Analysis:**
- Images (count, size, broken)
- Scripts (count, size, render-blocking)
- Stylesheets (count, size, render-blocking)
- Cache control analysis
