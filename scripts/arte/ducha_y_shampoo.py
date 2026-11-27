"""Ícono del shampoo (R029), dibujado a mano en pixel art. (La ducha pública se hace en duchas_nuevas.py.)"""
import os
import numpy as np
from PIL import Image, ImageDraw

B = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets') + '/'

# La ducha pública ya no se recorta del fondo: ahora son los dibujos de arte/fuentes (ver duchas_nuevas.py, R030).

# Shampoo: frasco celeste de hombros redondeados, tapa naranja y etiqueta blanca con una gota.
# Se dibuja a 32 px con contorno oscuro y sombreado, y se agranda a 64 px como los demás objetos.
S = 32
im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
borde = (40, 28, 48, 255)
claro, medio, oscuro = (178, 226, 255, 255), (112, 196, 250, 255), (62, 138, 210, 255)
# Cuerpo con hombros redondeados.
d.rounded_rectangle((8, 9, 23, 30), radius=4, fill=borde)
d.rounded_rectangle((9, 10, 22, 29), radius=3, fill=medio)
d.rectangle((19, 12, 21, 28), fill=oscuro)
d.rectangle((10, 12, 11, 27), fill=claro)
# Cuello y tapa con pico.
d.rectangle((13, 6, 18, 9), fill=borde)
d.rectangle((14, 7, 17, 9), fill=(250, 250, 250, 255))
d.rectangle((12, 1, 19, 6), fill=borde)
d.rectangle((13, 2, 18, 5), fill=(245, 150, 60, 255))
d.rectangle((13, 2, 14, 5), fill=(255, 190, 110, 255))
d.rectangle((17, 0, 21, 2), fill=borde)
d.rectangle((18, 1, 20, 1), fill=(245, 150, 60, 255))
# Etiqueta con una gota.
d.rounded_rectangle((11, 15, 20, 25), radius=1, fill=(252, 252, 252, 255))
d.rectangle((11, 24, 20, 25), fill=(220, 228, 236, 255))
d.polygon([(15, 17), (13, 21), (15, 23), (17, 21)], fill=(60, 150, 240, 255))
d.point((14, 20), fill=(190, 225, 255, 255))
im.resize((64, 64), Image.NEAREST).save(B + 'objetos/shampoo.png')
print('shampoo listo')
