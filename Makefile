install:
	npm install
	bundle install
	cp -r node_modules/govuk-frontend/govuk/assets/images assets/
	cp -r node_modules/govuk-frontend/govuk/assets/fonts assets/
	cp node_modules/govuk-frontend/govuk/all.js assets/js/govuk.js

build.staging:
	sass assets/css/govuk_staging.scss assets/css/govuk.css
	bundle exec jekyll build

build.production:
	sass assets/css/govuk_production.scss assets/css/govuk.css
	bundle exec jekyll build --config _config.yml,_config_prod.yml

serve: build.staging
	bundle exec jekyll serve --skip-initial-build
