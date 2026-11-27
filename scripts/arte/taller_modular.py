"""Taller modular (R034): a partir del vano y las piezas del autor (arte/fuentes/motor_modular/) genera
las imágenes del minijuego «Reparar el auto» al tamaño exacto con que se muestran (escala 1 en pantalla):
- taller_base_0..5: el vano con la chapa repintada (amarillo original, rojo, azul, verde, violeta, blanco).
- taller_<pieza>_sano / _roto: cada pieza al mismo tamaño y posición relativa que en `montaje.json`.
- taller_rep_<pieza>: icono de repuesto para la bandeja (cabe en 52 × 22 px de mundo)."""
import colorsys
import json
import os
import numpy as np
from PIL import Image

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
FUENTE = os.path.join(RAIZ, 'arte', 'fuentes', 'motor_modular') + '/'
SALIDA = os.path.join(RAIZ, 'public', 'assets', 'minijuegos') + '/'
E = 2
ANCHO_MUNDO = 340                       # ancho del vano en px de mundo (480 × 270)
K = ANCHO_MUNDO * E / 1536              # px de fuente → px de pantalla
CAJA_ICONO = (52 * E, 22 * E)

montaje = json.load(open(FUENTE + 'montaje.json'))


def reducir(img, w, h):
    """Reduce con el alfa premultiplicado, así el borde no se tiñe del color de fondo."""
    a = np.asarray(img.convert('RGBA')).astype(np.float32)
    a[..., :3] *= a[..., 3:4] / 255
    canales = [np.asarray(Image.fromarray(a[..., i], 'F').resize((w, h), Image.LANCZOS)) for i in range(4)]
    r = np.stack(canales, -1)
    alfa = np.clip(r[..., 3], 0, 255)
    rgb = r[..., :3] / np.maximum(alfa[..., None] / 255, 1e-3)
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = np.clip(rgb, 0, 255)
    out[..., 3] = np.where(alfa > 110, 255, 0)
    return Image.fromarray(out, 'RGBA')


# --- Base en seis colores -------------------------------------------------------------------------
base = Image.open(FUENTE + 'base_vano.png').convert('RGBA')
a = np.asarray(base).astype(float) / 255
mx, mn = a[..., :3].max(-1), a[..., :3].min(-1)
d = np.maximum(mx - mn, 1e-6)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
tono = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
cavidad = ((xx >= 215) & (xx <= 1320) & (yy >= 232) & (yy <= 690)) | ((xx >= 430) & (xx <= 1110) & (yy > 690) & (yy <= 800))
chapa = (a[..., 3] > 0.5) & (tono > 0.05) & (tono < 0.16) & (sat > 0.5) & (mx > 0.4) & ~cavidad & (yy < 855)
# (tono destino, factor de saturación, factor de brillo); None = original
COLORES = [None, (0.0, 1.0, 0.95), (0.59, 0.95, 0.95), (0.36, 0.9, 0.9), (0.78, 0.8, 0.9), (0.1, 0.12, 1.12)]
w_base, h_base = round(1536 * K), round(1024 * K)
for i, c in enumerate(COLORES):
    rgb = a[..., :3].copy()
    if c:
        t, fs, fv = c
        s2, v2 = np.clip(sat * fs, 0, 1), np.clip(mx * fv, 0, 1)
        # HSV -> RGB solo para los píxeles de chapa
        idx = np.where(chapa)
        nuevo = np.array([colorsys.hsv_to_rgb(t, s2[y, x], v2[y, x]) for y, x in zip(*idx)])
        rgb[idx] = nuevo
    img = Image.fromarray((np.dstack([rgb, a[..., 3]]) * 255 + 0.5).astype(np.uint8), 'RGBA')
    reducir(img, w_base, h_base).save(SALIDA + f'taller_base_{i}.png')

# --- Piezas ----------------------------------------------------------------------------------------
hecho = set()
for capa in montaje['capas']:
    p = capa['pieza']
    if p in hecho:
        continue
    hecho.add(p)
    w, h = max(1, round(capa['ancho'] * K)), max(1, round(capa['alto'] * K))
    for estado in ('sano', 'roto'):
        reducir(Image.open(FUENTE + capa[estado]), w, h).save(SALIDA + f'taller_{p}_{estado}.png')
    # Icono de repuesto (la pieza sana), tan grande como entre en la caja sin deformarse.
    esc = min(CAJA_ICONO[0] / capa['ancho'], CAJA_ICONO[1] / capa['alto'])
    iw, ih = max(1, round(capa['ancho'] * esc)), max(1, round(capa['alto'] * esc))
    reducir(Image.open(FUENTE + capa['sano']), iw, ih).save(SALIDA + f'taller_rep_{p}.png')
print('base', w_base, h_base, '· piezas', len(hecho))
