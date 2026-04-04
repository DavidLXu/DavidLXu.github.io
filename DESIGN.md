# DESIGN.md — Lixin Xu Academic Portfolio

## Visual Theme & Atmosphere

Clean, modern academic portfolio. Confident whitespace, teal accent color, bilingual (EN/ZH). Emphasis on publication cards with embedded media. Feels professional but approachable — not corporate.

## Color Palette & Roles

### Light Mode
| Token | Value | Role |
|-------|-------|------|
| Background | `#fafafa` | Page background (near-white) |
| Background Alt | `#f3f6f7` | Alternating sections, related area |
| Footer BG | `#f2f3f3` | Footer background |
| Text | `#494e52` (dark-gray) | Primary body text |
| Text Light | `#bdc1c4` | Secondary text, captions |
| Primary / Brand | `#2f7f93` | Teal accent, buttons, links |
| Link | `#52adc8` | Inline links |
| Link Hover | `#234f5e` | Link hover state |
| Border | `#eae9e9` (lighter-gray) | Subtle borders, dividers |
| Code BG | `#fafafa` | Inline code background |
| Danger | `#ee5f5b` | Error states |
| Success | `#62c462` | Success states |
| Warning | `#f89406` | Warning states |

### Dark Mode
| Token | Value | Role |
|-------|-------|------|
| Background | `#161616` | Page background (near-black) |
| Background Alt | `#1c1c1c` | Alternating sections |
| Surface Elevated | `#2a2a2a` | Cards, elevated surfaces |
| Text | `#f0f0f0` | Primary body text (near-white) |
| Text Light | `#a0a0a0` | Secondary text |
| Primary / Brand | `#0ea1c5` | Teal accent (brighter for contrast) |
| Link | `#0ea1c5` | Inline links |
| Border | `rgba(255,255,255,0.08)` | Translucent borders |
| Code BG | `#1e1e1e` | Inline code background |

## Typography Rules

| Role | Font | Size | Weight | Letter-spacing |
|------|------|------|--------|----------------|
| h1 / Page Title | System sans-serif | 1.563em | Bold | -0.03em |
| h2 / Section | System sans-serif | 1.25em | Bold | -0.02em |
| h3 / Subsection | System sans-serif | 1em | Bold | -0.015em |
| Body | System sans-serif | 1em (16px) | Normal | normal |
| Small / Meta | System sans-serif | 0.8em | Normal | normal |
| Code | Monaco, Consolas, monospace | 0.8em | Normal | normal |
| Hero Title | System sans-serif | 2.2rem | 800 | -0.04em |

Font stack: `-apple-system, "San Francisco", "Roboto", "Segoe UI", "Helvetica Neue", Arial, sans-serif`

## Component Styles

### Buttons (.btn)
- Padding: `0.5em 1em`
- Border-radius: `4px`
- Background: `var(--global-base-color)` (teal)
- Text: `#fff`, bold
- Hover: darkened 20%

### Publication Pill Badges
- Padding: `0.12rem 0.5rem`
- Border-radius: `999px`
- Background: tinted brand color (e.g., `#e8eefc` for Website, `#f4f1ff` for arXiv)
- Font-size: `0.76rem` / `0.82rem`

### Cards (Publication / Project)
- Border: `1px solid #dde3ea`
- Border-radius: `12px`
- Padding: `0.9rem 1rem`
- Shadow: `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)`
- Hover shadow: `0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)`

### Masthead
- Fixed position, frosted glass effect
- Background: `var(--global-bg-color-translucent)` (85% opacity)
- Backdrop-filter: `blur(12px) saturate(180%)`
- Bottom border: 1px at 60% opacity

## Layout Principles

- 12-column Susy grid
- Max content width: 1280px (`$x-large`)
- Sidebar fixed at min-width 1024px
- Base spacing unit: 1em (~16px)
- Section spacing: 2em between major sections

## Depth & Elevation

| Level | Shadow (Light) | Shadow (Dark) |
|-------|---------------|---------------|
| Base | none | none |
| Card | `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)` | `0 1px 3px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.18)` |
| Hover | `0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.12)` | luminance stacking |

Dark mode uses luminance stacking (progressively lighter surfaces) and translucent white borders instead of shadows.

## Responsive Breakpoints

| Name | Width |
|------|-------|
| Small | 600px |
| Medium | 768px |
| Medium-wide | 900px |
| Large | 925px |
| X-Large | 1280px |

## Do's and Don'ts

- DO use teal (`#2f7f93` / `#0ea1c5`) as the single accent color
- DO use near-black/near-white, never pure `#000` or `#fff` for backgrounds
- DO use multi-layer shadows, never single harsh shadows
- DO use negative letter-spacing on headings (-0.02em to -0.04em)
- DO support both English and Chinese via `data-lang` divs
- DON'T use colors other than the teal accent for primary actions
- DON'T use flat, uniform backgrounds — alternate with `--global-section-alt-bg`
- DON'T use opaque masthead — always use frosted glass effect
