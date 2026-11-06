"""Build assets/voice/manifest.json from the audio files in assets/voice.

Name each file after its line id (see assets/voice/scripts.json), for example
intro.mp3, varshik.wav, tour0.webm. A file called <id>.clone.webm is an AI clone
of my voice (made by make-cloned-voice.py); a real recording <id>.webm always
wins over a clone. Run:  python make-voice-manifest.py
"""
import json, os
folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "voice")
ids = {s["id"] for s in json.load(open(os.path.join(folder, "scripts.json"), encoding="utf-8"))}
audio = (".mp3", ".wav", ".webm", ".ogg", ".m4a", ".aac")
real, clone = {}, {}
for f in sorted(os.listdir(folder)):
    name, ext = os.path.splitext(f)
    if ext.lower() not in audio: continue
    if name.endswith(".clone") and name[:-6] in ids: clone[name[:-6]] = f
    elif name in ids: real[name] = f
manifest = {**clone, **real}
json.dump(manifest, open(os.path.join(folder, "manifest.json"), "w"), indent=1)
print("Real recordings: %d, AI-clone lines: %d, still the computer voice: %d" % (len(real), len(set(clone) - set(real)), len(ids - set(manifest))))
