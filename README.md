# Simrithi S: portfolio

Plain HTML, CSS and JavaScript with no build step, hosted on AWS Amplify Hosting. Fonts (Geist) and icons (Phosphor) are self-hosted.

## Creative feature: the rising flood

Tap the pulsing raindrop in the corner. Rain falls and the water climbs the page.
- A draggable gauge on the right edge lets you set the water level (arrow keys work too).
- Every project and journey card below the waterline flips to **High risk**, the same logic as Varshik, my flood-risk map.
- A story card explains why I build flood tools. Esc or "Let it drain" resets everything.
- The water layers ignore pointer events, so navigation is never blocked. Honours `prefers-reduced-motion`.

## Other interactions
- Terrain-line hero that lifts toward the pointer
- Words in the About statement light up as you read down
- Skills toolbox: pick a tool to see which projects used it
- Spotlight project cards, magnetic buttons, light and dark themes

Run locally: open `index.html`, or `python -m http.server`.
