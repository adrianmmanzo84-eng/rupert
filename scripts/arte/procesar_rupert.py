import json, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
D='/mnt/user-data/uploads/RUPER/'
OUT='/home/claude/rupert/public/assets/'
os.makedirs(OUT+'rupert',exist_ok=True); os.makedirs(OUT+'fondos',exist_ok=True); os.makedirs(OUT+'objetos',exist_ok=True); os.makedirs(OUT+'ui',exist_ok=True)
def load(p):
    a=np.asarray(Image.open(D+p).convert('RGB')).astype(np.int16)
    r,g,b=a[...,0],a[...,1],a[...,2]
    mag=(r>150)&(b>150)&(g<120)&(np.abs(r-b)<90)
    m=ndi.binary_erosion(~mag,iterations=2)
    return a.astype(np.uint8),m
def comps(m,dil=3,minarea=2500,attach=45):
    lab,n=ndi.label(ndi.binary_dilation(m,iterations=dil))
    big=[];small=[]
    for i,sl in enumerate(ndi.find_objects(lab),1):
        if sl is None: continue
        area=((lab[sl]==i)&m[sl]).sum()
        d=dict(ids=[i],y0=sl[0].start,y1=sl[0].stop,x0=sl[1].start,x1=sl[1].stop,lab=lab)
        (big if area>=minarea else small).append(d) if area>20 else None
    for s_ in small:
        best=None;bd=1e9
        for b in big:
            dx=max(b['x0']-s_['x1'],s_['x0']-b['x1'],0); dy=max(b['y0']-s_['y1'],s_['y0']-b['y1'],0)
            dd=max(dx,dy)
            if dd<bd: bd=dd;best=b
        if best is not None and bd<=attach:
            best['ids'].append(s_['ids'][0]); best['x0']=min(best['x0'],s_['x0']);best['x1']=max(best['x1'],s_['x1']);best['y0']=min(best['y0'],s_['y0']);best['y1']=max(best['y1'],s_['y1'])
    med=np.median([b['y1']-b['y0'] for b in big]); out=[]
    for b in big:
        h=b['y1']-b['y0']
        if h>1.5*med:
            pr=m[b['y0']:b['y1'],b['x0']:b['x1']].sum(1); lo=int(h*.35); hi=int(h*.65)
            cut=b['y0']+lo+int(np.argmin(pr[lo:hi]))
            out.append(dict(b,y1=cut)); out.append(dict(b,y0=cut))
        else: out.append(b)
    return out
def rows_of(cs,gap=60):
    cs=sorted(cs,key=lambda c:c['y1'])
    rows=[];cur=[cs[0]]
    for c in cs[1:]:
        if c['y1']-max(d['y1'] for d in cur)>gap: rows.append(cur);cur=[c]
        else: cur.append(c)
    rows.append(cur)
    return [sorted(r,key=lambda c:c['x0']) for r in rows]
def rgba_crop(a,m,c,ytop,ybot):
    lab=c['lab']; x0,x1=c['x0'],c['x1']
    sub=np.isin(lab[ytop:ybot,x0:x1],c['ids'])&m[ytop:ybot,x0:x1]
    yy=np.arange(ytop,ybot)[:,None]; sub&=(yy>=c['y0'])&(yy<c['y1'])
    img=np.zeros((ybot-ytop,x1-x0,4),np.uint8); img[...,:3]=a[ytop:ybot,x0:x1]; img[...,3]=sub*255
    return Image.fromarray(img,'RGBA')
def scale_img(im,s):
    w=max(1,round(im.width*s)); h=max(1,round(im.height*s))
    r=im.convert('RGBa').resize((w,h),Image.LANCZOS).convert('RGBA')
    arr=np.asarray(r).copy(); al=arr[...,3]; arr[...,3]=np.where(al>=110,255,0); arr[al<110,:3]=0
    return Image.fromarray(arr,'RGBA')
def sheet(path,names,ref_row,target=112,expect=None,norm=()):
    a,m=load(path); cs=comps(m); rows=rows_of(cs)
    if expect:
        # Si una fila trae piezas sueltas de más (destellos, polvo), se descartan las más chicas.
        for i,n in enumerate(expect):
            while i < len(rows) and len(rows[i]) > n:
                rows[i].remove(min(rows[i], key=lambda c:(c['x1']-c['x0'])*(c['y1']-c['y0'])))
    counts=[len(r) for r in rows]; print(path,counts)
    if expect: assert counts==expect,(counts,expect)
    ref=np.median([c['y1']-c['y0'] for c in rows[ref_row]]); s=target/ref
    meta={}
    for name,row in zip(names,rows):
        ytop=min(c['y0'] for c in row); ybot=max(c['y1'] for c in row)
        sr=s
        if name in norm: sr=target/np.median([c['y1']-c['y0'] for c in row])
        frames=[scale_img(rgba_crop(a,m,c,ytop,ybot),sr) for c in row]
        cw=max(f.width for f in frames)+2; ch=max(f.height for f in frames)+2
        strip=Image.new('RGBA',(cw*len(frames),ch),(0,0,0,0))
        for i,f in enumerate(frames): strip.paste(f,(i*cw+(cw-f.width)//2,ch-f.height-1),f)
        strip.save(OUT+f'rupert/{name}.png'); meta[name]=dict(w=cw,h=ch,n=len(frames))
    return meta
meta={}
meta.update(sheet('Rupert_ hoja de sprites en pixel arts',['e0_quieto_frente','e0_quieto_34','e0_caminar_perfil','e0_caminar_frente','e0_caminar_espalda'],0,expect=[4,4,6,4,4],norm=('e0_caminar_frente','e0_caminar_espalda','e0_quieto_34')))
meta.update(sheet('Hoja de sprites pixel art de Rupert.png',['e0_hablar','e0_comer','e0_lavarse','e0_usar','e0_triste','e0_celebrar'],0,expect=[3,4,4,3,2,6],norm=('e0_hablar','e0_comer','e0_lavarse')))
MOV=['quieto_frente','quieto_34','caminar_perfil','caminar_frente','caminar_espalda']
ACC=['hablar','comer','lavarse','usar','triste','celebrar']
ETAPAS={'e1':('Rupert_ sprites de animación en pixel art.png','Rupert en acción, seis filas de sprites.png'),
        'e2':('Rupert_ atlas de sprites en movimiento.png','Rupert_ atlas de sprites en pixel art.png'),
        'e3':('Hoja de sprites de Rupert caminando.png','Rupert_ atlas de animaciones pixeladas-1.png')}
for e,(mov,acc) in ETAPAS.items():
    meta.update(sheet(mov,[f'{e}_{n}' for n in MOV],0,expect=[4,4,6,4,4],norm=tuple(f'{e}_{n}' for n in ('caminar_frente','caminar_espalda','quieto_34'))))
    meta.update(sheet(acc,[f'{e}_{n}' for n in ACC],0,expect=[3,4,4,3,2,6],norm=tuple(f'{e}_{n}' for n in ('hablar','comer','lavarse'))))
# Se conservan entradas agregadas por otros scripts (por ejemplo, e0_dormir).
previo=json.load(open(OUT+'rupert/anim.json')) if os.path.exists(OUT+'rupert/anim.json') else {}
previo.update(meta)
# En las hojas de las etapas 1 y 2, comer y lavarse están dibujados en plano corto (torso grande):
# no se usan; el juego muestra la acción con el objeto en la mano.
for k in ('e1_comer','e1_lavarse','e2_comer','e2_lavarse'):
    previo.pop(k,None)
    if os.path.exists(OUT+f'rupert/{k}.png'): os.remove(OUT+f'rupert/{k}.png')
json.dump(previo,open(OUT+'rupert/anim.json','w'),indent=1); print(sorted(previo))
