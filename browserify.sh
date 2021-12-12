#!/bin/sh

set -ex

JS=docs/js

webpack-cli ./lib/index.js --mode development -o $JS
mv $JS/main.js $JS/refute.js

webpack-cli ./lib/index.js --mode production -o $JS
mv $JS/main.js $JS/refute.min.js

