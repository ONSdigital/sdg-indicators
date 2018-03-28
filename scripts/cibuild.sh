#!/bin/bash

# On Windows I can't map python3 to python
if [[ $(uname) = *"_NT"* ]]; then
  PY=python
else
  PY=python3
fi

# Pre-processing
$PY scripts/build_edges.py || exit 1
$PY scripts/build_headlines.py || exit 1
$PY scripts/build_json.py || exit 1
#$PY scripts/build_metadata.py || exit 1

# Instead of seperate prods just update variables that differ
if [ "$TRAVIS_BRANCH" = "master" ]; then
  jekyll build --config _config_prod.yml &&
  htmlproofer --disable-external ./_site
else
  jekyll build --config _config.yml &&
  # The following is because htmlproofer doesn't like the /sdg-indicators baseurl
  mkdir -p ./_test/sdg-indicators &&
  cp -r ./_site/* ./_test/sdg-indicators/ &&
  touch ./_test/index.html &&
  htmlproofer --disable-external ./_test &&
  rm -rf ./_test
fi


