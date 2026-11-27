"""Extras de la escalada (R039), a partir de arte/fuentes/escalada_extras.png (fondo magenta):
 - rupert_golpe: Rupert aturdido agarrado al caño (se le quita el caño: el juego dibuja los suyos),
 - rupert_entrar: 2 poses de perfil para entrar al dpto,
 - soga: soga con remeras (obstáculo), maceta, maceta_rota.
Todo queda a tamaño de pantalla (escala de mundo x2); el eje del caño queda en el centro del cuadro."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
SAL = os.path.join(RAIZ, 'public', 'assets', 'minijuegos')
img = Image.open(os.path.join(RAIZ, 'arte', 'fuentes', 'escalada_extras.png')).convert('RGB')
a = np.asarray(img).astype(float)
H, W = a.shape[:2]
magenta = np.abs(a - np.array([252, 5, 250])).sum(-1) < 170
figura = ~magenta


def recorte(caja, fig=None):
    x0, y0, x1, y1 = caja
    f = (figura if fig is None else fig)[y0:y1, x0:x1]
    rgb = a[y0:y1, x0:x1]
    # quedarse con el componente grande (y sus vecinos cercanos), sin motas de magenta
    return rgb, f


def reducir(rgb, f, escala):
    """Reduce con alfa premultiplicado y alfa duro; devuelve RGBA."""
    h, w = f.shape
    nw, nh = max(1, round(w * escala)), max(1, round(h * escala))
    al = Image.fromarray((f * 255).astype(np.uint8)).resize((nw, nh), Image.BOX)
    prem = (rgb * f[..., None]).astype(np.uint8)
    c = Image.fromarray(prem).resize((nw, nh), Image.BOX)
    A = np.asarray(al).astype(float) / 255
    C = np.asarray(c).astype(float)
    C = np.where(A[..., None] > 0, C / np.maximum(A[..., None], 1e-3), 0).clip(0, 255)
    sal = np.dstack([C, (A > 0.5) * 255]).astype(np.uint8)
    return Image.fromarray(sal, 'RGBA')


def guardar(im, nombre):
    im.save(os.path.join(SAL, nombre))
    print(nombre, im.size)


ESC = 108 / 590  # el personaje (casco a zapatos) mide 108 px de pantalla, como en la tira de escalada

# ---- Rupert golpeado: se quita el caño
x0, y0, x1, y1 = 100, 0, 460, 665
rgb, f = recorte((x0, y0, x1, y1))
gris = (np.abs(rgb[..., 0] - rgb[..., 1]) < 18) & (np.abs(rgb[..., 1] - rgb[..., 2]) < 18) & (rgb.mean(-1) > 70)
oscuro = rgb.mean(-1) < 95
h, w = f.shape
EJE = 178  # centro del caño (en el recorte), a media altura
for y in list(range(0, 105)) + list(range(400, h)):
    x = 120
    while x < 230:
        if gris[y, x]:
            x2 = x
            while x2 < w and gris[y, x2]:
                x2 += 1
            if 20 <= x2 - x <= 40:
                f[y, x - 9:x2 + 9] &= ~(gris[y, x - 9:x2 + 9] | oscuro[y, x - 9:x2 + 9])
            x = x2
        else:
            x += 1
# restos angostos de caño cerca del eje
lab, n = ndi.label(gris & f)
for i in range(1, n + 1):
    if False: break
    m = lab == i
    ys, xs = np.nonzero(m)
    if m.sum() < 5000 and abs(xs.mean() - EJE) < 30 and xs.max() - xs.min() < 42 and not (xs.min() < 140) and (ys.mean() < 105 or ys.mean() > 400):
        f[ndi.binary_dilation(m, iterations=3) & oscuro] = False
        f[m] = False
# sólo el componente principal
lab, n = ndi.label(ndi.binary_dilation(f, iterations=3))
mayor = lab == (np.argmax(ndi.sum(f, lab, range(1, n + 1))) + 1)
f &= mayor
ys, xs = np.nonzero(f)
print('golpe bbox', xs.min(), xs.max(), ys.min(), ys.max())
ancho_mitad = max(EJE - xs.min(), xs.max() - EJE) + 4
cx0, cx1 = int(EJE - ancho_mitad), int(EJE + ancho_mitad)
rgb2, f2 = rgb[ys.min():ys.max() + 1, cx0:cx1], f[ys.min():ys.max() + 1, cx0:cx1]
# casco arriba: el casco empieza ~65 px bajo lo más alto de la figura (estrellas/manos); la escala sigue ESC
guardar(reducir(rgb2, f2, ESC), 'rupert_golpe.png')

# ---- Rupert entrando: 2 poses
poses = []
for caja in [(600, 40, 960, 665), (1070, 40, 1470, 665)]:
    rgb, f = recorte(caja)
    lab, n = ndi.label(ndi.binary_dilation(f, iterations=4))
    tam = ndi.sum(f, lab, range(1, n + 1))
    f &= lab == (np.argmax(tam) + 1)
    ys, xs = np.nonzero(f)
    poses.append((rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1], f[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
alto = max(p[1].shape[0] for p in poses)
ancho = max(p[1].shape[1] for p in poses)
cuadros = []
for rgb, f in poses:
    lienzo_rgb = np.zeros((alto, ancho, 3))
    lienzo_f = np.zeros((alto, ancho), bool)
    hh, ww = f.shape
    ox = (ancho - ww) // 2
    lienzo_rgb[alto - hh:, ox:ox + ww] = rgb
    lienzo_f[alto - hh:, ox:ox + ww] = f
    cuadros.append(reducir(lienzo_rgb, lienzo_f, ESC))
tira = Image.new('RGBA', (cuadros[0].width * 2, cuadros[0].height))
for i, c in enumerate(cuadros):
    tira.paste(c, (i * c.width, 0))
guardar(tira, 'rupert_entrar.png')


# ---- Objetos sueltos
def objeto(caja, nombre, escala, dil=5):
    rgb, f = recorte(caja)
    lab, n = ndi.label(ndi.binary_dilation(f, iterations=dil))
    f &= lab > 0
    ys, xs = np.nonzero(f)
    guardar(reducir(rgb[ys.min():ys.max() + 1, xs.min():xs.max() + 1], f[ys.min():ys.max() + 1, xs.min():xs.max() + 1], escala), nombre)


objeto((30, 780, 620, 990), 'soga.png', 0.26)       # 543 px de ancho -> ~140 px de pantalla
objeto((760, 770, 900, 920), 'maceta.png', 0.28)
objeto((1090, 810, 1420, 960), 'maceta_rota.png', 0.28, dil=14)
