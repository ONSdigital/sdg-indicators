# Sustainable Development Goal indicators

[![Build Status](https://travis-ci.org/ONSdigital/sdg-indicators.svg?branch=develop)](https://travis-ci.org/ONSdigital/sdg-indicators) [![LICENSE.](https://img.shields.io/badge/license-OGL--3-brightgreen.svg?style=flat)](http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)

This is a development website for collecting and disseminating UK data for the Sustainable Development Goal global indicators. This is a collaboration between the [ONS Sustainable Development Goals](https://www.ons.gov.uk/aboutus/whatwedo/programmesandprojects/sustainabledevelopmentgoals) team and the [ONS Data Science Campus](https://www.ons.gov.uk/aboutus/whatwedo/datasciencecampus), building on the earlier work of the [US GSA](https://github.com/GSA/sdg-indicators). 

For any guidance on how to use the website or develop it further for your own country, please refer to the [wiki](https://github.com/ONSdigital/sdg-indicators/wiki). Please send any comments and feedback to <a href ="mailto:sustainabledevelopment@ons.gov.uk">sustainabledevelopment@ons.gov.uk</a>.

### Divergence from Open SDG:

File|Type|Reason
----|----|-----
[_includes/components/dev-disclaimer.html](./_includes/components/dev-disclaimer.html)|Overwritten|Added 'take part' button
[_includes/footer.html](./_includes/footer.html)|Overwritten|To include OGL
[_includes/components/indicator/change-notice.html](./_includes/components/indicator/change-notice.html)|Additional|Part of 2020 work to indicate changes e.g. [1.b.1](https://sdgdata.gov.uk/1-b-1/)
[_includes/components/indicator/data-notice.html](./_includes/components/indicator/data-notice.html)|Overwritten|Style change for 2020 indicators work
[_includes/components/indicator/metadata-tabs-default.html](./_includes/components/indicator/metadata-tabs-default.html)|Overwritten|Wanted to show global metadata tab on archived indicator pages but making use of open-sdg standalone indicator page layout which doesn't show it.
[_layouts/indicator.html](./_layouts/indicator.html)|Overwritten|Show change notice (see above) component on indicator page
[_layouts/standalone-indicators.html](./_layouts/standalone-indicators.html)|Overwritten|Used standalone indicators page as basis for [archived indicators page](https://sdgdata.gov.uk/archived-indicators/) which needed quite a few changes
[_includes/components/header/header-menu-left-aligned.html](./_includes/components/header/header-menu-left-aligned.html)|Overwritten|GDS cookie consent form
[_includes/custom/](./_includes/custom/)|Additional|GDS cookies consent form and HotJar
[_includes/cookies-config.js](./_includes/cookies-config.js)|Overwritten|GDS cookies consent form and HotJar
[_includes/head-custom.html](./_includes/head-custom.html)|Additional|GDS cookie consent form
[_includes/scripts-custom.html](./_includes/scripts-custom.html)|Additional|GDS cookie consent form and Loop11
[assets/css/](./assets/css/)|Additional|GDS cookie consent form

