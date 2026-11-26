"""Quita la llave de la animación «usar» de Rupert (R025). Se corre sobre public/assets/rupert/e*_usar.png.
Cuadros 1 y 2: borra las manchas sueltas (la llave en el piso). Cuadro 3 (levantando la llave): pasa a ser
el cuadro 1 limpio, así la animación queda mirar → agacharse → pararse, sin nada en la mano."""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

R = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'rupert') + '/'
anim = json.load(open(R + 'anim.json'))


def limpiar(f):
    a = np.asarray(f).copy()
    lab, n = ndi.label(a[..., 3] > 0)
    if n <= 1:
        return Image.fromarray(a, 'RGBA')
    areas = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    grande = areas.max()
    for i, ar in enumerate(areas, 1):
        if ar < grande * 0.25:
            a[lab == i] = 0
    return Image.fromarray(a, 'RGBA')


def sin_dorado(f, desde):
    """Borra el dorado de la llave (y su contorno oscuro pegado) de la franja de abajo, desde la fila `desde`."""
    a = np.asarray(f).copy().astype(int)
    rgb = a[..., :3] / 255.0
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    tono = np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) % 360
    oro = (a[..., 3] > 0) & (tono > 36) & (tono < 62) & (sat > 0.55) & (mx > 0.55)
    oro[:desde] = False
    # El contorno oscuro de la llave: píxeles oscuros pegados al dorado.
    cerca = ndi.binary_dilation(oro, iterations=2)
    oscuro = (a[..., 3] > 0) & (mx < 0.35) & cerca
    oscuro[:desde] = False
    a[oro | oscuro] = 0
    return limpiar(Image.fromarray(a.astype(np.uint8), 'RGBA'))


for e in range(10):
    k = f'e{e}_usar'
    w, h, n = anim[k]['w'], anim[k]['h'], anim[k]['n']
    im = Image.open(R + k + '.png').convert('RGBA')
    cuadros = [limpiar(im.crop((i * w, 0, (i + 1) * w, h))) for i in range(n)]
    cuadros[1] = sin_dorado(cuadros[1], int(h * 0.72))
    if e == 5:
        # Etapa 5: queda el llavero rojo entre los dedos; se borra el rojo/magenta de esa esquina.
        a = np.asarray(cuadros[1]).copy().astype(int)
        y0, x0 = int(h * 0.6) + 26, 30 + 22
        zona = a[y0:y0 + 14, x0:x0 + 16]
        r, g, b = zona[..., 0], zona[..., 1], zona[..., 2]
        rojo = (zona[..., 3] > 0) & (r > 120) & (r - g > 70) & (b > g - 10)
        zona[rojo] = 0
        cuadros[1] = Image.fromarray(a.astype(np.uint8), 'RGBA')
    cuadros[2] = cuadros[0]
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for i, c in enumerate(cuadros):
        out.paste(c, (i * w, 0))
    out.save(R + k + '.png')
print('listo')
