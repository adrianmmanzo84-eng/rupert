"""Caja de donaciones (R040): recorta la caja del fondo magenta (arte/fuentes/caja_donaciones.png) y la deja
a tres tamaños de pantalla (40, 52 y 64 px de alto) para que se vea con píxeles parejos en cada escenario."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
a = np.asarray(Image.open(os.path.join(RAIZ, 'arte', 'fuentes', 'caja_donaciones.png')).convert('RGB')).astype(float)
fig = np.abs(a - np.array([250, 4, 240])).sum(-1) > 150
lab, n = ndi.label(fig)
fig &= lab == (np.argmax(ndi.sum(fig, lab, range(1, n + 1))) + 1)
ys, xs = np.nonzero(fig)
rgb, f = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], fig[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
h, w = f.shape
for alto in (40, 52, 64):
    nw, nh = round(w * alto / h), alto
    al = np.asarray(Image.fromarray((f * 255).astype(np.uint8)).resize((nw, nh), Image.BOX)).astype(float) / 255
    c = np.asarray(Image.fromarray((rgb * f[..., None]).astype(np.uint8)).resize((nw, nh), Image.BOX)).astype(float)
    c = np.where(al[..., None] > 0, c / np.maximum(al[..., None], 1e-3), 0).clip(0, 255)
    im = Image.fromarray(np.dstack([c, (al > 0.5) * 255]).astype(np.uint8), 'RGBA')
    im.save(os.path.join(RAIZ, 'public', 'assets', 'objetos', f'caja_{alto}.png'))
    print(alto, im.size)
