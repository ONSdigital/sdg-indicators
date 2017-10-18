#!/bin/bash

# Pre-processing
python3 scripts/build/edge_detect.py || exit 1
python3 scripts/build/headlines.py || exit 1

# Instead of seperate prods just update variables that differ
cat _config.yml | sed 's/^baseurl: .*$/baseurl: ""/' > _config_prod.yml
jekyll build --config _config_prod.yml
htmlproofer --disable-external ./_site
