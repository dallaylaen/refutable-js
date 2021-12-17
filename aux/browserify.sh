#!/bin/sh

set -ex

SRC=./lib/web-index.js
DST=docs/js

webpack-cli "$SRC" --mode development -o "$DST"
mv "$DST"/main.js "$DST"/refute.js

webpack-cli "$SRC" --mode production -o "$DST"
mv "$DST"/main.js "$DST"/refute.min.js

