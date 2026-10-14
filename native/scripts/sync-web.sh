#!/bin/sh
# web uygulamasını (repo kökü) native/www içine kopyalar
set -e
cd "$(dirname "$0")/.."
rm -rf www && mkdir -p www
cp ../index.html ../manifest.webmanifest www/
cp -R ../icons ../packs www/
echo "www hazır: $(ls www | tr '\n' ' ')"
