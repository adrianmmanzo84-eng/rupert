"""Colores del auto del taller (R033): la carrocería amarilla de motor.png se repinta en otros tonos.
Solo se mueven los píxeles de chapa (amarillo saturado); el motor, los cromos y las gomas quedan igual."""
import colorsys
import os
import numpy as np
from PIL import Image

M = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'minijuegos') + '/'
base = Image.open(M + 'motor.png').convert('RGBA')
a = np.asarray(base).astype(float) / 255
h, s, v = np.vectorize(colorsys.rgb_to_hsv)(a[..., 0], a[..., 1], a[..., 2])
# Chapa: tonos naranja-amarillo saturados, pero solo en la carrocería (capot y guardabarros).
# El motor tiene los mismos tonos (bronce, óxido), así que se excluye su recuadro y el paragolpes.
yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
bahia = ((xx >= 42) & (xx <= 258) & (yy >= 62) & (yy <= 150)) | ((xx >= 60) & (xx <= 240) & (yy > 150) & (yy <= 184))
paragolpes = (yy >= 192) & (xx >= 52) & (xx <= 248)
tono = (a[..., 3] > 0) & (h > 0.04) & (h < 0.18) & (s > 0.4) & (v > 0.3)
chapa = tono & ~(bahia | paragolpes)
# (nombre, tono destino en 0..1, factor de saturación, factor de brillo)
COLORES = [('amarillo', None, 1, 1), ('rojo', 0.0, 1.0, 0.95), ('azul', 0.59, 0.95, 0.95),
           ('verde', 0.36, 0.9, 0.9), ('violeta', 0.78, 0.8, 0.9), ('blanco', 0.1, 0.12, 1.12)]
for i, (nombre, tono, fs, fv) in enumerate(COLORES):
    r, g, b = a[..., 0].copy(), a[..., 1].copy(), a[..., 2].copy()
    if tono is not None:
        nh = np.full_like(h, tono)
        ns = np.clip(s * fs, 0, 1)
        nv = np.clip(v * fv, 0, 1)
        rr, gg, bb = np.vectorize(colorsys.hsv_to_rgb)(nh, ns, nv)
        r, g, b = np.where(chapa, rr, r), np.where(chapa, gg, g), np.where(chapa, bb, b)
    out = np.stack([r, g, b, a[..., 3]], -1)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA').save(M + f'motor_{i}.png')
    print(nombre)
