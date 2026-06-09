# Modern Icons — Navbar + Landing Page

## Problem

Existing icons feel dated:

- **Navbar** (rendered by `src/theme/NavbarItem/CustomDocSidebarNavbarItem.tsx`): file-with-bullets, 2×2 grid, play-in-circle, open book. Weak metaphors (grid for "Guides"), generic shapes.
- **Landing page** (`src/components/HomepageFeatures/index.tsx`): 6 emojis (🚀💡📖🎓📚👥). Render inconsistently across OSes; visually noisy.

## Scope

Replace SVG path bodies of 4 navbar icons + swap landing-page emojis for SVG icons sitting in a tinted square tile. No new dependencies, no API changes, no build config changes.

## Icon set (Lucide-style stroked, 24×24, `currentColor`, stroke-width 2)

### Navbar (existing files, body replaced)

| File | Old metaphor | New (Lucide name) |
|---|---|---|
| `src/components/Icons/DocsIcon.tsx` | file w/ bullets | `FileText` (cleaner path) |
| `src/components/Icons/GuidesIcon.tsx` | 2×2 grid | `Compass` |
| `src/components/Icons/TutorialsIcon.tsx` | play circle | `GraduationCap` |
| `src/components/Icons/ReferenceIcon.tsx` | open book | `Library` (stacked books) |

### Landing page (new files + reuse)

| Section | Icon (Lucide) | File |
|---|---|---|
| Getting Started | `Rocket` | `RocketIcon.tsx` (new) |
| Concepts | `Lightbulb` | `LightbulbIcon.tsx` (new) |
| Guides | `Compass` | reuse new `GuidesIcon` |
| Tutorials | `GraduationCap` | reuse new `TutorialsIcon` |
| Reference | `Library` | reuse new `ReferenceIcon` |
| Community | `Users` | `UsersIcon.tsx` (new) |

Export all from `src/components/Icons/index.tsx`.

## Component changes

### `HomepageFeatures/index.tsx`
- Replace `emoji: string` with `Icon: ComponentType<IconProps>`.
- Render `<Icon width={32} height={32} />` inside the tile div.

### `HomepageFeatures/styles.module.css`
- Rename `.docSectionEmoji` → `.docSectionIcon`.
- Style: 56px rounded-square tile, `background: rgba(var(--ifm-color-primary-rgb), 0.1)`, icon stroke = `var(--ifm-color-primary)`.
- Hover: tile bg 18%, icon stays primary.
- Falls back gracefully in dark mode via existing CSS vars.

### Navbar
- No file structure change. The 4 icon files keep their exported component name + `IconProps` signature. Only path geometry changes.
- `CustomDocSidebarNavbarItem.tsx` untouched.

## Out of scope

- Sidebar item icons.
- Footer / mobile menu icons.
- Color/theming tokens.
- Adding `lucide-react` as a dependency.

## Verification

- `npm run typecheck` clean.
- `npm start`, eyeball navbar (light + dark), eyeball landing cards, hover state, mobile width `<996px`.
