---
title: FAQ
permalink: /faq/
layout: page
---

## How do I suggest new or different data sources?
If you have feedback on the data sources we have used or have suggestions for new data sources then please email us at <a href="mailto:SustainableDevelopment@ons.gov.uk">SustainableDevelopment@ons.gov.uk</a>.

## What does the reporting status mean?
We have used three different types of reporting status for an indicator, which are also colour coded:

* Reported online (green) – as a minimum the headline national data for this indicator is available on this website but the data might not be fully disaggregated yet. We are continuing to source additional disaggregations.
* Statistics in progress (amber) – we have found a suitable source of data for this indicator or relevant proxy at national level. We are currently quality assuring the data and preparing it for publication.
* Exploring data sources (red) – we are still looking for a suitable data source for this indicator.

Where there is additional information about the status of indicator data collection and reporting, this will be displayed at the top of the indicator page.

## How often will new data be added to this site?
We will add data as soon as it has been sourced and checked. This includes new data as well as updates to data we have already published. We will continue to collect data from existing sources where possible, in cooperation with topic experts.

## What are you doing to fill data gaps?
For some indicators, although we may have data at the national level, our existing data sources don’t always allow us to disaggregate by all main groups. 

This means we need to look for new data sources, linking existing ones, or model data. We are working with colleagues across the Government Statistical Service to do this, including the Data Science Campus.

We asked for feedback on how we should prioritise data development for gaps in our [consultation on measuring and reporting SDGs in the UK](https://consultations.ons.gov.uk/sustainable-development-goals/ons-approach-to-measuring-reporting-sdgs-in-the-uk/). We are currently analysing consultation responses and will publish our findings in December 2017. 

## How accessible is this website?
Our aim is to make this website as accessible and usable as possible for every user. We are working towards meeting AA level of the [Web Content Accessibility Guidelines (WCAG 2.0)](https://www.gov.uk/service-manual/helping-people-to-use-your-service/understanding-wcag-20). We have recently undertaken an accessibility audit by the [Digital Accessibility Centre](http://digitalaccessibilitycentre.org/) and are using the recommendations from this review to help us improve our website.

## What browsers can I use to view this website?
We are developing and testing our site in line with the Government Digital Service (GDS) [guidance on designing for different browsers and devices](https://www.gov.uk/service-manual/technology/designing-for-different-browsers-and-devices). Our website works with most of the latest versions of the commonly used browsers listed in the ‘Browsers to test in’ section of the GDS guidance. There are some issues with using the site on older versions of browsers eg IE8 and we are working to fix these.

## Can other countries copy this website?
Yes. We have deliberately developed an open source solution for reporting UK SDGs data so other countries can freely reuse our code. Technical guidance on copying our site is available in our [wiki](https://github.com/datasciencecampus/sdg-indicators/wiki). Countries exploring how to report their own SDGs national data can also get support from the [Center for Open Data Enterprise (CODE)](http://www.opendataenterprise.org/) through their [SDG National Reporting Initiative](https://www.sdgreporting.org/).

<!-- DO NOT REMOVE ANYTHING BELOW THIS LINE -->
<script type='text/javascript'>
document.addEventListener("DOMContentLoaded", function () {
  $('#main-content h2').addClass('roleHeader');
 	$('#main-content h2').attr({
 	  'tabindex': 0,
 	  'role': 'button'
 	});
 	$('.roleHeader').click(function () {
 	  $(this).nextUntil('h2').stop(true, true).slideToggle();
	 }).nextUntil('h2').hide();
	 $('.roleHeader').keypress(function (e) {
 	  if (e.which == 13 || e.which == 32) { //Enter or space key pressed
			   $(this).trigger('click');
		  }
	 });
})
 </script>
