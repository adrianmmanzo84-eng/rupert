"""Piezas gastadas del taller (R025): se generan a partir de la pieza nueva, así son el mismo dibujo
y al cambiarla encaja exacta. Oxido, mugre y un detalle propio de cada pieza (sulfato, hollín, corte...)."""
import os
import numpy as np
from PIL import Image

M = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'minijuegos') + '/'
rng = np.random.default_rng(7)


def gastar(nombre):
    a = np.asarray(Image.open(M + f'pieza_{nombre}_nueva.png').convert('RGBA')).astype(float)
    alfa = a[..., 3] > 0
    h, w = alfa.shape
    rgb = a[..., :3]
    gris = rgb.mean(-1, keepdims=True)
    rgb = rgb * 0.55 + gris * 0.45            # menos color
    rgb = rgb * 0.72                          # más oscuro
    oxido = np.array([125, 70, 32], float)
    rgb = rgb * 0.68 + oxido * 0.32            # tinte de óxido
    # Manchas de mugre y óxido.
    for _ in range(max(3, w * h // 90)):
        y, x = rng.integers(0, h), rng.integers(0, w)
        r = rng.integers(1, 3)
        yy, xx = np.ogrid[:h, :w]
        m = ((yy - y) ** 2 + (xx - x) ** 2 <= r * r) & alfa
        color = np.array([70, 40, 18] if rng.random() < 0.6 else [150, 80, 30], float)
        rgb[m] = rgb[m] * 0.4 + color * 0.6
    ys, xs = np.where(alfa)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    if nombre == 'bateria':
        # Sulfato verde en los bornes (arriba).
        for _ in range(14):
            y = rng.integers(y0, y0 + max(2, (y1 - y0) // 4)); x = rng.integers(x0, x1 + 1)
            if alfa[y, x]:
                rgb[y, x] = [150, 205, 140]
    elif nombre == 'bujia':
        # Punta negra de hollín (abajo).
        corte = y1 - (y1 - y0) // 3
        rgb[corte:][alfa[corte:]] = rgb[corte:][alfa[corte:]] * 0.25
    elif nombre == 'correa':
        # Correa cortada: se borra una franja.
        cx = x0 + (x1 - x0) * 3 // 4
        a[y0:y0 + (y1 - y0) // 2, cx:cx + 2, 3] = 0
    elif nombre == 'manguera':
        # Rajadura roja en el medio.
        cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
        for d in range(-3, 4):
            yy, xx = cy + d, cx + d // 2
            if 0 <= yy < h and 0 <= xx < w and alfa[yy, xx]:
                rgb[yy, xx] = [190, 40, 30]
    elif nombre == 'filtro':
        rgb = rgb * 0.8 + np.array([60, 45, 25], float) * 0.2
    a[..., :3] = np.clip(rgb, 0, 255)
    Image.fromarray(a.astype(np.uint8), 'RGBA').save(M + f'pieza_{nombre}_gastada.png')


for n in ['bateria', 'bujia', 'filtro', 'correa', 'manguera', 'tapa']:
    gastar(n)
print('listo')
