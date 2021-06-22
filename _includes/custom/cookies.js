var manager = klaro.getManager(),
    consents = manager.loadConsents(),
    $cookieBanner = $('#cookie-banner'),
    $confirmationAccept = $('#cookie-banner-accept'),
    $confirmationReject = $('#cookie-banner-reject'),
    $cookiePageSubmit = $('#cookie-page-submit');

if (!manager.confirmed) {
  $cookieBanner.show();
  $('#cookie-accept').click(function() {
    if (typeof consents['google-analytics'] !== 'undefined') {
      consents['google-analytics'] = true;
    }
    if (typeof consents['hotjar'] !== 'undefined') {
      consents['hotjar'] = true;
    }
    manager.saveAndApplyConsents();
    $cookieBanner.hide();
    $confirmationAccept.show();
  });
  $('#cookie-reject').click(function() {
    if (typeof consents['google-analytics'] !== 'undefined') {
      consents['google-analytics'] = false;
    }
    if (typeof consents['hotjar'] !== 'undefined') {
      consents['hotjar'] = false;
    }
    manager.saveAndApplyConsents();
    $cookieBanner.hide();
    $confirmationReject.show();
  });
  $('#hide-accept').click(function(e) {
    e.preventDefault();
    $confirmationAccept.hide();
  });
  $('#hide-reject').click(function(e) {
    e.preventDefault();
    $confirmationReject.hide();
  });
}

if ($cookiePageSubmit.length > 0) {
  var $analyticsYes = $('#analytics-cookies'),
      $cookiePageSuccess = $('#cookie-page-success'),
      $cookiePageGoBack = $('#cookie-page-go-back'),
      saveCookieSettings = function(e) {
        e.preventDefault();
        var choice = Boolean($analyticsYes.prop('checked'));
        if (typeof consents['google-analytics'] !== 'undefined') {
          consents['google-analytics'] = choice;
        }
        if (typeof consents['hotjar'] !== 'undefined') {
          consents['hotjar'] = choice;
        }
        manager.saveAndApplyConsents();
        $cookiePageSuccess.show();
        $([document.documentElement, document.body]).animate({
          scrollTop: $cookiePageSuccess.offset().top
        }, 500, 'swing', function() { $cookiePageGoBack.focus(); });
      };

  // Set pre-selected options.
  if (typeof consents['google-analytics'] !== 'undefined' || typeof consents['hotjar'] !== 'undefined') {
    var preselected = Boolean(consents['google-analytics']) || Boolean(consents['hotjar']);
    $analyticsYes.prop('checked', preselected);
  }

  $cookiePageSubmit.click(saveCookieSettings);

  // For semantics and accessibility, wrap the page in a form and add
  // a submit handler.
  $('#main-content > div').first().wrap('<form id="cookie-page-form" novalidate></form>');
  $('#cookie-page-form').submit(saveCookieSettings);

  // Go back behavior.
  $cookiePageGoBack.click(function(e) {
    e.preventDefault();
    window.history.back();
  });
}
