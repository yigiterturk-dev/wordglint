#!/bin/sh
# web uygulamasını (repo kökü) native/www içine kopyalar
set -e
cd "$(dirname "$0")/.."
rm -rf www && mkdir -p www
cp ../index.html ../manifest.webmanifest www/
cp -R ../icons ../packs www/
# Google Fonts yerine gömülü font: uygulama hiçbir dış sunucuya istek atmasın (App Store "Data Not Collected")
cp -R fonts www/fonts
python3 - <<'PY'
import re
p='www/index.html'; s=open(p).read()
s,n=re.subn(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\n<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\n<link href="https://fonts\.googleapis\.com/css2[^"]*" rel="stylesheet">','<link href="fonts/fonts.css" rel="stylesheet">',s)
assert n==1, "Google Fonts satırları bulunamadı"
assert "googleapis" not in s and "gstatic" not in s
open(p,'w').write(s)
PY
echo "www hazır: $(ls www | tr '\n' ' ')"
