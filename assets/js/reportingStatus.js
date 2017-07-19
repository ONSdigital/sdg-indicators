var reportingStatus = function(indicatorDataStore) {
  this.indicatorDataStore = indicatorDataStore;

  this.indicatorDataStore.getData().then(function(data) {
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

    console.log('info: ', mappedData);
  });
};

$(function() {
  if($('.container').hasClass('reportingstatus')) {
    var url = $('.container.reportingstatus').attr('data-url'),
        status = new reportingStatus(new indicatorDataStore(url));
  }
});