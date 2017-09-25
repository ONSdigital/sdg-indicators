#!/bin/bash

# Instead of seperate prods just update variables that differ
cat _config.yml | sed 's/^baseurl: .*$/baseurl: ""/' > _config_prod.yml
jekyll build --config _config_prod.yml
htmlproofer --disable-external ./_site
