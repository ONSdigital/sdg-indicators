bundle update --bundler
docker build -t buildsite ./a11ytest/.
docker run --rm -v $PWD:/site buildsite