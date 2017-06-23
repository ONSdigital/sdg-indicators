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

      // remove any undefined/null values:
      _.each(Object.keys(item), function(key) {
        if(_.isNull(item[key]) || _.isUndefined(item[key])) {
          delete item[key];
        }
      });

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
    var that = this, allUndefined = function (obj) {
      for (var loop = 0; loop < that.selectableFields.length; loop++) {
        if (obj[that.selectableFields[loop]])
          return false;
      }
      return true;
    };

    return _.chain(that.data)
      .filter(function (i) {
        return allUndefined(i);
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
  
  this.getCombinationData = function(obj) {
    var getCombinations = function(fields, arr, n) {
      var index = 0, ret = [];
      for(var i = 0; i < arr.length; i++) {
        var elem = (n == 1) ? arr[i] : arr.shift();
        var field = (n == 1) ? fields[i] : fields.shift();
        for(var j = 0; j < elem.length; j++) {
          if(n == 1) {
            ret.push({
              value: elem[j],
              field: field
            });
          } else {
            var childperm = getCombinations(fields.slice(), arr.slice(), n-1);
            for(var k = 0; k < childperm.length; k++) {
              ret.push([{
                value: elem[j],
                field: field
              }].concat(childperm[k]));
            }            
          }
        }
      }
      return ret;
    };

    var	loop = 1,
        res = [],
        src = JSON.parse(JSON.stringify(obj));
    
    for(; loop <= src.length; loop++) { 
      obj = JSON.parse(JSON.stringify(src));
      res = res.concat(getCombinations(_.pluck(obj, 'field'), _.pluck(obj, 'values'), loop));
    }

    return _.map(res, function(r) {
      if(!_.isArray(r)) {
        r = [r];
      }
      return _.object(
        _.pluck(r, 'field'),
        _.pluck(r, 'value')
      );
    });
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
      getCombinationDescription = function(combination) {
        return _.map(Object.keys(combination), function(key) {
          return combination[key];
          //return key + ' ' + combination[key];
        }).join(', ');
      },
      convertToDataset = function (data, combinationDescription /*field, fieldValue*/) {
        // var fieldIndex = field ? _.findIndex(that.selectedFields, function (f) {
        //     return f === field;
        //   }) : undefined,
        var fieldIndex,
          ds = _.extend({
            //label: field && fieldValue ? field + ' ' + fieldValue : that.country,
            label: combinationDescription ? combinationDescription : that.country,
            borderColor: '#' + colors[datasetIndex],
            pointBorderColor: '#' + colors[datasetIndex],
            data: _.map(that.years, function (year) {
              var found = _.findWhere(data, {
                Year: year
              });
              return found ? found.Value : null;
            }),
            borderWidth: /*field*/ combinationDescription ? 2 : 4,
            // apply dash to secondary fields:
            //borderDash: fieldIndex > 0 ? [((fieldIndex + 1) * 2), ((fieldIndex + 1) * 2)] : []
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

    //console.table(matchedData);

    var fieldsAndValues = _.map(_.pluck(this.fieldInfo, 'field'), function(f) {
      return {
        field: f,
        values: 
          _.chain(matchedData).pluck(f).uniq().filter(function(v) { return v; }).value()
      };
    });

    var debugStates = [];

    //  this.selectedFields
    //    field: 'Col1', values: [ 'B' ]
    //
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

          if(that.selectedFields.length === 0) {
            fieldItem.state = 'default';
          } else if(matched.values.containsValue(fieldItem.value)) {
            var selected = _.findWhere(that.selectedFields, { field: fieldInfoItem.field });
            if(selected && selected.values.containsValue(fieldItem.value)) {
              fieldItem.state = 'selected';
            } else {
              fieldItem.state = 'default';
            }
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

          //debugStates.push('[' + fieldItem.value + ' is ' + fieldItem.state + ']');

        });
      });
        
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

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // extract the possible combinations for the selected field values:
    var combinations = this.getCombinationData(this.selectedFields);
    var filteredDatasets = [];
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    _.each(combinations, function(combination) {
      var filtered = _.filter(that.data, function(dataItem) {
        var matched = true;
        for (var loop = 0; loop < that.selectableFields.length; loop++) {
          if (dataItem[that.selectableFields[loop]] !== combination[that.selectableFields[loop]])
            matched = false;
        }
        return matched;
      });

      filteredDatasets.push({
        data: filtered,
        combinationDescription: getCombinationDescription(combination)
      });
    });

    _.chain(filteredDatasets)
      // TODO, probably best to sort on property count, ordered by selectableFields index:
      .sortBy(function(ds) { return ds.combinationDescription; })
      .each(function(ds) { datasets.push(convertToDataset(ds.data, ds.combinationDescription)); });

    /////////////////////////////////////////////////////////////////////////////////////////////////////////

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
