var indicatorSearch = function() {
  that = this;
  this.element = $('#indicator_search');
  this.dataUrl = this.element.data('url');
  this.indicatorData = [];
  this.hasErrored = false;

  this.processData = function(data) {
    for(var goalLoop = 0; goalLoop < data.length; goalLoop++) {
      for(var indicatorLoop = 0; indicatorLoop < data[goalLoop].goal.indicators.length; indicatorLoop++) {
        var currentIndicator = data[goalLoop].goal.indicators[indicatorLoop];
        currentIndicator.goalId = data[goalLoop].id;
        currentIndicator.goalTitle = data[goalLoop].title;
        that.indicatorData.push(currentIndicator);
      }
    }
  };

  $.getJSON(this.dataUrl, function(data) {
    that.processData(data);
  }).fail(function(err) {
    that.hasErrored = true;
    console.error(err);
  });
};

indicatorSearch.prototype = {

};

$(function() {
  new indicatorSearch();
});

