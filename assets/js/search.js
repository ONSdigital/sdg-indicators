var indicatorSearch = function() {
  that = this;
  this.inputElement = $('#indicator_search');
  this.dataUrl = this.inputElement.data('url');
  this.indicatorData = [];
  this.hasErrored = false;

  this.processData = function(data) {
    for(var goalLoop = 0; goalLoop < data.length; goalLoop++) {
      for(var indicatorLoop = 0; indicatorLoop < data[goalLoop].goal.indicators.length; indicatorLoop++) {
        var currentIndicator = data[goalLoop].goal.indicators[indicatorLoop];
        currentIndicator.goalId = data[goalLoop].goal.id;
        currentIndicator.goalTitle = data[goalLoop].goal.title;
        that.indicatorData.push(currentIndicator);
      }
    }
  };

  this.doSearch = function(searchText) {
    console.log('searching on ', searchText);
  };

  $.getJSON(this.dataUrl, function(data) {
    that.processData(data);
  }).fail(function(err) {
    that.hasErrored = true;
    console.error(err);
  });

  this.inputElement.keyup(function() {

    var searchValue = that.inputElement.val();

    var searchResults = _.filter(that.indicatorData, function(indicator) {
      return indicator.title.indexOf(searchValue) != -1;
    });
    
    var results = [];
    _.each(searchResults, function(result) {
      results.push({
        parsedTitle: result.title.replace(new RegExp('(' + searchValue + ')', 'gi'), '<span class="match">$1</span>'),
        id: result.id,
        title: result.title,
        href: result.href,
        goalId: result.goalId,
        goalTitle: result.goalTitle
      });
    });

    //console.log(results);
  });
};

indicatorSearch.prototype = {

};

$(function() {
  new indicatorSearch();
});

