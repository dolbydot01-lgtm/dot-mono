# Procedural light "explainer" background music: marimba arps + warm pad + soft bass + shaker/kick.
import numpy as np, json, subprocess, sys
SR = 44100
total = json.load(open("timeline.json"))["total"]
BPM = 96.0
beat = 60.0 / BPM
bar = beat * 4
N = int(total * SR) + SR
out_L = np.zeros(N); out_R = np.zeros(N)
rng = np.random.default_rng(7)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    out_L[i:i + len(sig)] += sig * np.sqrt((1 - pan) / 2)
    out_R[i:i + len(sig)] += sig * np.sqrt((1 + pan) / 2)

def marimba(m, dur=0.9):
    t = np.arange(int(dur * SR)) / SR
    f = hz(m)
    s = np.sin(2*np.pi*f*t) * np.exp(-t*5.5) + 0.35*np.sin(2*np.pi*f*3.98*t) * np.exp(-t*16) + 0.12*np.sin(2*np.pi*f*9.2*t)*np.exp(-t*40)
    s[:40] *= np.linspace(0, 1, 40)
    return s

def pad(ms, dur):
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for m in ms:
        f = hz(m)
        for det in (-0.12, 0.12):
            ff = f * 2 ** (det / 12)
            s += np.sin(2*np.pi*ff*t) + 0.18*np.sin(2*np.pi*2*ff*t)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.6)
    return s * env / (len(ms) * 2)

def bass(m, dur):
    t = np.arange(int(dur * SR)) / SR
    f = hz(m)
    s = np.sin(2*np.pi*f*t) + 0.25*np.sin(2*np.pi*2*f*t)
    return s * np.exp(-t*2.2) * np.minimum(1, t/0.01)

def kick():
    t = np.arange(int(0.25 * SR)) / SR
    f = 50 + 70*np.exp(-t*30)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*14)

def shaker():
    n = int(0.06 * SR)
    s = rng.standard_normal(n)
    s = np.diff(np.concatenate([[0], s]))  # brighten
    return s * np.exp(-np.arange(n)/SR*70) * 0.5

# F major: F  C/E  Dm  Bb  |  F  Am  Bb  C
prog = [(53, [65, 69, 72]), (52, [64, 67, 72]), (50, [62, 65, 69]), (46, [62, 65, 70]),
        (53, [65, 69, 72]), (45, [64, 69, 72]), (46, [62, 65, 70]), (48, [64, 67, 70])]
penta = [65, 67, 69, 72, 74, 77, 79, 81]
nbars = int(total / bar) + 2
K = kick(); SH = shaker()
for b in range(nbars):
    t0 = b * bar
    root, chord = prog[b % 8]
    section = (b // 8) % 4           # A B A' C
    add(pad(chord, bar + 0.3), t0, 0.0, 0.16)
    add(bass(root - 12 + 12, bar*0.48), t0, 0.0, 0.22)
    add(bass(root - 12 + 12, bar*0.48), t0 + 2*beat, 0.0, 0.16)
    # arpeggio (8ths)
    arp = [chord[0]+12, chord[1]+12, chord[2]+12, chord[1]+12]
    for k in range(8):
        if section == 3 and k % 2: continue
        m = arp[k % 4] if k < 4 else arp[(k+1) % 4]
        add(marimba(m), t0 + k*beat/2, -0.35 if k % 2 else 0.35, 0.10 if k % 2 else 0.13)
    # melody: sparse pentatonic phrases in sections B and C
    if section in (1, 3):
        pr = np.random.default_rng(b // 2)
        for k in (0, 3, 4, 6):
            if pr.random() < 0.75:
                choices = [p for p in penta if (p % 12) in [(c % 12) for c in chord] + [7, 2]]
                m = int(pr.choice(choices))
                add(marimba(m + 12, 1.2), t0 + k*beat/2, 0.1, 0.09)
    # percussion (sit out first 2 bars and every 4th phrase's last bar)
    if b >= 2 and not (b % 16 == 15):
        for k in (0, 2):
            add(K, t0 + k*beat, 0, 0.30)
        for k in range(8):
            add(SH, t0 + k*beat/2 + (0.012 if k % 2 else 0), 0.4, 0.05 if k % 2 else 0.08)

# simple stereo echo for space
d = int(beat * 0.75 * SR)
for src, dst in ((out_L, out_R), (out_R, out_L)):
    pass
eL = out_L.copy(); eR = out_R.copy()
eL[d:] += 0.28 * out_R[:-d]; eR[d:] += 0.28 * out_L[:-d]
mix = np.stack([eL, eR], 1)[: int(total * SR)]
# fades
fi = int(1.5 * SR); fo = int(4 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix /= np.abs(mix).max() * 1.12
pcm = (mix * 32767).astype(np.int16)
import wave
with wave.open("music.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("music", total)
