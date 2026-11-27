"""Rupert escalando (R037): toma la tira de 4 poses del autor (arte/fuentes/rupert_escalar.png, fondo magenta),
le quita el caño (el juego ya dibuja los suyos) y la deja a tamaño de pantalla, con el centro de cada cuadro
sobre el eje del caño, así que al ponerlo en un carril queda justo sobre él."""
import os
import numpy as np
from PIL import Image

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
E = 2
ALTO_MUNDO = 54          # alto del personaje en el juego, en px del mundo
imagen = Image.open(os.path.join(RAIZ, 'arte', 'fuentes', 'rupert_escalar.png')).convert('RGB')
a = np.asarray(imagen).astype(float)
H, W = a.shape[:2]
CELDA = W / 4

magenta = np.abs(a - np.array([242, 12, 242])).sum(-1) < 150
figura = ~magenta
# Caño: tramos horizontales de gris liso de 22 a 38 px de ancho (el caño mide ~30) cerca del eje; se borran
# junto con 8 px a cada lado, que es donde está su contorno oscuro. La llave y el martillo son más finos o más anchos.
gris = (np.abs(a[..., 0] - a[..., 1]) < 18) & (np.abs(a[..., 1] - a[..., 2]) < 18) & (a.mean(-1) > 70)
oscuro = a.mean(-1) < 95
EJE = 213.5
for k in range(4):
    cx = int(round(k * CELDA + EJE))
    for y in range(H):
        x = cx - 70
        while x < cx + 70:
            if gris[y, x]:
                x2 = x
                while x2 < W and gris[y, x2]:
                    x2 += 1
                if 22 <= x2 - x <= 38:
                    figura[y, x - 9:x2 + 9] &= ~(gris[y, x - 9:x2 + 9] | oscuro[y, x - 9:x2 + 9])
                x = x2
            else:
                x += 1
# Tramos de caño que quedaron tapados a medias por las piernas: componentes grises angostos cerca del eje.
# (La llave está más lejos del eje y el martillo es más ancho, así que se conservan.)
from scipy import ndimage as ndi
for k in range(4):
    cx = k * CELDA + EJE
    x0, x1 = int(cx - 110), int(cx + 110)
    lab, n = ndi.label(figura[:, x0:x1] & gris[:, x0:x1], structure=np.ones((3, 3)))
    for i, sl in enumerate(ndi.find_objects(lab), start=1):
        ancho = sl[1].stop - sl[1].start
        centro = x0 + (sl[1].start + sl[1].stop) / 2 - cx
        if ancho <= 36 and -42 <= centro <= 40:
            figura[:, x0:x1][sl] &= ~(lab[sl] == i)
# Se descartan motas sueltas que quedaron del caño (pequeñas) con una apertura simple.
from scipy import ndimage as ndi
figura = ndi.binary_opening(figura, structure=np.ones((3, 3)))
figura = ndi.binary_closing(figura, structure=np.ones((3, 3)))
# Cada cuadro conserva solo su pieza principal.
cuadros = []
for k in range(4):
    x0, x1 = int(k * CELDA), int((k + 1) * CELDA)
    m = figura[:, x0:x1].copy()
    lab, n = ndi.label(ndi.binary_dilation(m, iterations=4))
    if n > 1:
        tam = ndi.sum(m, lab, range(1, n + 1))
        m &= lab == (1 + int(np.argmax(tam)))
    cuadros.append((x0, m))

ys = np.concatenate([np.where(m.any(1))[0] for _, m in cuadros])
y0, y1 = ys.min(), ys.max() + 1
# Ancho: simétrico respecto del eje, para que el centro del cuadro sea el caño.
semi = 0
for x0, m in cuadros:
    xs = np.where(m.any(0))[0]
    semi = max(semi, EJE - xs.min(), xs.max() + 1 - EJE)
semi = int(np.ceil(semi))
esc = ALTO_MUNDO * E / (y1 - y0)
w, h = max(1, round(2 * semi * esc)), round((y1 - y0) * esc)
hoja = np.zeros((h, w * 4, 4), np.uint8)
for k, (x0, m) in enumerate(cuadros):
    xa = int(round(x0 + EJE - semi))
    sub = np.zeros((y1 - y0, 2 * semi, 4), np.float32)
    ox0, ox1 = max(0, xa), min(W, xa + 2 * semi)
    sub[:, ox0 - xa:ox1 - xa, :3] = a[y0:y1, ox0:ox1]
    # Alfa de la figura de este cuadro solamente.
    mm = np.zeros((y1 - y0, 2 * semi), bool)
    mm[:, ox0 - xa:ox1 - xa] = (m[y0:y1, ox0 - x0:ox1 - x0] if ox0 - x0 >= 0 else m[y0:y1, :ox1 - x0])
    sub[..., 3] = mm * 255
    sub[..., :3] *= sub[..., 3:4] / 255
    canales = [np.asarray(Image.fromarray(sub[..., i], 'F').resize((w, h), Image.BOX)) for i in range(4)]
    r = np.stack(canales, -1)
    alfa = np.clip(r[..., 3], 0, 255)
    rgb = r[..., :3] / np.maximum(alfa[..., None] / 255, 1e-3)
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = np.clip(rgb, 0, 255)
    out[..., 3] = np.where(alfa > 120, 255, 0)
    hoja[:, k * w:(k + 1) * w] = out
destino = os.path.join(RAIZ, 'public', 'assets', 'minijuegos', 'rupert_escalar.png')
Image.fromarray(hoja, 'RGBA').save(destino)
print('cuadro', w, 'x', h)
