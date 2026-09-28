"""Analyze local connected geometry without changing production assets."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT=Path(__file__).resolve().parents[1]
for slug in ['fuzhu','bifang']:
    out=ROOT/'assets/anatomy'/slug
    raw=np.load(next(out.glob('*-geometry.npz')))
    vertices=raw['vertices']; edges=raw['edges']
    mask=(vertices[:,2]>.247) if slug=='fuzhu' else ((vertices[:,2]<-.10)&(vertices[:,0]>.005)&(vertices[:,0]<.13))
    selected=np.flatnonzero(mask)
    coords=vertices[selected]
    unique,inverse=np.unique(np.round(coords,5),axis=0,return_inverse=True)
    mapping=np.full(len(vertices),-1,dtype=np.int32)
    mapping[selected]=inverse
    local=edges[mask[edges[:,0]]&mask[edges[:,1]]]
    local=mapping[local]
    parents=np.arange(len(unique),dtype=np.int32)
    def find(i):
        while parents[i]!=i:
            parents[i]=parents[parents[i]];i=parents[i]
        return i
    for a,b in local:
        a=find(a);b=find(b)
        if a!=b:parents[b]=a
    labels=np.array([find(i) for i in range(len(unique))])[inverse]
    names,counts=np.unique(labels,return_counts=True)
    order=np.argsort(-counts)
    components=[]
    for rank,i in enumerate(order[:30]):
        group=coords[labels==names[i]]
        components.append({'rank':rank,'label':int(names[i]),'count':int(counts[i]),'min':group.min(axis=0).tolist(),'max':group.max(axis=0).tolist()})
    (out/'local-components.json').write_text(json.dumps(components,indent=2))
    np.savez_compressed(out/'local-selection.npz',indices=selected,labels=labels)
    fig,axes=plt.subplots(1,3,figsize=(18,7))
    for ax,(a,b) in zip(axes,[(0,2),(1,2),(0,1)]):
        for rank,i in enumerate(order[:10]):
            group=coords[labels==names[i]][::8]
            ax.scatter(group[:,a],group[:,b],s=1,label=str(rank))
        ax.set(xlabel='XYZ'[a],ylabel='XYZ'[b],title=slug)
        ax.grid();ax.set_aspect('equal');ax.legend()
    fig.tight_layout();fig.savefig(out/'local-inspection.png',dpi=160);plt.close(fig)
    print(slug,json.dumps(components[:6]))
