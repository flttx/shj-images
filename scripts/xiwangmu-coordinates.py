"""Coordinate evidence for the original head; no geometry modification."""
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

out = Path(__file__).resolve().parents[1] / 'assets/anatomy/xiwangmu'
vertices = np.load(out / 'original-geometry.npz')['vertices']
head = vertices[vertices[:, 2] > .24][::4]
fig, axes = plt.subplots(1, 3, figsize=(16, 6))
for ax, (a, b) in zip(axes, [(0, 2), (1, 2), (0, 1)]):
    ax.scatter(head[:, a], head[:, b], s=.3)
    ax.set(xlabel='XYZ'[a], ylabel='XYZ'[b])
    ax.set_aspect('equal')
    ax.grid()
fig.tight_layout()
fig.savefig(out / 'head-coordinates.png', dpi=150)
