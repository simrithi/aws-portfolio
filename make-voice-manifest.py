"""Build assets/voice/manifest.json from the audio files in assets/voice.

Name each file after its line id (see assets/voice/scripts.json), for example
intro.mp3, varshik.wav, tour0.webm. Works with files recorded anywhere,
including voice recordings exported from a phone or a voice-cloning service
you have your own account with.

Run:  python make-voice-manifest.py
"""
import json, os
folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "voice")
ids = {s["id"] for s in json.load(open(os.path.join(folder, "scripts.json"), encoding="utf-8"))}
audio = (".mp3", ".wav", ".webm", ".ogg", ".m4a", ".aac")
manifest = {}
for f in sorted(os.listdir(folder)):
    name, ext = os.path.splitext(f)
    if ext.lower() in audio and name in ids:
        manifest[name] = f
json.dump(manifest, open(os.path.join(folder, "manifest.json"), "w"), indent=1)
missing = sorted(ids - set(manifest))
print("Added %d recordings. Still using the computer voice for %d lines." % (len(manifest), len(missing)))
