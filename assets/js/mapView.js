var mapView = function () {
  
  "use strict";
  
  this.initialise = function(geoData) {
    $('.map').show();
    $('#map').sdgMap({
      geoData: geoData
    });
  }
};
