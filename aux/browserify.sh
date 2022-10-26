#!/bin/sh

set -eux

SRC=./lib/web-index.js
DST=docs/js

browserify "$SRC" -d -o "$DST"/refute.js

browserify "$SRC" -p tinyify -o "$DST"/refute.min.js

