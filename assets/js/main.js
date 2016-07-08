$( document ).ready(function() {
 
  $(window).scroll(function() {
    if ($(document).scrollTop() > 50) {
      $('header').addClass('smaller');
    } else {
      $('header').removeClass('smaller');
    }
  });

  var nav = responsiveNav(".nav-collapse", {animate: false});

});