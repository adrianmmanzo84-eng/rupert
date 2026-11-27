"""Duchas públicas nuevas (R030), a partir de los dibujos que preparó el usuario (arte/fuentes/):
- callejón: cabina con la puerta cerrada, recortada del callejón al anochecer usando la silueta de la
  cabina de la plaza (es el mismo dibujo con otros colores), a dos tamaños (lejos y cerca).
- plaza: la misma cabina abierta y cerrada, con el mismo recorte para que coincidan al cambiar.
- ciudad: el fondo de los negocios con la puerta «Baño» de la florería.
Cada dibujo se reduce al tamaño exacto con el que se muestra (alto del mundo × 2) para que no se deforme."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

AQUI = os.path.dirname(os.path.abspath(__file__))
F = os.path.join(AQUI, '..', '..', 'arte', 'fuentes') + '/'
B = os.path.join(AQUI, '..', '..', 'public', 'assets') + '/'
E = 2


def reducir(im, alto_mundo):
    h = alto_mundo * E
    w = round(im.width * h / im.height)
    return im.resize((w, h), Image.LANCZOS)


# --- Callejón: la cabina cerrada recortada del dibujo con fondo ---
cerrada = Image.open(F + 'ducha_plaza_cerrada.png').convert('RGBA')
mask = np.zeros((1627, 967), bool)
mask[: cerrada.height, : cerrada.width] = np.asarray(cerrada)[: 1627, : 967, 3] > 128
# La cabina del callejón está corrida 9 px a la derecha y 2 hacia arriba respecto de la de la plaza.
mask = np.roll(np.roll(mask, -2, 0), 9, 1)
mask = ndi.binary_erosion(mask, iterations=1)
rgb = np.asarray(Image.open(F + 'ducha_callejon_cerrada.png').convert('RGB'))
cab = Image.fromarray(np.dstack([rgb, (mask * 255).astype(np.uint8)]), 'RGBA')
ys, xs = np.where(mask)
CAB = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
cab = cab.crop(CAB)
print('callejón recorte', CAB, cab.size)
reducir(cab, 58).save(B + 'objetos/ducha_callejon_0.png')

# --- Plaza: abierta y cerrada con el mismo recuadro ---
CAJA = (175, 291, 900, 1464)
for src, dst in [('ducha_plaza_cerrada.png', 'ducha_plaza.png'), ('ducha_plaza_abierta.png', 'ducha_plaza_abierta.png')]:
    im = Image.open(F + src).convert('RGBA').crop(CAJA)
    r = reducir(im, 67)
    r.save(B + 'objetos/' + dst)
    print(dst, r.size)

# --- Ciudad: fondo 16:9 recortado desde abajo, igual que el anterior ---
im = Image.open(F + 'ciudad_con_bano.png').convert('RGB')
W, H = im.size
h = round(W * 9 / 16)
im.crop((0, H - h, W, H)).resize((480, 270), Image.LANCZOS).save(B + 'fondos/ciudad.png')
print('ciudad ok')
