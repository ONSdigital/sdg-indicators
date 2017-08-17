var reportingStatus = function(indicatorDataStore) {
  this.indicatorDataStore = indicatorDataStore;

  this.getReportingStatus = function() {

    var that = this;

    return new Promise(function(resolve, reject) {

      // if(Modernizr.localStorage &&) {

      // }

      that.indicatorDataStore.getData().then(function(data) {
        // for each goal, get a percentage of indicators in the various states:
        // notstarted, inprogress, complete
        var mappedData = _.map(data, function(dataItem) {
          return {
            goal_id: dataItem.goal.id,
            notStartedCount: _.where(dataItem.goal.indicators, { status: 'notstarted' }).length,
            inProgressCount: _.where(dataItem.goal.indicators, { status: 'inprogress' }).length,
            completeCount: _.where(dataItem.goal.indicators, { status: 'complete' }).length
          };
        });    

        resolve(mappedData);
      });     
    });

  };
};

$(function() {

  if($('.container').hasClass('reportingstatus')) {
    var url = $('.container.reportingstatus').attr('data-url'),
        status = new reportingStatus(new indicatorDataStore(url));

    status.getReportingStatus().then(function(data) {
      // loop through each data item, using its goal_id property:

      var selector, percentage, types = ['Exploring data sources', 'Statistics in progress', 'Reported online'];

      // 
      _.each(data, function(goal) {
        
        var el = $('.goal[data-goalid="' + goal.goal_id + '"]');

        //console.log(el);
        
        var total = goal.notStartedCount + goal.inProgressCount + goal.completeCount;
        var counts = [goal.notStartedCount, goal.inProgressCount, goal.completeCount];

        $(el).find('.goal-stats span').each(function(index, statEl) {

          var percentage = Math.round(Number(((counts[index] / total) * 100))) + '%'
          //console.log(percentage);
          
          $(statEl).attr({
            'style': 'width:' + percentage,
            'title': types[index] + ': ' + percentage
          });

          $(el).find('span.value:eq(' + index + ')').text(percentage);

        });        
      });

      // animation:
      if($('#main-content').hasClass('reportingstatus')) {
        setTimeout(function() {

          var width = $('.reportingstatus').width();

          $('#main-content').find('.statuses, .divider, h3').slideDown(function() {
            $('.frame').animate({ 'width' : '110px', duration: 1500, queue: false }, function() {
              $('.goal img').fadeIn(1500, function() {
                $('.goal').animate({ borderTopColor: '#ddd', borderLeftColor: '#ddd', borderRightColor: '#ddd', borderBottomColor: '#ddd' }, 500);
              });
            });

            $('.details').animate({ 'width' : width - 130 + 'px', duration: 1500, queue: false });
          });

        }, 1200);
      }
    });

  }
});