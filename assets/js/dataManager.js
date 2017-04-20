function dataManager(data, datasetObject) {

  var colors = ['e5243b', '4c9f38', 'ff3a21', '26bde2', 'dd1367', 'fd9d24', '3f7e44', '00689d'];
  var that = this;
  this.data = data;
  this.datasetObject = datasetObject;

  this.getSelectableFields = function(obj) {
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

  this.getData = function(fields) {

    var datasets = [],
        selectableFields = this.getSelectableFields(this.data[0]),
        that = this,
        seriesData = [],
        tableData = [],
        years = _.chain(this.data).pluck('Year').uniq().sortBy(function(d) { return d.Year; }).value(),
        allFunc = function() {
          return _.chain(this.data)
            .filter(function(i) { return that.allNull(i, selectableFields); })
            .sortBy(function(i) { return i.Year; })
            .map(function(d) { return _.pick(d, _.identity); })
            .value();
        },
        datasetIndex = 0,
        convertToDataset = function(data, field, fieldValue) {
          var ds = _.extend({
            label: field && fieldValue ? field + ' ' + fieldValue : 'All',
            backgroundColor: '#' + colors[datasetIndex],
            borderColor: '#' + colors[datasetIndex],
            borderDash: [10, 5],
            //pointHoverBackgroundColor: colors[datasetIndex],
            //pointHoverBorderColor: colors[datasetIndex],
            data: _.pluck(data, 'Value'),
            borderWidth: 1
          }, this.datasetObject);
          datasetIndex++;
          return ds;
        };

    if(fields && !_.isArray(fields)) {
      fields = [].concat(fields);
    }

    // use all:
    datasets.push(convertToDataset(allFunc()));
    tableData.push({
      title: 'Overall',
      headings: ['Year', 'Value'],
      data: allFunc()
    });

    // with optional fields:
    if(_.isArray(fields)) {
      fields.forEach(function(field) {
        var data =
          _.chain(this.data)
            .filter(function(i) { return that.onlyPropertySet(i, selectableFields, field); })
            .sortBy(function(i) { return i.Year; })
            .map(function(d) { return _.pick(d, _.identity); })
            .value();

        // table data:
        tableData.push({
          title: 'Breakdown by ' + field,
          headings: Object.keys(data[0]),
          data: data
        });

        // breakdown by that field's individual series:
        _.chain(data).pluck(field).uniq().value()
          .forEach(function(value, index) {
            datasets.push(convertToDataset(
              _.chain(data)
                .filter(function(d) { return d[field] === value; })
                .sortBy(function(d) { return d.Year; }).value(),
              field,
              value
            ));
        });
      });
    }

    return {
      datasets: datasets,
      labels: years,
      tables: tableData
    };
  };

  this.getSeriesLabels = function(data) {
    return this.getSelectableFields(data[0]);
  };
}

