function dataManager(data, datasetObject) {

  var colors = ['e5243b', '4c9f38', 'ff3a21', '26bde2', 'dd1367', 'fd9d24', '3f7e44', '00689d'];
  var that = this;
  this.data = data;
  this.datasetObject = datasetObject;

  this.getFields = function(obj) {
    return _.filter(Object.keys(obj), function(key) { return ['Year', 'Value'].indexOf(key) === -1; });
  };

  this.allNull = function(obj, fields) {
    for(var loop = 0; loop < fields.length; loop++) {
      if(obj[fields[loop]])
        return false;
    }
    return true;
  };

  this.onlyPropertySet =function(obj, allFields, property) {
    for(var loop = 0; loop < allFields.length; loop++) {
      if(allFields[loop] === property && !obj[allFields[loop]]) {
        return false;	// has to have a value
      } else if(allFields[loop] !== property && obj[allFields[loop]]) {
        return false;	// has to have no value set
      }
    }
    return true;
  };

  this.getChartInfo = function(field) {

    var datasets = [];
    var fields = this.getFields(this.data[0]);
    var that = this;
    var seriesData = [];
    var years;

    // use all:
    seriesData.push(
      _.chain(this.data)
        .filter(function(i) { return that.allNull(i, fields); })
        .sortBy(function(i) { return i.Year; })
        .value()
    );

    // with optional field:
    if(field) {
      var data =
        _.chain(this.data)
          .filter(function(i) { return that.onlyPropertySet(i, fields, field); })
          .sortBy(function(i) { return i.Year; })
          .value();

      // breakdown by that field's individual series:
      _.chain(data).pluck(field).uniq().value()
        .forEach(function(value, index) {
          seriesData.push(
            _.chain(data).filter(function(d) { return d[field] == value; }).sortBy(function(d) { return d.Year; }).value()
          );
        });
    }

    _.forEach(seriesData, function(d, index) {
      console.log('d: ', d);
      datasets.push(_.extend({
            label: d[0][field] ? d[0][field] : 'All',
            backgroundColor: '#' + colors[index],
            borderColor: '#' + colors[index],
            data: _.pluck(d, 'Value'),
            borderWidth: 1
          }, this.datasetObject));
    });

    years = _.pluck(seriesData[0], 'Year');

    return {
      datasets: datasets,
      labels: years
    };
  };

  this.getSeriesLabels = function(data) {
    return this.getFields(data[0]);
  };
}

