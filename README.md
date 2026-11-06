# Simrithi S: portfolio

Plain HTML, CSS and JavaScript with no build step, hosted on AWS Amplify Hosting. Fonts (EB Garamond, Figtree, Geist Mono) and icons (Phosphor) are self-hosted.

## Creative feature: the loot chest of superpower cards

A tiny pixel-art chest mascot sits in the hero (and a floating "Loot chest" button follows you down the page).
- Open it to get 3 collectible cards built from my real achievements. Cards and the chest move like water: spring-lagged wobble that follows the cursor, plus ripples.
- Each new card pops a "New card unlocked!" toast. Epic and Legendary cards carry an enchantment glint.
- Collect all 8 to unlock a hidden Legendary card with the story behind why I build.
- Progress is saved in your browser. Esc closes the deck, "Start over" resets it.
- It is a closeable overlay, so it never blocks navigation. Honours `prefers-reduced-motion`.

## Other interactions
- Each project gets its own full spotlight panel (own colour, glow that follows the cursor, stacked sticky scroll)
- Scroll-driven Journey: a counter, a filling timeline line and the active role change as you scroll
- Drag-to-scroll achievements, word-by-word About statement, interactive skills (pick a tool, see where it was used)
- Cute x classic look: Wispr Flow-inspired butter paper, serif italics, lilac, pastel blobs and sparkles

Run locally: `python -m http.server`, then open http://localhost:8000 (icons need a server, not file://).
