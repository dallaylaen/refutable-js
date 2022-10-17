#!/bin/sh

set -eux

SRC=./lib/web-index.js
DST=docs/js

webpack-cli "$SRC" --mode development -o "$DST"
mv -f "$DST"/main.js "$DST"/refute.js

webpack-cli "$SRC" --mode production -o "$DST"
mv -f "$DST"/main.js "$DST"/refute.min.js

