#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

echo "TRAVIS_BRANCH = " $TRAVIS_BRANCH

echo "TRAVIS_TAG = " $TRAVIS_TAG

# Pull requests and commits to other branches shouldn't try to deploy, just build to verify
#if [ "$TRAVIS_PULL_REQUEST" != "false" -o "$TRAVIS_BRANCH" != "$SOURCE_BRANCH" ]; then
#    echo "Skipping deploy; just doing a build."
#    exit 0
#fi

# Keys
openssl aes-256-cbc -K $encrypted_6a5f295aa62e_key -iv $encrypted_6a5f295aa62e_iv -in scripts/deploy/keys.tar.enc -out scripts/deploy/keys.tar -d
tar xvf scripts/deploy/keys.tar -C scripts/deploy/
rm scripts/deploy/keys.tar

chmod 600 ./scripts/deploy/deploy_key_test
eval `ssh-agent -s`
ssh-add scripts/deploy/deploy_key_test
rm scripts/deploy/deploy_key*

# Make a safe directory name (slugify)
BASEURL=$(echo "$TRAVIS_BRANCH" | iconv -t ascii//TRANSLIT | sed -r s/[^a-zA-Z0-9]+/-/g | sed -r s/^-+\|-+$//g | tr A-Z a-z)
echo "Directory on test server = " $BASEURL

# Push the files over, removing anything existing already.
ssh -oStrictHostKeyChecking=no $TEST_USER_SERVER "rm -rf ~/www/$BASEURL || true"
scp -oStrictHostKeyChecking=no -r _site $TEST_USER_SERVER:~/www/$BASEURL
