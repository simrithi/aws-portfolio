# Simrithi S: portfolio

Plain HTML, CSS and JavaScript with no build step, hosted on AWS Amplify Hosting. Fonts (Pixelify Sans, Figtree, Geist Mono) and icons (Phosphor) are self-hosted.

## Creative feature: Loot chest of superpower cards

A pixel-art loot chest sits in the hero (and a floating "Loot chest" button follows you down the page).
- Open it to get 3 holographic cards built from my real achievements. Click to flip, move the pointer to tilt and shine them. Epic and Legendary cards carry an enchantment glint.
- Every new card pops a Minecraft-style "Advancement Made!" toast.
- Collect all 8 to unlock a hidden Legendary card ("Challenge Complete!") with the story behind why I build.
- Progress is saved in your browser. Esc closes the deck, "Start over" resets it.
- It is a closeable overlay, so it never blocks navigation. Honours `prefers-reduced-motion`.

## Other interactions
- Terrain-line hero that lifts toward the pointer
- About statement that lights up word by word as you scroll
- Skills toolbox: pick a tool to see which projects used it
- Varshik diagram switcher, spotlight project cards, magnetic buttons, a Wispr Flow-inspired layout (butter paper, stacked panels, lilac) mixed with Minecraft (pixel type, grass-and-dirt panel edges, inventory-slot skills, enchanted item tooltips)

Run locally: `python -m http.server`, then open http://localhost:8000 (icons need a server, not file://).
