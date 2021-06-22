var manager = klaro.getManager(),
    consents = manager.loadConsents(),
    $cookieNotice = $('#cookie-notice'),
    $cookieForm = $('.cookie-form'),
    $confirmationAccept = $('#cookie-notice-accept'),
    $confirmationReject = $('#cookie-notice-reject');

if (!manager.confirmed) {
  $cookieNotice.show();
  $('#cookie-accept').click(function() {
    if (typeof consents['google-analytics'] !== 'undefined') {
      consents['google-analytics'] = true;
    }
    manager.saveAndApplyConsents();
    $cookieNotice.hide();
    $confirmationAccept.show();
  });
  $('#cookie-reject').click(function() {
    if (typeof consents['google-analytics'] !== 'undefined') {
      consents['google-analytics'] = false;
    }
    manager.saveAndApplyConsents();
    $cookieNotice.hide();
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

if ($cookieForm.length > 0) {
  var $cookieFormSubmit = $('#cookie-form-submit-button'),
      $cookieFormElement = $cookieForm.find('form'),
      $analyticsYes = $('#analytics-cookies'),
      saveCookieSettings = function(e) {
        e.preventDefault();
        if (typeof consents['google-analytics'] !== 'undefined') {
          consents['google-analytics'] = Boolean($analyticsYes.prop('checked'));
        }
        manager.saveAndApplyConsents();
        alert('Confirmation message TBD');
      };

  // Set pre-selected options.
  if (typeof consents['google-analytics'] !== 'undefined') {
    $analyticsYes.prop('checked', Boolean(consents['google-analytics']));
  }

  $cookieFormSubmit.click(saveCookieSettings);
  $cookieFormElement.submit(saveCookieSettings);
}
