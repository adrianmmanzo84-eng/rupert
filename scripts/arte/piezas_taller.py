"""Piezas del taller (R033): recorta del dibujo del autor (arte/fuentes/piezas_motor.png, fondo magenta)
las 6 piezas nuevas y gastadas, y las reduce al doble del tamaño con que se ven (se muestran a escala 1)."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
SALIDA = os.path.join(RAIZ, 'public', 'assets', 'minijuegos') + '/'
fuente = np.asarray(Image.open(os.path.join(RAIZ, 'arte', 'fuentes', 'piezas_motor.png')).convert('RGB')).astype(float)

# Columnas de la hoja: x0, x1 (fila de arriba: nuevas; la de abajo: gastadas, 362 px más abajo).
COLUMNAS = {
    'bateria': (44, 265), 'bujia': (331, 444), 'filtro': (482, 835), 'correa': (853, 1024),
    'tapa': (1042, 1267), 'manguera': (1290, 1561),
}
FILAS = {'nueva': (30, 345), 'gastada': (392, 707)}
LADO = 60

dist = np.sqrt(((fuente - np.array([242, 12, 242])) ** 2).sum(-1))
mascara = ndi.binary_erosion(dist > 70, iterations=1)
mascara = ndi.binary_opening(mascara, iterations=1)


def caja(nombre):
    x0, x1 = COLUMNAS[nombre]
    cajas = []
    for tipo, (y0, y1) in FILAS.items():
        m = mascara[y0:y1, x0 - 6:x1 + 6]
        ys, xs = np.where(m)
        cajas.append((xs.min() + x0 - 6, ys.min() + y0, xs.max() + x0 - 6 + 1, ys.max() + y0 + 1))
    return cajas


for nombre in COLUMNAS:
    c_n, c_g = caja(nombre)
    ancho = max(c_n[2] - c_n[0], c_g[2] - c_g[0])
    alto = max(c_n[3] - c_n[1], c_g[3] - c_g[1])
    esc = LADO / max(ancho, alto)
    for tipo, c in (('nueva', c_n), ('gastada', c_g)):
        # Mismo recuadro para las dos, anclado en el centro de cada una.
        cx, cy = (c[0] + c[2]) // 2, (c[1] + c[3]) // 2
        x0, y0 = cx - ancho // 2, cy - alto // 2
        rgba = np.zeros((alto, ancho, 4), np.uint8)
        sub = fuente[max(0, y0):y0 + alto, max(0, x0):x0 + ancho]
        msub = mascara[max(0, y0):y0 + alto, max(0, x0):x0 + ancho]
        # Solo esta pieza: se queda con lo que está dentro de su columna.
        rgba[:sub.shape[0], :sub.shape[1], :3] = sub
        rgba[:sub.shape[0], :sub.shape[1], 3] = msub * 255
        img = Image.fromarray(rgba, 'RGBA')
        w, h = max(1, round(ancho * esc)), max(1, round(alto * esc))
        # Con alfa premultiplicado para que el borde no se tiña de magenta.
        pre = np.asarray(img).astype(float)
        pre[..., :3] *= pre[..., 3:4] / 255
        canales = [Image.fromarray(pre[..., i].astype(np.float32), 'F').resize((w, h), Image.LANCZOS) for i in range(4)]
        r = np.stack([np.asarray(c_) for c_ in canales], -1)
        alfa = np.clip(r[..., 3], 0, 255)
        rgb = r[..., :3] / np.maximum(alfa[..., None] / 255, 1e-3)
        out = np.zeros((h, w, 4), np.uint8)
        out[..., :3] = np.clip(rgb, 0, 255)
        out[..., 3] = np.where(alfa > 110, 255, 0)
        Image.fromarray(out, 'RGBA').save(SALIDA + f'pieza_{nombre}_{tipo}.png')
        print(nombre, tipo, w, h)
