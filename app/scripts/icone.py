# LE ICONE DELL'APP, dal logo originale (1/11/2026).
#
#   python3 scripts/icone.py            (da app/, scrive in public/)
#
# · Home di iPhone e Android: il logo INTERO (`apple-touch-icon.png` 180,
#   `icon-192.png`, `icon-512.png`, lette da `manifest.webmanifest`);
# · scheda del browser: SOLO LA B (`favicon-32/64.png`, `favicon.ico`), perché a
#   16-32 px la scritta «BetterTrade» diventa una riga illeggibile.
# ⚠️ Il ritaglio della B è fatto su `grafica/logo.png` (1254×1254): con un logo
#   nuovo va rimisurato, e il risultato va guardato prima di committare.
from PIL import Image

im = Image.open('grafica/logo.png').convert('RGB')
for nome, lato in [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)]:
    im.resize((lato, lato), Image.LANCZOS).save('public/' + nome, optimize=True)
b = im.crop((270, 170, 910, 810))
for nome, lato in [('favicon-32.png', 32), ('favicon-64.png', 64)]:
    b.resize((lato, lato), Image.LANCZOS).save('public/' + nome, optimize=True)
b.resize((48, 48), Image.LANCZOS).save('public/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
print('icone scritte in public/')
