exec(open('proc.py').read().split('meta={}')[0])
# fondos: recorte 16:9 desde abajo y reducción a 480x270
def fondo(src,dst,alpha=False,top=None):
    im=Image.open(D+src).convert('RGB'); W,H=im.size; h=round(W*9/16)
    t=H-h if top is None else top
    if alpha:
        a,m=load(src); arr=np.zeros((H,W,4),np.uint8); arr[...,:3]=a; arr[...,3]=m*255
        c=Image.fromarray(arr,'RGBA').crop((0,t,W,t+h))
        scale_img(c,480/W).save(OUT+'fondos/'+dst)
    else:
        im.crop((0,t,W,t+h)).resize((480,270),Image.LANCZOS).save(OUT+'fondos/'+dst)
fondo('Callejón de ladrillo al anochecer.png','callejon_e0.png')
fondo('Farola y bolsas pixeladas sobre magenta.png','callejon_e0_primerplano.png',alpha=True)
fondo('Callejón al anochecer con ducha pública.png','callejon_e1.png')
# objetos: cada componente grande, escalado a lado mayor = tam
def objetos(src,names,tam):
    a,m=load(src); cs=comps(m,dil=6,minarea=800,attach=30)
    cs=sorted(cs,key=lambda c:(round((c['y0']+c['y1'])/2/250),c['x0']))
    print(src,len(cs)); assert len(cs)==len(names)
    for c,n in zip(cs,names):
        im=rgba_crop(a,m,c,c['y0'],c['y1']); s=tam/max(im.size); scale_img(im,s).save(OUT+'objetos/'+n+'.png')
objetos('Seis objetos retro en pixel art.png',['lata','diario','zapato','llave','moneda','paraguas'],26)
objetos('Botellas, plátano, pez, caja y anillo.png',['botella','botella_plastico','cascara','espina','caja','anillo'],24)
objetos('Seis objetos cotidianos en pixel art.png',['sandwich','sopa','manzana','jabon','toalla','cafe'],28)
objetos('Iconos pixelados retro de aventura.png',['i_hambre','i_higiene','i_animo','i_moneda','i_ayuda','i_racha'],20)
a,m=load('Barra retro con cerdito y casa.png'); cs=comps(m,dil=8,minarea=500,attach=60)
c=max(cs,key=lambda c:(c['x1']-c['x0'])); im=rgba_crop(a,m,c,c['y0'],c['y1']); scale_img(im,220/im.width).save(OUT+'ui/barra_fondo.png'); print('barra',len(cs))
ic=Image.open(D+'Rupert, sonrisa y bufanda roja.png').convert('RGB'); ic.resize((512,512),Image.LANCZOS).save(OUT+'ui/icono_512.png'); ic.resize((192,192),Image.LANCZOS).save(OUT+'ui/icono_192.png'); ic.resize((64,64),Image.LANCZOS).save(OUT+'ui/favicon.png')
# Objetos extra (v0.3): hojas de la plaza, la barbería y accesorios.
objetos('Sprites urbanos retro sobre magenta.png',['volantes','paloma','paloma_vuela','billetera','caja_herramientas','rueda'],26)
objetos('Herramientas de barbería en pixel art.png',['tijeras','peine','brocha','navaja','secador','perfume'],24)
objetos('Accesorios vintage en pixel art.png',['gorro','anteojos','monio','gorra','guantes','flor'],24)
