# docker build -t buildsite ./a11ytest/.
# docker run --rm -v $PWD:/site buildsite
# docker run --rm \
#     -p 80:80 \
#     -v $PWD/_site:/usr/local/apache2/htdocs/sdg-indicators \
#     --name jekyllbuildserver \
#     httpd:2.4.41-alpine

npm install -g pa11y-ci