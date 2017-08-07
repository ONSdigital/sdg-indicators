var indicatorDataStore = function(dataUrl) {
  this.dataUrl = dataUrl;

  this.getData = function() {
    that = this;
    return new Promise(function(resolve, reject) {

      // if(Modernizr.localStorage &&) {

      // }

      $.getJSON(that.dataUrl, function(data) {
        resolve(data);
      }).fail(function(err) {
        reject(Error(err));
      });      
    });
  };

};