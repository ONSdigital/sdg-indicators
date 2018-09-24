#!/bin/bash

# Instead of seperate prods just update variables that differ
#if [ "$TRAVIS_BRANCH" = "master" ]; then
#  jekyll build --config _config_prod.yml &&
#  htmlproofer --disable-external ./_site
#else
  jekyll build --config _config.yml &&
  # The following is because htmlproofer doesn't like the /sdg-indicators baseurl
  mkdir -p ./_test/sdg-indicators &&
  cp -r ./_site/* ./_test/sdg-indicators/ &&
  touch ./_test/index.html &&
  htmlproofer --disable-external ./_test &&
  rm -rf ./_test
fi

