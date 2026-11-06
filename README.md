# Simrithi S: portfolio

Plain HTML, CSS and JavaScript with no build step, hosted on AWS Amplify Hosting. Fonts (EB Garamond, Figtree, Geist Mono) and icons (Phosphor) are self-hosted.

## Creative feature: talk to it, spin it, hear it

- **Voice portfolio.** Tap the mic and say "projects", "skills", "journey", "contact", "spin the ring", "Varshik", "mute" and more. A live waveform follows your voice, the page scrolls there and answers back. No microphone? Type the same commands in the box. (Voice needs Chrome or Edge.)
- **3D ring of my world.** A draggable 3D carousel of real photos from my AWS talks, classroom sessions and the PipeSense robot. Hover pulls a card closer, press pushes it back, click opens its story.
- **Sound and water.** Every click makes a soft synthesized sound and sends water ripples across the page. The speaker button mutes everything.

## Other interactions
- Count-up numbers, scroll progress bar and section dots
- Press-down, spring-lagged cards that follow the cursor like water (with ripples)
- Each project gets its own full spotlight panel (own colour, glow that follows the cursor, stacked sticky scroll)
- Scroll-driven Journey with a rolling counter and a filling timeline
- Interactive skills: pick a tool, see which projects used it
- Wispr Flow-inspired layout: butter paper, stacked panels, serif italics, lilac

All sound is generated in the browser with WebAudio (no audio files). Honours `prefers-reduced-motion`.

Run locally: `python -m http.server`, then open http://localhost:8000 (icons need a server, not file://).
