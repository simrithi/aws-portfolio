"""Generate spoken answers in my own voice, cloned from my own speaking videos.

Uses the open XTTS v2 model (Coqui, non-commercial license) running locally.
Reference audio is NOT stored in this repo: pass the paths of short clean clips
of me speaking.

    python make-cloned-voice.py --ref clip1.wav clip2.wav            # the 10 essentials
    python make-cloned-voice.py --ref clip1.wav clip2.wav --all      # all 42 lines

Output goes to assets/voice/<id>.clone.webm. A real recording made with
record-voice.html (assets/voice/<id>.webm) always wins over a clone. Run
python make-voice-manifest.py afterwards to refresh manifest.json.
"""
import argparse, json, os, subprocess, sys, time

os.environ.setdefault("COQUI_TOS_AGREED", "1")  # non-commercial CPML license, accepted by the owner of the voice

ap = argparse.ArgumentParser()
ap.add_argument("--ref", nargs="+", required=True, help="clean speech clips of me (wav)")
ap.add_argument("--all", action="store_true", help="generate all lines, not just the essentials")
ap.add_argument("--only", nargs="*", help="generate only these line ids")
ap.add_argument("--ffmpeg", default=None, help="path to ffmpeg (defaults to imageio-ffmpeg's)")
a = ap.parse_args()

here = os.path.dirname(os.path.abspath(__file__))
folder = os.path.join(here, "assets", "voice")
scripts = json.load(open(os.path.join(folder, "scripts.json"), encoding="utf-8"))
if a.only: scripts = [s for s in scripts if s["id"] in a.only]
elif not a.all: scripts = [s for s in scripts if s.get("essential")]

ffmpeg = a.ffmpeg
if not ffmpeg:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

import torch
from TTS.api import TTS
torch.set_num_threads(max(1, (os.cpu_count() or 4)))
print("Loading the voice model (first run downloads about 2 GB)...")
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

tmp = os.path.join(folder, "_tmp")
os.makedirs(tmp, exist_ok=True)
for i, s in enumerate(scripts, 1):
    out = os.path.join(folder, s["id"] + ".clone.webm")
    if os.path.exists(out):
        print("[%d/%d] %s already done" % (i, len(scripts), s["id"])); continue
    t0 = time.time()
    wav = os.path.join(tmp, s["id"] + ".wav")
    tts.tts_to_file(text=s["text"], speaker_wav=a.ref, language="en", file_path=wav)
    subprocess.run([ffmpeg, "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-c:a", "libopus", "-b:a", "40k", out], check=True)
    os.remove(wav)
    print("[%d/%d] %s done in %.0fs" % (i, len(scripts), s["id"], time.time() - t0))
try: os.rmdir(tmp)
except OSError: pass
print("Done. Now run: python make-voice-manifest.py")
