var indicatorModel = function (options) {

  // events:
  this.onDataComplete = new event(this);
  this.onSeriesComplete = new event(this);
  this.onSeriesSelectedChanged = new event(this);
  this.onFieldsStatusUpdated = new event(this);

  this.temp = '';
  
  // data rounding:
  this.roundingFunc = options.roundingFunc || function(value) {
    var to = 3, mult = Math.pow(10, to - Math.floor(Math.log(Math.abs(value)) / Math.LN10) - 1);
    return Math.round(value * mult) / mult;
  };

  // general members:
  var that = this;
  this.data = options.data;

  //console.log(JSON.stringify(this.data));

  this.country = options.country;
  this.indicatorId = options.indicatorId;
  this.chartTitle = options.chartTitle;
  this.measurementUnit = options.measurementUnit;
  this.dataSource = options.dataSource;
  this.geographicalArea = options.geographicalArea;
  this.selectedFields = [];
  this.fieldValueStatuses = [];

  // initialise the field information, unique fields and unique values for each field:
  (function initialise() {
    that.fieldInfo = _.map(_.filter(Object.keys(that.data[0]), function (key) {
        return ['Year', 'Value'].indexOf(key) === -1;
      }), function(field) {
      return {
        field: field,
        values: _.map(_.chain(that.data).pluck(field).uniq().filter(function(f) { return f; }).value(),
          function(f) { return {
            value: f,
            state: 'possible'
          }})
      };
    });

    that.years = _.chain(that.data).pluck('Year').uniq().sortBy(function (year) {
      return year;
    }).value();

    that.selectableFields = _.pluck(that.fieldInfo, 'field');

    // prepare the data according to the rounding function:
    that.data = _.map(that.data, function(item) {
      item.Value = that.roundingFunc(item.Value);
      return item;
    });

    that.datasetObject = {
      fill: false,
      pointHoverRadius: 5,
      pointBackgroundColor: '#ffffff',
      pointHoverBorderWidth: 1,
      tension: 0,
      spanGaps: false
    };
  }());

  var colors = ['777777', '0082e5', '79c3fc', '005da7', 'ff9c18', 'f47d00', 'ad8cf3', '9675e2'];

  this.getHeadline = function(fields) {
    var that = this, allNull = function (obj) {
      for (var loop = 0; loop < that.selectableFields.length; loop++) {
        if (obj[that.selectableFields[loop]])
          return false;
      }
      return true;
    };

    return _.chain(that.data)
      .filter(function (i) {
        return allNull(i);
      })
      .sortBy(function (i) {
        return i.Year;
      })
      .map(function (d) {
        return _.pick(d, _.identity);
      })
      .value();
  };

  this.updateSelectedFields = function (fields) {
    //console.log('Selected fields: ', fields);
    this.selectedFields = fields;
    this.getData();
  };

  this.getData = function (initial) {

    this.temp += '!';

    // field: 'Grade'
    // values: ['A', 'B']
    var fields = this.selectedFields,
      selectedFieldTypes = _.pluck(fields, 'field'),
      datasets = [],
      that = this,
      seriesData = [],
      tableData = [],
      datasetIndex = 0,
      convertToDataset = function (data, field, fieldValue) {
        var fieldIndex = field ? _.findIndex(that.selectedFields, function (f) {
            return f === field;
          }) : undefined,
          ds = _.extend({
            label: field && fieldValue ? field + ' ' + fieldValue : that.country,
            borderColor: '#' + colors[datasetIndex],
            pointBorderColor: '#' + colors[datasetIndex],
            data: _.map(that.years, function (year) {
              var found = _.findWhere(data, {
                Year: year
              });
              return found ? found.Value : null;
            }),
            borderWidth: field ? 2 : 4,
            // apply dash to secondary fields:
            borderDash: fieldIndex > 0 ? [((fieldIndex + 1) * 2), ((fieldIndex + 1) * 2)] : []
          }, that.datasetObject);
        datasetIndex++;
        return ds;
      };

    //console.log('Selected field types', selectedFieldTypes);

    if (fields && !_.isArray(fields)) {
      fields = [].concat(fields);
    }

    // update the statuses of the fields based on the selected fields' state:
    var matchedData = _.filter(this.data, function(item) {
        var isMatch = true;

        for(var loop = 0; loop < fields.length; loop++) {
          // or on each field:
          if(fields[loop].values.indexOf(item[fields[loop].field]) === -1)
            isMatch = false;
        }

        return isMatch;
    });

    // now we need to update each field/value with selected/possible/excluded:
    //this.fieldValueStatuses

    var fieldsAndValues = _.map(_.pluck(this.fieldInfo, 'field'), function(f) {
      return {
        field: f,
        values: 
          _.chain(matchedData).pluck(f).uniq().filter(function(v) { return v; }).value()
      };
    });

    // go through the fieldInfo and mark each item as either selected/possible/excluded:
    _.each(this.fieldInfo, function(fieldInfoItem) {
      var matched = _.findWhere(fieldsAndValues, { field: fieldInfoItem.field });
      _.each(fieldInfoItem.values, function(fieldItem) {
        // it's a selected field, so it's either selected or possible
        if(selectedFieldTypes.indexOf(fieldInfoItem.field) != -1) {
          if(matched.values.indexOf(fieldItem.value) != -1) {
            fieldItem.state = 'selected';
          } else {
            fieldItem.state = 'possible';
          }
        } else {
          // it's not a selected field, so it's either possible or excluded:
          if(matched.values.indexOf(fieldItem.value) != -1) {
            fieldItem.state = '';
          } else {
            fieldItem.state = 'excluded';
          }
        } 
      });
    });

    this.onFieldsStatusUpdated.notify({
      data: this.fieldInfo
    });

    // headline:
    var headline = this.getHeadline();
    datasets.push(convertToDataset(headline));
    tableData.push({
      title: 'Headline for ' + this.country,
      headings: ['Year', 'Value'],
      data: _.map(headline, function (d) {
        return [d.Year, d.Value];
      })
    });

    this.onDataComplete.notify({
      datasets: datasets,
      labels: this.years,
      tables: tableData,
      indicatorId: this.indicatorId
    });

    if (initial) {
      this.onSeriesComplete.notify({
        series: this.fieldInfo
      });
    } else {
      this.onSeriesSelectedChanged.notify({
        series: this.selectedFields
      });
    }
  };
};

indicatorModel.prototype = {
  initialise: function () {
    this.getData(true);
  },
  getData: function () {
    this.getData();
  }
};
