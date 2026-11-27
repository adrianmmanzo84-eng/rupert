"""Fachada de la escalada (R039), a partir de arte/fuentes/escalada_fachada.png (fondo magenta).
Genera, a tamaño de pantalla (mundo x2):
 - escalada_fachada.png: tira de 6 pisos (480x840) con ladrillos, ventanas variadas, cornisas y los 3 caños,
 - dpto.png / dpto_abierto.png: el piso del dpto 3B (puerta cerrada / abierta),
 - almacen_cartel.png / toldo.png: decorado de la planta baja.
Además imprime la posición de la puerta, para que Rupert camine hasta ella."""
import os
import random
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
SAL = os.path.join(RAIZ, 'public', 'assets', 'minijuegos')
src = Image.open(os.path.join(RAIZ, 'arte', 'fuentes', 'escalada_fachada.png')).convert('RGB')
a = np.asarray(src).astype(float)
magenta = np.abs(a - np.array([251, 4, 251])).sum(-1) < 170
S = 480 / 1376          # el piso del dpto (1376 px de ancho) ocupa los 480 px de pantalla
random.seed(11)


def rgba(caja, escala=S):
    x0, y0, x1, y1 = caja
    rgb = a[y0:y1, x0:x1]
    f = ~magenta[y0:y1, x0:x1]
    lab, n = ndi.label(f)
    if n > 1:
        f &= lab == (np.argmax(ndi.sum(f, lab, range(1, n + 1))) + 1)
    h, w = f.shape
    nw, nh = max(1, round(w * escala)), max(1, round(h * escala))
    al = np.asarray(Image.fromarray((f * 255).astype(np.uint8)).resize((nw, nh), Image.BOX)).astype(float) / 255
    c = np.asarray(Image.fromarray((rgb * f[..., None]).astype(np.uint8)).resize((nw, nh), Image.BOX)).astype(float)
    c = np.where(al[..., None] > 0, c / np.maximum(al[..., None], 1e-3), 0).clip(0, 255)
    return Image.fromarray(np.dstack([c, (al > 0.5) * 255]).astype(np.uint8), 'RGBA')


def guardar(im, nombre):
    im.save(os.path.join(SAL, nombre))
    print(nombre, im.size)


# --- dpto: el piso entero (X 36..1410, Y 28..368 la fila de arriba; 413..755 la de abajo)
cerrado = rgba((30, 22, 1418, 376))
abierto = rgba((30, 407, 1418, 762))
alto = max(cerrado.height, abierto.height)
for nom, im in (('dpto.png', cerrado), ('dpto_abierto.png', abierto)):
    lienzo = Image.new('RGBA', (cerrado.width, alto))
    lienzo.paste(im, (0, alto - im.height))
    lienzo = lienzo.crop((2, 0, 482, alto))   # 480 px justos
    guardar(lienzo, nom)
# puerta: ancho del marco ~ x 430..645 de la fila de arriba; el centro de la puerta (hoja) ~ 540
puerta_x = round((540 - 30) * S) - 2
print('puerta_x (pantalla)', puerta_x, 'de', cerrado.width)

# --- ventanas
vent = {
    'flores': rgba((150, 55, 360, 350)),
    'persianas': rgba((812, 440, 1020, 745)),   # tapa la planta colgante del alféizar
    'cortinas': rgba((1120, 55, 1335, 300)),
    'abuela': rgba((55, 810, 280, 1060)),
    'gato': rgba((355, 810, 580, 1060)),
}
# ajuste: las 3 de la fila de arriba incluyen el lintel; la 2ª se toma de la fila de abajo (misma ventana, sin puerta)
guardar(rgba((640, 828, 965, 1040)), 'almacen_cartel.png')
guardar(rgba((1015, 840, 1412, 1045)), 'toldo.png')
for k, v in vent.items():
    print(k, v.size)

# --- ladrillos: procedurales, con la paleta del arte
W, H = 480, 140
PISOS = 6
paleta = [(168, 74, 52), (150, 62, 44), (182, 88, 62), (138, 56, 42), (160, 70, 50)]
mortero = (92, 48, 40)
tira = Image.new('RGBA', (W, H * PISOS), mortero + (255,))
d = ImageDraw.Draw(tira)
LB, AB = 22, 10
for fila in range(H * PISOS // AB + 1):
    off = (LB // 2) if fila % 2 else 0
    for k in range(-1, W // LB + 2):
        x = k * LB + off
        c = random.choice(paleta)
        y = fila * AB
        d.rectangle([x + 1, y + 1, x + LB - 2, y + AB - 2], fill=c)
        d.rectangle([x + 1, y + 1, x + LB - 2, y + 1], fill=tuple(min(255, v + 18) for v in c))
# manchas de revoque que se cayó
for _ in range(10):
    x, y = random.randrange(10, W - 30), random.randrange(0, H * PISOS - 20)
    for _ in range(7):
        dx, dy = random.randint(-8, 8), random.randint(-4, 4)
        d.rectangle([x + dx, y + dy, x + dx + random.randint(3, 8), y + dy + random.randint(2, 5)], fill=(176, 140, 110))
# cornisa de piedra al pie de cada piso
for p in range(PISOS):
    y0 = p * H + H - 12
    d.rectangle([0, y0, W, y0 + 11], fill=(30, 18, 14))
    d.rectangle([0, y0 + 1, W, y0 + 9], fill=(196, 160, 124))
    d.rectangle([0, y0 + 1, W, y0 + 2], fill=(222, 188, 150))
    d.rectangle([0, y0 + 8, W, y0 + 9], fill=(150, 116, 88))
    for x in range(0, W, 38):
        d.line([x, y0 + 1, x, y0 + 9], fill=(120, 90, 66))
# ventanas por piso y carril (centradas en cada caño)
CENT = [40, 120, 200]   # carriles 160/240/320 menos X0=120, en px de mundo; x2 abajo
plan = [
    ['flores', 'cortinas'],
    ['abuela', 'persianas'],
    ['cortinas', 'gato'],
    ['persianas', 'flores'],
    ['gato', 'abuela'],
    ['cortinas', 'persianas'],
]
for p, fila in enumerate(plan):
    for k, nom in enumerate(fila):
        v = vent[nom]
        x = (160 if k == 0 else 320) - v.width // 2
        y = p * H + (H - 12) - v.height - 8
        tira.alpha_composite(v, (x, y))
# caños: continuos, con soportes cada piso
for cx in CENT:
    x = cx * 2 - 6
    for y in range(H * PISOS):
        d.rectangle([x, y, x + 11, y], fill=(40, 44, 50))
        d.rectangle([x + 1, y, x + 10, y], fill=(122, 130, 140))
        d.rectangle([x + 2, y, x + 4, y], fill=(190, 198, 208))
        d.rectangle([x + 9, y, x + 10, y], fill=(86, 92, 100))
    for p in range(PISOS):
        for yy in (p * H + 28, p * H + 100):
            d.rectangle([x - 2, yy, x + 13, yy + 5], fill=(40, 44, 50))
            d.rectangle([x - 1, yy + 1, x + 12, yy + 4], fill=(96, 104, 114))
guardar(tira, 'escalada_fachada.png')
