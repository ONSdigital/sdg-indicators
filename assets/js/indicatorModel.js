var indicatorModel = function (options) {

  Array.prototype.containsValue = function(val) {
    return this.indexOf(val) != -1;
  };

  // events:
  this.onDataComplete = new event(this);
  this.onSeriesComplete = new event(this);
  this.onSeriesSelectedChanged = new event(this);
  this.onFieldsStatusUpdated = new event(this);
  
  // data rounding:
  this.roundingFunc = options.roundingFunc || function(value) {
    var to = 3, mult = Math.pow(10, to - Math.floor(Math.log(Math.abs(value)) / Math.LN10) - 1);
    return Math.round(value * mult) / mult;
  };

  // general members:
  var that = this;
  this.data = options.data;
  this.country = options.country;
  this.indicatorId = options.indicatorId;
  this.chartTitle = options.chartTitle;
  this.measurementUnit = options.measurementUnit;
  this.dataSource = options.dataSource;
  this.geographicalArea = options.geographicalArea;
  this.selectedFields = [];
  this.fieldValueStatuses = [];
  this.userInteraction = {};

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
            state: 'default'
          };
        })
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

  this.updateSelectedFields = function (fields, userInteraction) {
    //console.log('Selected fields: ', fields);
    this.selectedFields = fields;
    this.userInteraction = userInteraction;
    this.getData();
  };

  this.getData = function (initial) {

    //console.log('getData....');

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
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    var isAll = true;
    _.each(that.fieldInfo, function(fi) {
      if(!_.every(fi.values, function(v) { return v.state === 'default'; })) {
        isAll = false;
      }
    });

    var matchedData = _.filter(this.data, function(item) {
        var isMatch = true;

        for(var loop = 0; loop < fields.length; loop++) {

          // if(fields[loop].field === that.userInteraction.field) {
          //   // or:
          //   // the name of the field: fields[loop].field
          //   var inValues = _.pluck(_.filter(_.chain(that.fieldInfo)
          //   .findWhere({ field : fields[loop].field })
          //   .value().values, function(f) { return f.state !== 'excluded'; }), 'value');

          //   if(inValues.indexOf(item[fields[loop].field]) === -1) {
          //     isMatch = false;
          //   }
          // } else {
            if(fields[loop].values.indexOf(item[fields[loop].field]) === -1)
              isMatch = false;
          // }
        }

        return isMatch;
    });

    console.table(matchedData);

    var fieldsAndValues = _.map(_.pluck(this.fieldInfo, 'field'), function(f) {
      return {
        field: f,
        values: 
          _.chain(matchedData).pluck(f).uniq().filter(function(v) { return v; }).value()
      };
    });

    var debugStates = [];

    //  fieldInfo: THE STATES OF THE FIELDS
    //    field: 'Col1', values: [ { state: 'default', value: 'A' } ]
    //
    //  fieldsAndValues: THE VALUES THAT ARE AVAILABLE IN THE SELECTION
    //    field: 'Col1', values: [ 'B', 'C' ]
    //
    //  selectedFieldTypes: THE FIELDS THAT ARE SELECTED
    //    ['Col1', 'Col2']
    //

    // go through the fieldInfo and mark each item as either selected/possible/excluded:
    _.each(this.fieldInfo, function(fieldInfoItem) {

      var matched = _.findWhere(fieldsAndValues, { field: fieldInfoItem.field });

      // go through each field value state:
      _.each(fieldInfoItem.values, function(fieldItem) {

        if(matched.values.containsValue(fieldItem.value)) {
          fieldItem.state = 'selected';
        } else {
          if(fieldInfoItem.field === that.userInteraction.field) {
            // possible:
            if(!['excluded'].containsValue(fieldItem.state)) {
              fieldItem.state = 'possible';
            }
          } else {
            // is this field the only field with selections? if so, 
            // its excluded can be 'possible'
            if(selectedFieldTypes.length === 1 && selectedFieldTypes[0] === fieldInfoItem.field) {
              fieldItem.state = 'possible';
            } else {
              fieldItem.state = 'excluded';
            }
          }
        }

        debugStates.push('[' + fieldItem.value + ' is ' + fieldItem.state + ']');

      });

    });

    //console.log(debugStates.join(', '));
    //console.log(this.fieldInfo);

    var fieldSelectionInfo = this.fieldInfo.map(function(fi) {
      var maxFieldValueCount = fi.values.length,
          fieldStates = _.pluck(fi.values, 'state');
      return {
        field: fi.field,
        fieldSelection: {
          possibleState: (_.filter(fieldStates, function(fv) { return fv === 'possible'; }).length / maxFieldValueCount) * 100,
          defaultState: (_.filter(fieldStates, function(fv) { return fv === 'default' || fv === 'selected'; }).length / maxFieldValueCount) * 100,
          excludedState: (_.filter(fieldStates, function(fv) { return fv === 'excluded'; }).length / maxFieldValueCount) * 100
        }
      };      
    });

    this.onFieldsStatusUpdated.notify({
      data: this.fieldInfo,
      selectionStates: fieldSelectionInfo
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
