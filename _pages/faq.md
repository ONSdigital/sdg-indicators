---
title: FAQ
permalink: /faq/
layout: page
---

## How do I suggest new or different data sources?

If you have feedback on the data sources we have used or have suggestions for new data sources then please email us at <a href="mailto:SustainableDevelopment@ons.gov.uk">SustainableDevelopment@ons.gov.uk</a>.

## What does the reporting status mean?

There are currently three different types of reporting status for an indicator:

* Reported online – this means as a minimum the headline national data for this indicator is available on this website. For some indicators not all disaggregated data will be available yet.
* Statistics in progress – we have found a suitable source of data for this indicator or relevant proxy at national level. We are currently quality assuring the data and preparing it for publication.
* Exploring data sources – we are still looking for a suitable data source for this indicator.

## How accessible is this website?
Our aim is to make this website as accessible and usable as possible for every user. We are working towards meeting AA level of the [Web Content Accessibility Guidelines (WCAG 2.0)](https://www.gov.uk/service-manual/helping-people-to-use-your-service/understanding-wcag-20). We have recently undertaken an accessibility audit by the [Digital Accessibility Centre](http://digitalaccessibilitycentre.org/) and are using the recommendations from this review to help us improve our website.

## What browsers can I use to view this website?
We are developing and testing our site in line with the Government Digital Service (GDS) [guidance on designing for different browsers and devices](https://www.gov.uk/service-manual/technology/designing-for-different-browsers-and-devices). Our website works well with the majority of the latest versions of the commonly used browsers listed in the ‘Browsers to test in’ section of the GDS guidance. There are currently some issues when using older versions of browsers eg IE8 and we are working to improve this.

## Can other countries copy this website?
Yes. We have deliberately developed an open source solution to reporting UK SDGs data and so other countries can freely reuse our code. Technical guidance on copying our site is available in our [wiki](https://github.com/datasciencecampus/sdg-indicators/wiki). Countries exploring how to report their own SDGs national data can also get support from the [Center for Open Data Enterprise (CODE)](http://www.opendataenterprise.org/) through their [SDG National Reporting Initiative](https://www.sdgreporting.org/).

<!-- DO NOT EDIT ANYTHING BELOW THIS LINE -->
<script>
	document.addEventListener("DOMContentLoaded", function(){
  	$('#main-content h2').addClass('collapsible');
		$('.collapsible').click(function(){
			$(this).nextUntil('h2').stop(true, true).slideToggle();
		}).nextUntil('h2').hide();
	})
</script>
<style>
	h3.collapsible { cursor: pointer }
</style>
