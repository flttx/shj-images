"""Coordinate plots and connected-component evidence for local anatomy edits."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
for slug in ['fuzhu', 'bifang']:
    out = ROOT / 'assets/anatomy' / slug
    data = np.load(next(out.glob('*-geometry.npz')))
    vertices = data['vertices']
    sampled = vertices[::20]
    fig, axes = plt.subplots(1, 3, figsize=(18, 7))
    for ax, (a, b) in zip(axes, [(0, 2), (1, 2), (0, 1)]):
        ax.scatter(sampled[:, a], sampled[:, b], s=.25)
        ax.set(xlabel='XYZ'[a], ylabel='XYZ'[b], title=slug)
        ax.set_aspect('equal')
        ax.grid()
    fig.tight_layout()
    fig.savefig(out / 'coordinate-inspection.png', dpi=160)
    plt.close(fig)
