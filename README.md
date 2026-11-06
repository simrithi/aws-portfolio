# Simrithi S: Cloud and Backend Portfolio

> A portfolio you can fly through and talk to. Built for the **AWS Student Builder Challenge: Build Your Tech Superpower**.

**Live site:** https://main.dzqbfo6xieab6.amplifyapp.com
**Repo:** https://github.com/simrithi/aws-portfolio

I'm a cloud and backend focused CSE student in Chennai. I build on AWS and ship distributed systems. This site is my About, Skills and Projects in one place, and it is the project itself: a 3D world with a voice assistant.

## The creative feature: a 3D world you talk to

**Hint on the page:** the hero says "Talk to my portfolio". Tap the mic, or press `V`.

1. **Scroll flythrough.** The whole site is a Three.js scene. As you scroll, the camera flies through terrain, a gallery ring of my photos and projects, a floating skills sphere, a PipeSense robot, a CanSat satellite, a journey helix and a globe pinned on Chennai. Each section floats over its own station. Drag the gallery ring to spin it.
2. **3D story book.** Click any card and it flies to the centre and opens like a book: the story on one page, the architecture, stack and links ("Under the hood") on the other.
3. **Voice assistant.** Ask out loud: "What is your CGPA?", "Tell me about Varshik", "What are your cloud skills?", "Tell me about the satellite", "Are you open to internships?". It answers and scrolls you to the right place. Say "give me a tour" for a narrated walk through the site. Typing works too.
4. **Sound and water.** Clicks make soft synthesized sounds and send ripples across the page. The speaker button mutes it.

It degrades gracefully. Without WebGL, or with `prefers-reduced-motion`, you get the normal page. Without a microphone, you can type your questions. Voice needs Chrome or Edge.

### About the voice
Some answers play as an **AI clone of my voice**, made locally from my own speaking videos with the open XTTS v2 model (non-commercial licence). They are labelled that way in the conversation log. A real recording (`record-voice.html`) always overrides a clone, and any line without audio falls back to the browser's computer voice.

## Sections
| Section | What's in it |
|---|---|
| About | Me, the numbers (CGPA 9.10, 300+ community, 10+ hackathons, 1st at Datathon'26) |
| Moments and Watch | Photos from AWS talks, classroom sessions, the robot and CanSat, plus videos |
| Writing | My AWS Builder Center article on Varshik |
| Skills | An interactive toolbox: pick a tool, see which projects used it |
| Projects | Varshik, CareerLens (live), FlashSale, PipeSense, plus LedgerLite, Surge and RaftKV |
| Journey | AWS Campus Leader, CanSat to the launch round, Open Source Connect Global, AOSSIE, Novac (cloud and backend), Twin Cities Tamil Association |
| Contact | Email, LinkedIn, GitHub, AWS Builder Center |

## AWS services used
- **AWS Amplify Hosting** serves this site (static files, HTTPS, CDN).
- Projects shown on the site use more AWS: Lambda, API Gateway, DynamoDB, S3, SNS, SQS, Step Functions, SageMaker, Bedrock and CloudWatch. See each project's spotlight.

## How it's built
- **No build step.** Plain HTML, CSS and JavaScript. `amplify.yml` just publishes the folder.
- `index.html`: all content and structure
- `styles.css`: layout, Wispr Flow-inspired theme (butter paper, forest green, lilac), the book and the voice panel
- `app.js`: sounds, ripples, spring-physics cards, count-ups, the 3D book, the voice assistant
- `world.js`: the Three.js scene and scroll camera (Three.js r128 is vendored in `assets/vendor`)
- `record-voice.html`, `make-cloned-voice.py`, `make-voice-manifest.py`: voice tooling
- Fonts (EB Garamond, Figtree, Geist Mono) and Phosphor icons are self-hosted

Tech: Three.js, CSS 3D, WebAudio, Web Speech API, IntersectionObserver.

## Run locally
```
python -m http.server 8000
```
Open http://localhost:8000 (a server is needed, not `file://`).

## Deploy
Amplify Hosting, manual deploy of this folder:
```
aws amplify create-app --name simrithi-portfolio
aws amplify create-branch --app-id <id> --branch-name main
aws amplify create-deployment --app-id <id> --branch-name main
# upload the zip to the returned URL, then:
aws amplify start-deployment --app-id <id> --branch-name main --job-id <jobId>
```

## What I learned
- Progressive enhancement matters most with heavy 3D: the page works first, WebGL is a bonus.
- Browser speech APIs differ a lot between browsers, so every voice path needs a typed fallback.
- Be honest in the UI about what is a real recording and what is an AI clone.
- Keep the bundle light: self-hosted fonts and icons, compressed media, no framework.

## Credits and licences
Photos, videos and text are mine. All rights reserved unless you ask. Voice cloning uses Coqui XTTS v2 under its non-commercial licence.
