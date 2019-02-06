#!/bin/bash

echo "TRAVIS_BRANCH = " $TRAVIS_BRANCH
echo "TRAVIS_PULL_REQUEST = " $TRAVIS_PULL_REQUEST
echo "TRAVIS_PULL_REQUEST_BRANCH = " $TRAVIS_PULL_REQUEST_BRANCH


# Instead of seperate prods just update variables that differ
if [ "$TRAVIS_BRANCH" = "master" ]; then
  jekyll build --config _config_prod.yml &&
  htmlproofer --disable-external ./_site
else

  if [ "$TRAVIS_PULL_REQUEST" = "true" ]; then
    BASEURL=$TRAVIS_PULL_REQUEST_BRANCH
    # slugify
    BASEURL=$(echo "$BASEURL" | iconv -t ascii//TRANSLIT | sed -r s/[^a-zA-Z0-9]+/-/g | sed -r s/^-+\|-+$//g | tr A-Z a-z)
    sed -i 's|/sdg-indicators|/'$BASEURL'|g' _config.yml
  else
    BASEURL="sdg-indicators"
  fi
  
  jekyll build --config _config.yml &&
  # The following is because htmlproofer doesn't like the /sdg-indicators baseurl
  mkdir -p ./_test/$BASEURL &&
  cp -r ./_site/* ./_test/$BASEURL/ &&
  touch ./_test/index.html &&
  htmlproofer --disable-external ./_test &&
  rm -rf ./_test
fi

