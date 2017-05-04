var indicatorModel = function(data) {

  var that = this;
  this.data = data;
  this.selectedFields = [];

  this.onDataComplete = new event(this);
  this.onSeriesComplete = new event(this);
  this.onSeriesSelectedChanged = new event(this);

  this.datasetObject = {
    fill: false,
    lineTension: 0.1,
    borderCapStyle: 'butt',
    borderDash: [],
    borderDashOffset: 0.0,
    borderJoinStyle: 'miter',
    pointBorderColor: 'rgba(75,192,192,1)',
    pointBackgroundColor: '',
    pointBorderWidth: 1,
    pointHoverRadius: 5,
    //pointHoverBackgroundColor: 'rgba(0,0,0,1)',
    //pointHoverBorderColor: 'rgba(0,0,0,1)',
    pointHoverBorderWidth: 2,
    pointRadius: 5,
    pointHitRadius: 10,
    spanGaps: false
  };

  var colors = ['e5243b', '4c9f38', 'ff3a21', '26bde2', 'dd1367', 'fd9d24', '3f7e44', '00689d'];

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

  this.onlyPropertySet = function(obj, allFields, property) {
    for(var loop = 0; loop < allFields.length; loop++) {
      if(allFields[loop] === property && !obj[allFields[loop]]) {
        return false;	// has to have a value
      } else if(allFields[loop] !== property && obj[allFields[loop]]) {
        return false;	// has to have no value set
      }
    }
    return true;
  };

  this.updateSelectedFields = function(fields) {
    this.selectedFields = fields;
    this.getData();
  };

  this.getData = function(initial) {

    var fields = this.selectedFields,
        datasets = [],
        selectableFields = this.getSelectableFields(this.data[0]),
        that = this,
        seriesData = [],
        tableData = [],
        years = _.chain(this.data).pluck('Year').uniq().sortBy(function(d) { return d.Year; }).value(),
        allFunc = function() {
          return _.chain(that.data)
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
            data: _.map(years, function(year) {
              var found = _.findWhere(data, { Year: year });
              return found ? found.Value : null;
            }),
            borderWidth: 1
          }, that.datasetObject);
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
      data: _.map(allFunc(), function(d) {
        return [d.Year, d.Value]
      })
    });

    // with optional fields:
    if(_.isArray(fields)) {
      fields.forEach(function(field) {
        var data =
          _.chain(that.data)
            .filter(function(i) { return that.onlyPropertySet(i, selectableFields, field); })
            .sortBy(function(i) { return i.Year; })
            .map(function(d) { return _.pick(d, _.identity); })
            .value();

        // Year, fieldvalue-1, fieldvalue-2, fieldvalue-n
        var uniqueFieldValues = _.chain(data).pluck(field).uniq().sortBy(function(d) { return d[field]; }).value(),
            result = _.map(years, function(year) {
              return _.reduce(_.where(data, { 'Year': year }), function(o, v){
                o.Year = v.Year;
                o[v[field]] = v.Value;
                return o;
            }, {});
          });

        tableData.push({
          title: 'Breakdown by ' + field,
          headings: ['Year'].concat(uniqueFieldValues),
          data: _.map(result, function(r) {
              return [r.Year].concat(_.map(uniqueFieldValues, function(f) {
                return r[f];
              }));
          })
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

    this.onDataComplete.notify({
      datasets: datasets,
      labels: years,
      tables: tableData
    });

    if(initial) {
      this.onSeriesComplete.notify({
        series: this.getSelectableFields(data[0])
      });
    } else {
      this.onSeriesSelectedChanged.notify({
        series: this.selectedFields
      });
    }
  };
};

indicatorModel.prototype = {
  initialise: function() {
    this.getData(true);
  },
  getData: function() {
    this.getData();
  }
};

