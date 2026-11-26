"""Arte de los minijuegos (v0.4): ratones, chapitas, tachos y objetos extra. Fuentes en arte/fuentes/."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
exec(open(os.path.join(os.path.dirname(__file__), 'procesar_rupert.py')).read().split('meta={}')[0])
import numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(__file__), '..', '..', 'arte', 'fuentes') + '/'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets') + '/'
for sub in ('objetos', 'minijuegos'):
    os.makedirs(OUT + sub, exist_ok=True)

def quitar_violeta(im):
    """El vidrio y el plástico transparentes dejan ver el magenta del fondo: se pasan a un gris azulado."""
    arr = np.asarray(im).astype(float); r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    tinte = (r - g > 10) & (b - g > 10) & (arr[..., 3] > 0)
    v = (r + g + b) / 3
    arr[..., 0] = np.where(tinte, v * 0.9, r); arr[..., 1] = np.where(tinte, v * 0.97, g); arr[..., 2] = np.where(tinte, np.minimum(255, v * 1.08), b)
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')

def objetos_en(src, names, tam, carpeta='objetos', dil=6, minarea=800, sin_violeta=()):
    a, m = load(src)
    cs = comps(m, dil=dil, minarea=minarea, attach=30)
    rows = rows_of(cs, gap=80)
    cs = [c for r in rows for c in r]
    print(src, len(cs), [len(r) for r in rows]); assert len(cs) == len(names), (len(cs), len(names))
    res = {}
    for c, n in zip(cs, names):
        im = rgba_crop(a, m, c, c['y0'], c['y1']); s = tam / max(im.size)
        out = scale_img(im, s)
        if n in sin_violeta: out = quitar_violeta(out)
        out.save(OUT + f'{carpeta}/{n}.png'); res[n] = out
    return res

# Objetos extra: reciclaje y basura.
objetos_en('reciclables_extra.png', ['botella_aplastada', 'vaso_yogur', 'bidon', 'bolsa', 'frasco', 'botella_vino', 'vaso', 'salsa', 'carton', 'maple', 'revistas', 'conserva'], 26,
           sin_violeta=('botella_aplastada', 'bolsa', 'frasco', 'vaso', 'salsa', 'vaso_yogur'))
objetos_en('basura_extra.png', ['reloj', 'autito', 'osito', 'radio', 'auriculares', 'taza', 'patito', 'libro', 'media', 'manzana_podrida', 'pan_moho', 'cucaracha'], 26)

# Tachos de reciclaje: alto 60 px.
a, m = load('tachos.png'); cs = sorted(comps(m, dil=6, minarea=2000), key=lambda c: c['x0'])
assert len(cs) == 4
for c, n in zip(cs, ['plastico', 'vidrio', 'papel', 'metal']):
    im = rgba_crop(a, m, c, c['y0'], c['y1']); scale_img(im, 60 / im.height).save(OUT + f'minijuegos/tacho_{n}.png')

# Ratones: 4 filas (gris con moño, marrón, blanco, gris oscuro) x 4 fotogramas, todos en una celda común
# alineada por abajo, de 30 px de alto el más alto.
a, m = load('ratones.png'); cs = comps(m, dil=4, minarea=2000, attach=20); rows = rows_of(cs, gap=80)
print('ratones', [len(r) for r in rows]); assert [len(r) for r in rows] == [4, 4, 4, 4]
alto = max(c['y1'] - c['y0'] for r in rows for c in r); s = 30 / alto
frames = [[scale_img(rgba_crop(a, m, c, c['y0'], c['y1']), s) for c in r] for r in rows]
cw = max(f.width for r in frames for f in r) + 2; ch = max(f.height for r in frames for f in r) + 2
for i, r in enumerate(frames):
    for j, f in enumerate(r):
        cel = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); cel.paste(f, ((cw - f.width) // 2, ch - f.height - 1), f)
        cel.save(OUT + f'minijuegos/raton{i}_{j}.png')
print('raton celda', cw, ch)

# Chapitas: las 5 de la hoja (32 px) y el resto teñidas a partir de la plateada, con dibujos.
a, m = load('chapitas.png'); cs = sorted(comps(m, dil=4, minarea=2000), key=lambda c: c['x0'])
assert len(cs) == 5
base = {}
for c, n in zip(cs, ['roja', 'azul', 'amarilla', 'verde', 'plateada']):
    im = rgba_crop(a, m, c, c['y0'], c['y1']); base[n] = scale_img(im, 32 / max(im.size))
def tenir(im, color):
    arr = np.asarray(im).astype(float); rgb = arr[..., :3]
    lum = rgb.mean(-1, keepdims=True) / 255.0
    col = np.array(color, float)[None, None, :]
    # Sombras hacia oscuro, luces hacia blanco, el medio al color.
    out = np.where(lum < 0.6, col * (lum / 0.6), col + (255 - col) * ((lum - 0.6) / 0.4))
    oscuro = lum[..., 0] < 0.18  # el contorno queda igual
    out[oscuro] = rgb[oscuro]
    res = arr.copy(); res[..., :3] = np.clip(out, 0, 255)
    return Image.fromarray(res.astype(np.uint8), 'RGBA')
COLORES = {'naranja': (240, 138, 44), 'violeta': (138, 82, 200), 'negra': (70, 64, 78), 'dorada': (232, 181, 32),
           'rosa': (240, 138, 184), 'celeste': (94, 200, 240), 'blanca': (245, 242, 235)}
for n, col in COLORES.items():
    base[n] = tenir(base['plateada'], col)
ESTRELLA = ['..x..', '..x..', 'xxxxx', '.xxx.', '.x.x.']
PUNTO = ['.xxx.', 'xxxxx', 'xxxxx', 'xxxxx', '.xxx.']
def marcar(im, dibujo, tinta):
    im = im.copy(); px = im.load(); w, h = im.size; k = 2
    x0 = w // 2 - 5; y0 = h // 2 - 5
    for y, fila in enumerate(dibujo):
        for x, ch in enumerate(fila):
            if ch == 'x':
                for dy in range(k):
                    for dx in range(k): px[x0 + x * k + dx, y0 + y * k + dy] = tinta
    return im
OSCURA = (43, 29, 36, 255); CLARA = (255, 250, 240, 255)
for n in ['roja', 'azul', 'amarilla', 'verde', 'plateada', 'naranja', 'violeta', 'negra', 'rosa', 'celeste']:
    base[n].save(OUT + f'minijuegos/chapa_{n}.png')
marcar(base['roja'], ESTRELLA, CLARA).save(OUT + 'minijuegos/chapa_roja_estrella.png')
marcar(base['azul'], PUNTO, CLARA).save(OUT + 'minijuegos/chapa_azul_punto.png')
marcar(base['dorada'], ESTRELLA, OSCURA).save(OUT + 'minijuegos/chapa_dorada_estrella.png')
marcar(base['verde'], PUNTO, CLARA).save(OUT + 'minijuegos/chapa_verde_punto.png')
marcar(base['blanca'], ESTRELLA, OSCURA).save(OUT + 'minijuegos/chapa_blanca_estrella.png')
print('ok')

# Rupert durmiendo (etapa 0): una sola imagen de 112 px de largo, como tira de 1 cuadro.
import json
a, m = load('rupert_e0_dormir.png'); cs = comps(m, dil=6, minarea=2000, attach=40)
c = max(cs, key=lambda c: (c['x1'] - c['x0']) * (c['y1'] - c['y0']))
im = scale_img(rgba_crop(a, m, c, c['y0'], c['y1']), 112 / (c['x1'] - c['x0']))
cel = Image.new('RGBA', (im.width + 2, im.height + 2), (0, 0, 0, 0)); cel.paste(im, (1, 1), im)
cel.save(OUT + 'rupert/e0_dormir.png')
meta = json.load(open(OUT + 'rupert/anim.json')); meta['e0_dormir'] = dict(w=cel.width, h=cel.height, n=1)
json.dump(meta, open(OUT + 'rupert/anim.json', 'w'), indent=1); print('dormir', cel.size)
