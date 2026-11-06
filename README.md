# Simrithi S: portfolio

Plain HTML, CSS and JavaScript with no build step, hosted on AWS Amplify Hosting. Fonts (Geist) and icons (Phosphor) are self-hosted.

## Creative feature: Superpower cards

A foil pack sits in the hero (and a floating "Open a pack" button follows you down the page).
- Tear it open to get 3 holographic trading cards built from my real achievements. Click to flip, move the pointer to tilt and shine them.
- Collect all 8 to unlock a hidden Legendary card with the story behind why I build.
- Progress is saved in your browser. Esc closes the deck, "Start over" resets it.
- It is a closeable overlay, so it never blocks navigation. Honours `prefers-reduced-motion`.

## Other interactions
- Terrain-line hero that lifts toward the pointer
- About statement that lights up word by word as you scroll
- Skills toolbox: pick a tool to see which projects used it
- Varshik diagram switcher, spotlight project cards, magnetic buttons, light and dark themes

Run locally: `python -m http.server`, then open http://localhost:8000 (icons need a server, not file://).
