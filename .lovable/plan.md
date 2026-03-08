

## Tag-Based Institutional Analytics

This is a great idea. Tags already exist in your system (tags, profile_tags tables), and assertions + badge_views give you the raw data. The key upgrade is segmenting all analytics by tag, so admins can answer questions like "How do students tagged 'Cohort 2025' perform vs 'Cohort 2024'?" or "Which department earns the most badges?"

### What We'll Build

**1. Tag Filter on Analytics Page**
- Dropdown at the top of the analytics page to filter all data by one or more tags
- "All Learners" default, with tag options populated from the `tags` table
- All KPI cards, charts, and tables re-compute based on selected tag(s)

**2. New KPI Cards (Tag-Aware)**
- **Acceptance Rate** — % of badge invites claimed vs sent (from `badge_invites` table, filtered by tagged users)
- **Avg Badges per Learner** — total assertions / total learners in the tag group
- **Verification Views** — total `badge_views` for learners in the tag group
- **Share Rate** — proxy metric: % of earners whose verification page has been viewed (indicates sharing behavior)

**3. New Charts**

- **Badge Acceptance Funnel** — Stacked bar: Invites Sent → Claimed → Active, per tag
- **Tag Comparison Chart** — Grouped bar comparing badge counts across multiple tags side-by-side
- **Skill Distribution Radar** — Radar/spider chart showing which badge categories each tag group earns most (uses `badge_categories` + `badge_class_categories`)
- **Engagement Over Time** — Line chart showing badge views per month, filterable by tag

**4. Insights Cards (Computed Text)**
- Auto-generated insight statements like:
  - "87% of learners tagged 'Cohort 2025' earned at least one badge"
  - "Learners with badge X have 3.2x more profile views"
  - "Top performing tag: Engineering (avg 4.2 badges/learner)"
- These are computed client-side from the fetched data, displayed as styled insight cards with icons

**5. Export**
- "Download Report" button that exports the current tag-filtered analytics as CSV (tag, learner count, badges issued, acceptance rate, views)

### Technical Approach

**No database changes needed.** All data already exists:
- `tags` + `profile_tags` → tag-to-user mapping
- `assertions` → badge issuance data
- `badge_invites` → acceptance/claim tracking
- `badge_views` → engagement/sharing proxy
- `badge_class_categories` + `badge_categories` → skill distribution

**Data flow:**
1. Fetch all tags and profile_tags
2. When a tag is selected, filter `profile_tags` to get user IDs in that tag
3. Filter assertions, invites, and views by those user IDs
4. Compute metrics client-side and render charts

**File changes:**
- `src/pages/admin/AnalyticsPage.tsx` — Complete rewrite with tag filter, new KPIs, new charts, insights cards, and export button

**Dependencies:** No new packages. Uses existing `recharts` (BarChart, PieChart, RadarChart, LineChart) and UI components.

### UI Layout

```text
┌─────────────────────────────────────────────┐
│ Analytics          [Tag Filter ▼] [Export]   │
├─────────────────────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐    │
│ │Issued │ │Accept%│ │Avg/Lnr│ │Views  │    │
│ └───────┘ └───────┘ └───────┘ └───────┘    │
├──────────────────┬──────────────────────────┤
│ Issuance Trend   │ Acceptance Funnel        │
│ (line chart)     │ (stacked bar)            │
├──────────────────┴──────────────────────────┤
│ 💡 Insights                                 │
│ "87% of Cohort 2025 earned a badge..."      │
├──────────────────┬──────────────────────────┤
│ Skill Radar      │ Tag Comparison           │
├──────────────────┴──────────────────────────┤
│ Badge Breakdown Table    │ Recent Activity   │
└─────────────────────────────────────────────┘
```

