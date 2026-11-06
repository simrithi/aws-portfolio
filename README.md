# Simrithi S: portfolio

Plain HTML, CSS and JavaScript with no build step, hosted on AWS Amplify Hosting. Fonts (EB Garamond, Figtree, Geist Mono) and icons (Phosphor) are self-hosted.

## Creative feature: a 3D world you talk to

- **The whole site is a 3D world.** A Three.js scene (terrain, orbit rings, a gallery ring of my photos and projects, a skills sphere, a robot, a CanSat, a journey helix and a globe pinned on Chennai). The camera flies through it as you scroll and the sections float over it. Click a card in the ring and it opens as a 3D book; click a floating skill to see where I used it. Without WebGL or with reduced motion the normal page is shown.


- **Voice assistant.** Tap the mic (or hold the V key) and ask anything: "What is your CGPA?", "Tell me about Varshik", "What are your cloud skills?", "Tell me about the satellite", "Are you open to internships?". It answers out loud from my resumes and scrolls you there. Say "give me a tour" for a narrated walk through the whole site, plus "repeat", "slower", "change voice", "keep listening" (hands-free) and "stop". The Guide panel keeps a conversation log with follow-up chips and speed, voice and listening controls. No microphone? Type the same questions. (Voice needs Chrome or Edge.)
- **3D ring of my world.** A draggable 3D carousel of 15 cards: AWS talks, classroom sessions, and every project and system I built. Hover pulls a card closer, press pushes it back, click and the card flies to the centre and opens like a 3D book: the story on one page, the architecture, stack and links ("Under the hood") on the other. The book tilts with your cursor and presses down when you click. Buttons read both aloud.
- **Writing.** My AWS Builder Center article on Varshik, linked to my profile.
- **Watch me work.** Short clips of my sessions plus the Open Source Connect Global community stream.
- **Sound and water.** Every click makes a soft synthesized sound and sends water ripples across the page. The speaker button mutes everything.

## Recording my own voice
Open `http://localhost:8000/record-voice.html`, choose the `assets/voice` folder, and press "Start the 10 essentials" for a five-minute teleprompter (Space to record and stop, Enter for the next line), or record all 42 lines. Audio made elsewhere also works: name each file after its line id (see `assets/voice/scripts.json`), drop it in `assets/voice` and run `python make-voice-manifest.py`. The assistant plays my recording when one exists and falls back to the computer voice for anything not recorded. Recorded answers show a "my voice" tag in the conversation log.

## Other interactions
- Count-up numbers, scroll progress bar and section dots
- Press-down, spring-lagged cards that follow the cursor like water (with ripples)
- Each project gets its own full spotlight panel (own colour, glow that follows the cursor, stacked sticky scroll)
- Scroll-driven Journey with a rolling counter and a filling timeline
- Interactive skills: pick a tool, see which projects used it
- Wispr Flow-inspired layout: butter paper, stacked panels, serif italics, lilac

All sound is generated in the browser with WebAudio (no audio files). Honours `prefers-reduced-motion`.

Run locally: `python -m http.server`, then open http://localhost:8000 (icons need a server, not file://).
