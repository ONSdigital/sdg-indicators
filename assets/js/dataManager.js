var dataManager = {

  colors: ['e5243b', '4c9f38', 'ff3a21', '26bde2', 'dd1367', 'fd9d24', '3f7e44', '00689d'],

  getFields: function(obj) {
    return _.filter(Object.keys(obj), function(key) { return ['Year', 'Value'].indexOf(key) === -1; });
  },

  allNull: function(obj, fields) {
    for(var loop = 0; loop < fields.length; loop++) {
      if(obj[fields[loop]])
        return false;
    }
    return true;
  },

  onlyPropertySet: function(obj, allFields, property) {
    for(var loop = 0; loop < allFields.length; loop++) {
      if(allFields[loop] === property && !obj[allFields[loop]]) {
        return false;	// has to have a value
      } else if(allFields[loop] !== property && obj[allFields[loop]]) {
        return false;	// has to have no value set
      }
    }
    return true;
  },

  getChartInfo: function(data, field, datasetObject) {

    var datasets = [];
    var fields = this.getFields(data[0]);
    var that = this;
    var seriesData;
    var years;


/*
    [null].concat(fields).forEach(function(field, index) {

      seriesData = _.chain(data)
                .filter(function(i) { return field ? that.onlyPropertySet(i, fields, field) : that.allNull(i, fields); })
                .sortBy(function(i) { return i.Year; })
                .value();

      if(!index) {
        years = _.pluck(seriesData, 'Year');
      }

      datasets.push(
          _.extend({
            label: field ? field : 'Overall',
            backgroundColor: '#' + that.colors[index],
            borderColor: '#' + that.colors[index],
            data: _.pluck(seriesData, 'Value'),
            borderWidth: 1
          }, datasetObject));
    });
*/

      seriesData = _.chain(data)
                .filter(function(i) { return field ? that.onlyPropertySet(i, fields, field) : that.allNull(i, fields); })
                .sortBy(function(i) { return i.Year; })
                .value();

      years = _.pluck(seriesData, 'Year');

      datasets.push(
          _.extend({
            label: field ? field : 'Overall',
            backgroundColor: '#' + that.colors[0],
            borderColor: '#' + that.colors[0],
            data: _.pluck(seriesData, 'Value'),
            borderWidth: 1
          }, datasetObject));

    return {
      datasets: datasets,
      labels: years
    };
  },

  getSeriesLabels: function(data) {
    return this.getFields(data[0]);
  }
};

