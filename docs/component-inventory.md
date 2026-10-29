# Component Inventory — Recall UI Primitives

Generated from analysis of 23 React components in `apps/web/src/`. This document catalogs every repeated UI pattern and recommends a set of shared primitives to extract.

---

## 📊 Component Map

| Component | Lines | Purpose | Key Patterns Used |
|-----------|-------|---------|-------------------|
| `App.jsx` | 1412 | Root layout, routing, theme, auth gates | Topbar, Navigation, Theme Toggle, Account Menu |
| `LiveDashboard.jsx` | 1335 | Dashboard + Pattern browser (dual mode) | PatternRow, PatternMetrics, StrengthBar, RetentionMetric, DifficultyMetrics, Priority Patterns |
| `PatternOverview.jsx` | 705 | Dashboard retention + priority + coverage | Retention Tracker, Priority Pattern Cards, DifficultyBar, StrengthBar, FocusBadge |
| `PatternMetrics.jsx` | 567 | Reusable metric displays | FocusBadge, FocusLegend, StrengthBar, NextAction, RetentionMetric, DifficultyMetrics |
| `SubpatternProblems.jsx` | 574 | Expandable subpattern with problem table | Subpattern Row (details/summary), Problem Table, Sortable Headers, Pagination, PatternMenu |
| `PatternMenu.jsx` | 63 | Dropdown + Dialog for pattern editing | Dropdown Menu, Modal Dialog, Form, Select |
| `Workflows.jsx` | 1034 | Settings, Backup/Restore, Removed Recordings | Resource Hook, Pagination, Record Row, File Upload, Progress, Form |
| `OwnerDashboard.jsx` | 2455 | Admin dashboard (5 sections) | Stats Cards, Tables, Funnel, Bar Charts, Status Badges, MFA Form |
| `Onboarding.jsx` | 926 | 3-step setup flow | Stepper, Radio Cards, Form, Installation Steps |
| `AuthPages.jsx` | 1199 | Signup/Login/Recovery forms | Split Layout, Form, Validation, Cooldown |
| `Connection.jsx` | 672 | Extension connection + import progress | Stepper, Progress Bar, Status Checks |
| `Profile.jsx` | 420 | User profile + practice summary | Avatar, Definition List, Form |
| `History.jsx` | 445 | Recent solves list | History List, Pagination |
| `PatternOverview.jsx` | 705 | Dashboard overview widgets | Retention Tracker, Priority Patterns, Coverage |
| `PatternMetrics.jsx` | 567 | Metric components | FocusBadge, StrengthBar, RetentionMetric, DifficultyMetrics |
| `PatternMenu.jsx` | 514 | Pattern edit dropdown/dialog | Dropdown, Dialog, Select, Form |
| `SubpatternProblems.jsx` | 574 | Subpattern expansion + table | Details/Summary, Table, Sort, Pagination |
| `Workflows.jsx` | 1034 | Settings panels | Resource Hook, Pagination, Record Row, File Upload |
| `OwnerDashboard.jsx` | 2455 | Admin views | Stats, Tables, Funnel, Charts, MFA |
| `AccountControls.jsx` | 540 | Account deletion | Danger Button, Confirmation Form |
| `AccountMenu.jsx` | 247 | User dropdown menu | Dropdown, Avatar, Navigation |
| `ProfileForm.jsx` | 192 | Profile name editor | Form, Input |
| `SupportLink.jsx` | 225 | Support contact link | Link |
| `LazyPage.jsx` | 708 | Code-split page wrapper | Suspense, Loading |

---

## 🧱 Identified Primitive Categories

### 1. **Buttons & Actions** (Used in 20+ components)
| Variant | Current Classes | Locations |
|---------|----------------|-----------|
| Primary | `.primary-button` | Every page |
| Secondary | `.secondary-button` | Every page |
| Text/Link | `.text-button`, `.inline-link` | Forms, menus |
| Danger | `.danger-button` | Account deletion |
| Icon-only | `.theme-toggle`, `.problem-more` | Topbar, tables |
| Play/Next | `.next-action`, `.next-action-play` | Priority patterns |

**Needed Primitives:**
- `Button` — variant (primary/secondary/text/danger), size, loading, disabled, icon
- `IconButton` — aria-label, tooltip
- `LinkButton` — looks like button, navigates

---

### 2. **Form Controls** (Used in 15+ components)
| Control | Current Implementation | Locations |
|---------|------------------------|-----------|
| Text Input | `<input className="..." />` | Auth, Profile, Settings, Owner |
| Password Input | Custom show/hide toggle | Auth |
| Select | `<select className="..." />` | Goal, PatternMenu, Owner filters |
| Checkbox | `<input type="checkbox" />` + label | Capture, Owner MFA |
| Radio | `<input type="radio" />` + styled label | Onboarding (mode selection) |
| File Input | `<input type="file" />` + label | Settings (backup) |
| Textarea | `<textarea />` (implicit) | Capture notes |

**Needed Primitives:**
- `Input` — label, error, helper, required, type
- `Select` — options, placeholder, error
- `Checkbox` / `Radio` — label, description, inline/stacked
- `Toggle` — for boolean settings
- `FileUpload` — drag-drop, validation, preview
- `FormField` — wrapper with label, error, helper

---

### 3. **Data Display** (Used in 12+ components)
| Pattern | Current Classes | Locations |
|---------|----------------|-----------|
| Stat Card | `.owner-stat`, `.overview-grid article` | Owner, Dashboard |
| Metric Row | `.pattern-retention`, `.row-difficulty-metrics` | PatternMetrics, Subpattern |
| Progress Bar | `.split-priority-track`, `.pattern-retention-track`, `.row-difficulty-track` | StrengthBar, RetentionMetric, DifficultyMetrics |
| Coverage Ring | `.coverage-ring` | PatternOverview (old) |
| Difficulty Badge | `.problem-difficulty`, `.difficulty-easy/medium/hard` | Tables, PatternMenu |
| Focus Badge | `.focus-emphasis-*` | Pattern rows, Priority |
| Status Badge | `.owner-status.good/warning` | Owner, Connection |
| Avatar | `.account-avatar`, `.profile-avatar` | AccountMenu, Profile |
| Empty State | `.dashboard-message`, `.owner-empty`, `.problem-empty` | Everywhere |

**Needed Primitives:**
- `StatCard` — label, value, note, trend
- `ProgressBar` — value, max, label, variant (thin/medium/thick), segments
- `SegmentedBar` — multiple segments with tooltips (DifficultyBar)
- `Badge` — variant (focus/difficulty/status), size
- `Avatar` — name/initials, size, fallback
- `EmptyState` — icon, title, description, action
- `DefinitionList` — term/description pairs

---

### 4. **Layout & Containers** (Used in 15+ components)
| Pattern | Current Classes | Locations |
|---------|----------------|-----------|
| Card/Panel | `.workspace-panel`, `.owner-card`, `.record-row` | Workflows, Owner, History |
| Section | `.section-heading`, `.owner-section-heading` | Everywhere |
| Grid | `.pattern-dashboard-grid`, `.workspace-grid`, `.owner-two-columns` | Dashboard, Workflows, Owner |
| Row Actions | `.row-actions` | Tables, Forms, Cards |
| Pagination | `.pagination`, `.owner-pagination` | Tables, Owner |
| Dialog/Modal | `.pattern-dialog` | PatternMenu |
| Dropdown Menu | `.pattern-menu-options`, `.account-menu-panel` | PatternMenu, AccountMenu |
| Tooltip | `.coverage-tooltip` | DifficultyBar |
| Table | `.problem-table`, `.owner-table`, `.solve-history` | Subpattern, Owner, History |

**Needed Primitives:**
- `Card` — padding, border, radius, hover, elevation
- `Panel` — header, content, footer
- `Section` — heading, action, responsive
- `Grid` — columns, gap, responsive
- `Table` — columns, sort, pagination, row actions
- `Dialog` — size, focus trap, close on escape/overlay
- `Dropdown` — trigger, items, positioning, keyboard nav
- `Tooltip` — content, position, delay
- `Tabs` — (not used yet, but needed for future)

---

### 5. **Navigation & Structure** (Used in 8+ components)
| Pattern | Current Classes | Locations |
|---------|----------------|-----------|
| Topbar | `.topbar`, `.brand`, `.navigation` | App |
| Nav Link | `.nav-link`, `.nav-link.active` | App, Owner sidebar |
| Stepper | `.setup-progress`, `.connection-steps` | Onboarding, Connection |
| Breadcrumb | `.back-link` | Pattern detail |
| Skip Link | `.skip-link` | App |
| Footer | `.footer`, `.footer-links` | App, Public |

**Needed Primitives:**
- `Header` — brand, navigation, actions, responsive
- `Sidebar` — navigation, collapsible, active state
- `Stepper` — steps, current, clickable, vertical/horizontal
- `Breadcrumb` — items, separator, current
- `Footer` — links, brand, legal

---

### 6. **Feedback & Status** (Used in 10+ components)
| Pattern | Current Classes | Locations |
|---------|----------------|-----------|
| Loading | `.account-loading`, `role="status"` | Auth, Dashboard, Owner |
| Error | `.error-message`, `.account-error`, `role="alert"` | Everywhere |
| Success | `.form-message`, `.account-status` | Forms |
| Notice | `.data-note`, `.account-notice`, `.owner-note` | Everywhere |
| Progress | `<progress>`, `.connection-steps progress` | Connection, Settings |

**Needed Primitives:**
- `Alert` — variant (error/warning/success/info), dismissible
- `Toast` — temporary, auto-dismiss, action
- `LoadingState` — spinner, skeleton, message
- `InlineNotice` — variant, icon, action

---

### 7. **Specialized Domain Components** (Unique to Recall)
| Component | Purpose | Reusable? |
|-----------|---------|-----------|
| `StrengthBar` | Coral/Mustard split practice strength | ✅ Core metric |
| `RetentionMetric` | Single progress bar + label | ✅ Core metric |
| `DifficultyMetrics` | 3 difficulty progress bars | ✅ Core metric |
| `DifficultyBar` | Segmented coverage by pattern | ✅ Core metric |
| `FocusBadge` | High/Medium/Lower focus tier | ✅ Core badge |
| `FocusLegend` | Experience/Recent practice keys | ✅ Core legend |
| `NextAction` | Play chevron / disclosure arrow | ✅ Core action |
| `PatternRow` | Grid row with metrics + action | ✅ Core row |
| `PriorityPattern` | Ranked pattern card | ✅ Core card |
| `SubpatternRow` | Expandable details/summary row | ✅ Core disclosure |

---

## 🎯 Recommended Primitive Library Structure

```
apps/web/src/components/ui/
├── Button/
│   ├── Button.jsx
│   ├── IconButton.jsx
│   ├── LinkButton.jsx
│   └── index.js
├── Form/
│   ├── Input.jsx
│   ├── Select.jsx
│   ├── Checkbox.jsx
│   ├── Radio.jsx
│   ├── RadioCard.jsx          # Onboarding mode selection
│   ├── Toggle.jsx
│   ├── FileUpload.jsx
│   ├── FormField.jsx
│   └── index.js
├── DataDisplay/
│   ├── StatCard.jsx
│   ├── ProgressBar.jsx
│   ├── SegmentedBar.jsx       # DifficultyBar
│   ├── Badge.jsx
│   ├── Avatar.jsx
│   ├── EmptyState.jsx
│   ├── DefinitionList.jsx
│   └── index.js
├── Layout/
│   ├── Card.jsx
│   ├── Panel.jsx
│   ├── Section.jsx
│   ├── Grid.jsx
│   ├── Table.jsx
│   ├── Dialog.jsx
│   ├── Dropdown.jsx
│   ├── Tooltip.jsx
│   └── index.js
├── Navigation/
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   ├── Stepper.jsx
│   ├── Breadcrumb.jsx
│   ├── Footer.jsx
│   └── index.js
├── Feedback/
│   ├── Alert.jsx
│   ├── Toast.jsx
│   ├── LoadingState.jsx
│   ├── InlineNotice.jsx
│   └── index.js
└── Domain/                     # Recall-specific
    ├── StrengthBar.jsx
    ├── RetentionMetric.jsx
    ├── DifficultyMetrics.jsx
    ├── DifficultyBar.jsx
    ├── FocusBadge.jsx
    ├── FocusLegend.jsx
    ├── NextAction.jsx
    ├── PatternRow.jsx
    ├── PriorityPattern.jsx
    ├── SubpatternRow.jsx
    └── index.js
```

---

## 📋 Migration Priority

| Phase | Primitives | Components to Update | Effort |
|-------|------------|---------------------|--------|
| **1** | Button, Input, Select, Card, Badge | AuthPages, Onboarding, Profile, PatternMenu | High impact, low risk |
| **2** | ProgressBar, SegmentedBar, StatCard, Table, Dialog | LiveDashboard, PatternOverview, PatternMetrics, SubpatternProblems | Core metrics |
| **3** | Dialog, Dropdown, Tooltip, Avatar, Grid, Section | PatternMenu, AccountMenu, Workflows, OwnerDashboard | Layout consistency |
| **4** | Domain primitives (StrengthBar, etc.) | LiveDashboard, PatternOverview, PatternMetrics | Polish & deduplicate |
| **5** | Header, Sidebar, Stepper, Footer, Toast | App, Onboarding, Connection, PublicPages | Shell consistency |

---

## 🔍 Hardcoded Values to Tokenize (Per File)

### `styles.css` → tokens.css (already done)
All colors, spacing, radii, shadows, motion now in tokens.css with legacy aliases.

### Component-specific hardcoded values to migrate:
| File | Hardcoded Values | Token Category |
|------|------------------|----------------|
| `PatternMetrics.jsx` | `width: ${experienceWidth}%`, `width: ${recentWidth}%` | Handled via inline style (OK) |
| `PatternOverview.jsx` | `width: ${percent(retention.score)}%` | Inline style (OK) |
| `DifficultyBar.jsx` | `style={{ width: ${pattern.fill}% }}` | Inline style (OK) |
| `OwnerDashboard.jsx` | `style={{ height: ${...}px }}` | Inline style (OK for dynamic) |
| `PatternMenu.jsx` | `width: 44px`, `height: 44px` | `--size-touch-min` |
| `SubpatternProblems.jsx` | `width: 44px`, `height: 44px` | `--size-touch-min` |
| Various | `min-height: 44px` | `--size-touch-min` |
| Various | `border-radius: 18px` | `--radius-card` |
| Various | `border-radius: 14px` | `--radius-button` |
| Various | `border-radius: 12px` | `--radius-input` |
| Various | `gap: 12px` | `--spacing-3` |
| Various | `padding: 16px` | `--spacing-4` |

---

## ✅ Acceptance Criteria for Migration

1. **No hardcoded colors** — all use `var(--color-*)` or semantic tokens
2. **No hardcoded spacing** — all use `var(--spacing-*)` or semantic tokens
3. **No hardcoded radii** — all use `var(--radius-*)` or semantic tokens
4. **No hardcoded font sizes** — all use `var(--font-size-*)` or fluid tokens
5. **No duplicate component logic** — each pattern rendered by one primitive
6. **Stylelint passes** — custom property pattern enforced
7. **Storybook stories** — each primitive has stories for all variants/states
8. **Visual regression tests** — Chromatic or Playwright screenshots

---

## 📝 Next Steps

1. **Create `apps/web/src/components/ui/` directory structure**
2. **Extract Phase 1 primitives** (Button, Input, Select, Card, Badge)
3. **Write Storybook stories** for each
4. **Replace usages in AuthPages + Onboarding** (lowest risk)
5. **Run visual regression tests**
6. **Commit and push**
7. **Repeat for Phase 2-5**

---

*Generated: 2026-10-30 | Based on 23 React components | ~46,000 lines of JSX analyzed*