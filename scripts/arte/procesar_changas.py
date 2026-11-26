"""Arte de las changas de la v0.10: cocina, oficina y entrevistador, arreglos, peatones y motor. Fuentes en arte/fuentes/."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

D = os.path.join(os.path.dirname(__file__), '..', '..', 'arte', 'fuentes') + '/'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets') + '/'
os.makedirs(OUT + 'minijuegos', exist_ok=True)
os.makedirs(OUT + 'fondos', exist_ok=True)


def cargar(p):
    a = np.asarray(Image.open(D + p).convert('RGB')).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = (r > 150) & (b > 150) & (g < 120) & (np.abs(r - b) < 90)
    m = ndi.binary_erosion(~mag, iterations=2)
    return a.astype(np.uint8), m


def piezas(m, dil, minarea):
    """Manchas conectadas (con dilatación para unir partes sueltas, como gotas o una pata caída)."""
    lab, _ = ndi.label(ndi.binary_dilation(m, iterations=dil))
    res = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None:
            continue
        if ((lab[sl] == i) & m[sl]).sum() < minarea:
            continue
        res.append(dict(i=i, lab=lab, y0=sl[0].start, y1=sl[0].stop, x0=sl[1].start, x1=sl[1].stop))
    return res


def filas(cs, gap):
    cs = sorted(cs, key=lambda c: (c['y0'] + c['y1']) / 2)
    out, cur = [], [cs[0]]
    for c in cs[1:]:
        if (c['y0'] + c['y1']) / 2 - (cur[-1]['y0'] + cur[-1]['y1']) / 2 > gap:
            out.append(cur); cur = [c]
        else:
            cur.append(c)
    out.append(cur)
    return [sorted(r, key=lambda c: c['x0']) for r in out]


def recorte(a, m, c):
    sl = (slice(c['y0'], c['y1']), slice(c['x0'], c['x1']))
    alfa = (c['lab'][sl] == c['i']) & m[sl]
    img = np.zeros((c['y1'] - c['y0'], c['x1'] - c['x0'], 4), np.uint8)
    img[..., :3] = a[sl]; img[..., 3] = alfa * 255
    return Image.fromarray(img, 'RGBA')


def escalar(im, s):
    w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
    r = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    arr = np.asarray(r).copy(); al = arr[..., 3]
    arr[..., 3] = np.where(al >= 110, 255, 0); arr[al < 110, :3] = 0
    return Image.fromarray(arr, 'RGBA')


def quitar_violeta(im):
    """Las bolsas transparentes dejan ver el magenta del fondo: se pasan a gris claro."""
    arr = np.asarray(im).astype(float); r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    tinte = (r - g > 10) & (b - g > 10) & (arr[..., 3] > 0)
    v = (r + g + b) / 3
    arr[..., 0] = np.where(tinte, v * 0.95, r); arr[..., 1] = np.where(tinte, v * 0.97, g); arr[..., 2] = np.where(tinte, np.minimum(255, v * 1.02), b)
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')


def hoja(src, nombres_por_fila, tam_por_fila, dil=8, minarea=1500, gap=120, sin_violeta=()):
    """Objetos sueltos en filas: cada uno se guarda con su lado mayor = tam de su fila."""
    a, m = cargar(src)
    rs = filas(piezas(m, dil, minarea), gap)
    print(src, [len(r) for r in rs])
    assert [len(r) for r in rs] == [len(n) for n in nombres_por_fila], [len(r) for r in rs]
    for r, nombres, tam in zip(rs, nombres_por_fila, tam_por_fila):
        for c, n in zip(r, nombres):
            im = recorte(a, m, c)
            out = escalar(im, tam / max(im.size))
            if n in sin_violeta:
                out = quitar_violeta(out)
            out.save(OUT + f'minijuegos/{n}.png')


def tira(src, nombre_fila, alto, dil=4, minarea=1500, gap=120, por_fila=None):
    """Fotogramas de personajes: todas las filas a la misma escala, en celdas comunes alineadas por los pies."""
    a, m = cargar(src)
    cs = piezas(m, dil, minarea)
    rs = filas(cs, gap)
    print(src, [len(r) for r in rs])
    if por_fila:
        rs = [r for r in rs if len(r) == por_fila]
    hmax = max(c['y1'] - c['y0'] for r in rs for c in r); s = alto / hmax
    frames = [[escalar(recorte(a, m, c), s) for c in r] for r in rs]
    cw = max(f.width for r in frames for f in r) + 2; ch = max(f.height for r in frames for f in r) + 1
    for i, r in enumerate(frames):
        lam = Image.new('RGBA', (cw * len(r), ch), (0, 0, 0, 0))
        for j, f in enumerate(r):
            lam.paste(f, (j * cw + (cw - f.width) // 2, ch - f.height), f)
        lam.save(OUT + f'minijuegos/{nombre_fila(i)}.png')
    print('celda', cw, ch)
    return rs, a, m


# Cocina: utensilios, ingredientes y platos terminados.
hoja('cocina.png',
     [['hornillo', 'olla', 'sarten', 'tabla'],
      ['arroz', 'fideos', 'tomate', 'cebolla', 'huevo', 'papa', 'zanahoria', 'carne'],
      ['plato_arroz', 'plato_fideos', 'plato_guiso']],
     [56, 30, 64], sin_violeta=('arroz', 'fideos'))

# Arreglos: seis objetos rotos, los mismos arreglados y cuatro herramientas.
ROTOS = ['silla', 'canilla', 'radio', 'puerta', 'paraguas', 'bici']
hoja('arreglos.png', [[f'{n}_rota' for n in ROTOS], [f'{n}_ok' for n in ROTOS], ['herr_martillo', 'herr_destornillador', 'herr_llave', 'herr_cinta']],
     [56, 56, 36], dil=14)

# Entrevistador: cuatro expresiones (neutral, hablando, contento, serio) en una tira.
tira('entrevistador.png', lambda i: 'entrevistador', 120, dil=6)

# Peatones: cinco filas de 4 pasos + 1 tomando el volante; el volante suelto va aparte.
rs, a, m = tira('volantes.png', lambda i: f'peaton{i}', 72, dil=3, minarea=600, por_fila=5)
chicos = [c for c in piezas(m, 3, 50) if (c['y1'] - c['y0']) < 60]
assert len(chicos) == 1, len(chicos)
im = recorte(a, m, chicos[0]); escalar(im, 12 / im.height).save(OUT + 'minijuegos/volante.png')

# Motor: el auto con el capó abierto (ancho 300) y doce piezas (gastada y nueva de cada una).
a, m = cargar('taller_auto.png')
cs = piezas(m, 6, 800)
auto = max(cs, key=lambda c: (c['y1'] - c['y0']) * (c['x1'] - c['x0']))
im = recorte(a, m, auto); escalar(im, 300 / im.width).save(OUT + 'minijuegos/motor.png')
partes = sorted([c for c in cs if c is not auto and c['y0'] > auto['y1'] - 10], key=lambda c: c['x0'])
print('piezas', len(partes)); assert len(partes) == 12, len(partes)
PIEZAS = ['bateria', 'bujia', 'filtro', 'correa', 'manguera', 'tapa']
for k, c in enumerate(partes):
    im = recorte(a, m, c)
    n = f"pieza_{PIEZAS[k // 2]}_{'gastada' if k % 2 == 0 else 'nueva'}"
    escalar(im, 30 / max(im.size)).save(OUT + f'minijuegos/{n}.png')

# Oficina: fondo completo a 480 × 270.
Image.open(D + 'oficina.png').convert('RGB').resize((480, 270), Image.LANCZOS).save(OUT + 'fondos/oficina.png')
print('listo')
