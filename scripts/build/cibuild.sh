#!/bin/bash

# Pre-processing
python3 scripts/build/edge_detect.py || exit 1
python3 scripts/build/headlines.py || exit 1

# Instead of seperate prods just update variables that differ
if [ "$TRAVIS_BRANCH" = "master" ]; then
  cat _config.yml | sed 's/^baseurl: .*$/baseurl: ""/' > _config_prod.yml &&
  jekyll build --config _config_prod.yml &&
  htmlproofer --disable-external ./_site
else
  jekyll build --config _config.yml &&
  mkdir -p ./test/sdg-indicators &&
  cp -r ./_site/* ./test/sdg-indicators/ &&
  touch ./test/index.html &&
  htmlproofer --disable-external ./test &&
  rm -rf ./test
fi


