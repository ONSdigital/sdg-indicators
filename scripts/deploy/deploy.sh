#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

SOURCE_BRANCH="master"
TARGET_BRANCH="master"


# Pull requests and commits to other branches shouldn't try to deploy, just build to verify
if [ "$TRAVIS_PULL_REQUEST" != "false" -o "$TRAVIS_BRANCH" != "$SOURCE_BRANCH" ]; then
    echo "Skipping deploy; just doing a build."
    exit 0
fi

openssl aes-256-cbc -K $encrypted_22f1d25dd78b_key -iv $encrypted_22f1d25dd78b_iv -in scripts/deploy/deploy_key.enc -out scripts/deploy/deploy_key -d

echo "TRAVIS_TAG = " $TRAVIS_TAG

# Save some useful information
SHA=`git rev-parse --verify --short HEAD`

# Clone the existing gh-pages for this repo into out/
# Create a new empty branch if gh-pages doesn't exist yet (should only happen on first deply)

chmod 600 ./scripts/deploy/deploy_key
eval `ssh-agent -s`
ssh-add scripts/deploy/deploy_key

git clone $TARGET_REPO out
cd out
git checkout $TARGET_BRANCH || git checkout --orphan $TARGET_BRANCH
cd ..

# Overwrite contents with _site
rm -rf out/**/* || exit 0
cp -r _site/* out/

# Now let's go have some fun with the cloned repo
cd out
git config user.name "Travis CI"
git config user.email "$COMMIT_AUTHOR_EMAIL"
# Be careful with that key!
echo "*deploy_key*" >> .gitignore
echo "scripts/*" >> .gitignore

# If there are no changes to the compiled out (e.g. this is a README update) then just bail.
if git diff --quiet; then
    echo "No changes to the output on this push; exiting."
    exit 0
fi

# Commit the "changes", i.e. the new version.
# The delta will show diffs between new and old versions.
git add -A .
git commit -m "Deploy ${SHA} from branch ${TRAVIS_BRANCH}"

# Now that we're all set up, we can push.
git push $TARGET_REPO $TARGET_BRANCH
