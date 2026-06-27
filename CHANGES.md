# Friends Tab — Redesign Changes

Branch: `feat/better-friends`

## Summary

Full visual redesign of `components/FriendsTab/FriendsTab.tsx` to match the
design language established in the "My Major" tab (`MajorProgressView`).
All Firebase wiring, data flow, props, and callbacks are preserved exactly.

---

## Changes

### Design tokens applied consistently
- Cards use `p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu`
- Labels use `text-xs text-gray-400 dark:text-gray-500`
- Values use `text-lg font-medium` with semantic color tokens

### New: `FriendStatCard` component
Three at-a-glance stat cards at the top of the main view (Friends count,
Pending incoming, Pending outgoing), matching the `MajorStatCard` pattern
exactly, including tooltip support and `whileHover={{ y: -1 }}` motion.

### New: `SectionHeading` helper
Consistent `text-xs font-semibold uppercase tracking-wider` section labels
with icon, label, and count badge (count uses a pill matching system tokens).

### Improved empty state
When friends list is empty: dashed-border card with centered icon, heading,
description, and an "Add your first friend" CTA button with framer-motion.
Previously was a bare single-line text string.

### Improved loading skeletons
Three-zone skeleton layout:
1. Stat card row (3 placeholders matching the real cards)
2. Request panels (two columns matching real request cards)
3. Friend card column (3 friend-row shapes)

Previously only had two request skeletons and friend-row skeletons.

### Friend cards
- `whileHover={{ y: -1 }}` lift + staggered `animate` entrance (40ms per card)
- `exit` animation on removal (`y: -4, scale: 0.98`)
- Major names rendered in `text-pink-500 dark:text-pink-400` accent
- `min-w-0` + `truncate` on all text to prevent overflow

### Add Friend modal
- `autoFocus` on search input
- Pink search icon inside input (left-padded)
- Tighter sub-heading ("Search by name, email, or major")
- Result rows: `min-w-0` truncation, staggered `initial/animate` on results
- Close button styled with `hover:bg-red-500/10` feedback

### Request panels
- Incoming: green accent border hover + `FiCheck`/`FiX` buttons with
  `emerald-500/15` and `red-500/10` backgrounds
- Sent: blue accent + "Pending" sub-label, cancel button with red hover
- Both panels: `layout` + `initial`/`animate`/`exit` motion on individual rows

### Dropdowns (MoreOptions + FriendActions)
- `rounded-xl` menus with `scale: 0.97` entrance animation
- `border-t` separator between "View Profile" and "Remove Friend"
- Correct hover colors in both light/dark

### Opt-in enable prompt
- Surface tokens updated to match the rest of the design system
- "What's shared" card uses `shadow-neu` and proper dark gradient

### TypeScript
`tsc --noEmit` exits clean (no new errors introduced).
