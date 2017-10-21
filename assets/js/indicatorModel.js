var indicatorModel = function (options) {

  Array.prototype.containsValue = function(val) {
    return this.indexOf(val) != -1;
  };

  // events:
  this.onDataComplete = new event(this);
  this.onSeriesComplete = new event(this);
  this.onSeriesSelectedChanged = new event(this);
  this.onUnitsComplete = new event(this);
  this.onUnitsSelectedChanged = new event(this);
  this.onFieldsStatusUpdated = new event(this);
  this.onFieldsCleared = new event(this);
  this.onSelectionUpdate = new event(this);
  
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
  this.showData = options.showData;
  this.selectedFields = [];
  this.selectedUnit = undefined;
  this.fieldValueStatuses = [];
  this.userInteraction = {};

  // initialise the field information, unique fields and unique values for each field:
  (function initialise() {
    that.fieldItemStates = _.map(_.filter(Object.keys(that.data[0]), function (key) {
        // 'Value' may not be present, but 'Year' and '
        return ['Year', 'Value', 'Units'].indexOf(key) === -1;
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

    var extractUnique = function(prop) {
      return _.chain(that.data).pluck(prop).uniq().sortBy(function(year) {
        return year;
      }).value();
    };

    that.years = extractUnique('Year');

    if(that.data[0].hasOwnProperty('Units')) {
      that.units = extractUnique('Units');
      that.selectedUnit = that.units[0];
    }

    that.selectableFields = _.pluck(that.fieldItemStates, 'field');

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
        return that.selectedUnit ? i.Units : i.Year;
      })
      .map(function (d) {
        return _.pick(d, _.identity);
      })
      .value();
  };

  this.clearSelectedFields = function() {
    this.selectedFields = [];
    this.userInteraction = {};
    this.getData();
    this.onFieldsCleared.notify();
  };

  this.updateSelectedFields = function (fields, userInteraction) {
    //console.log('Selected fields: ', fields);
    this.selectedFields = fields;
    this.userInteraction = userInteraction;
    this.getData();
    this.onSelectionUpdate.notify(fields);
  };

  this.updateSelectedUnit = function(selectedUnit) {
    this.selectedUnit = selectedUnit;
    this.getData();
    this.onUnitsSelectedChanged.notify(selectedUnit);
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
            label: combinationDescription ? combinationDescription : that.country,
            borderColor: '#' + colors[datasetIndex],
            backgroundColor: '#' + colors[datasetIndex],
            pointBorderColor: '#' + colors[datasetIndex],
            data: _.map(that.years, function (year) {
              var found = _.findWhere(data, {
                Year: year
              });
              return found ? found.Value : null;
            }),
            borderWidth: combinationDescription ? 2 : 4
          }, that.datasetObject);
        datasetIndex++;
        return ds;
      };
    
    if (fields && !_.isArray(fields)) {
      fields = [].concat(fields);
    }

    var isSingleValueSelected = function() { return that.selectedFields.length === 1 && that.selectedFields[0].values.length === 1; },
        matchedData = that.data;

    // filter the data:
    //if(!isSingleValueSelected()) {
    if(that.selectedUnit) {
      matchedData = _.filter(matchedData, function(rowItem) {
        return rowItem.Units == that.selectedUnit;
      });
    }

    matchedData = _.filter(matchedData, function(rowItem) {
      var matched = false;
      for(var fieldLoop = 0; fieldLoop < that.selectedFields.length; fieldLoop++) {
        if(that.selectedFields[fieldLoop].values.containsValue(rowItem[that.selectedFields[fieldLoop].field])) {
          matched = true;
          break;
        }
      }
      return matched;
    });
    
    //}
/*
    console.table(matchedData);

    // update statuses:
    _.each(that.fieldItemStates, function(fieldItemState) {
      var selectedInfo = _.findWhere(that.selectedFields, { field : fieldItemState.field });

      _.each(fieldItemState.values, function(fieldItemValue) {
        // nothing selected:
        if(!that.selectedFields.length) {
          fieldItemValue.state = 'default';
        } else {
          if(selectedInfo && selectedInfo.values.containsValue(fieldItemValue.value)) {
            fieldItemValue.state = 'selected';
          } else {
            // not selected, so is it in the data that we have?
            var uniqueMatchedFieldValues = _.chain(matchedData).pluck(fieldItemState.field).filter(function(x) { return x; }).uniq().value();

            if(uniqueMatchedFieldValues.containsValue(fieldItemValue.value) && selectedInfo) {
              fieldItemValue.state = 'possible'; // this field has a selection
            } else if(uniqueMatchedFieldValues.containsValue(fieldItemValue.value) && !selectedInfo) {
              fieldItemValue.state = 'default'; // no selections for this field, so set to default
            } else {

              // if(isSingleValueSelected() && that.selectedFields[0].field === fieldItemState.field) {
              //   fieldItemState.state = 'possible';
              // } else {
               // fieldItemValue.state = 'excluded';
              // }  

              // isSingleValueSelected() &&
              fieldItemValue.state = that.selectedFields[0].field == fieldItemState.field ? 'possible' : 'excluded';
              //fieldItemValue.state = 'excluded';
            }
          }
        }
      });
    });

    // derive selection state ratios:
    var fieldSelectionInfo = this.fieldItemStates.map(function(fi) {
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
*/

    var fieldSelectionInfo = [];

    this.onFieldsStatusUpdated.notify({
      data: this.fieldItemStates,
      selectionStates: fieldSelectionInfo
    });

    // headline:
    var headline = this.getHeadline();

    // headline plot should use the specific unit, if any
    datasets.push(convertToDataset(that.selectedUnit ? _.filter(headline, function(item) { 
      return item.Units === that.selectedUnit; }) : headline));
    
    // all units for headline data
    tableData.push({
      title: 'Headline for ' + this.country,
      headings: that.selectedUnit ? ['Year', 'Units', 'Value'] : ['Year', 'Value'],
      data: _.map(headline, function (d) {
        return that.selectedUnit ? [d.Year, d.Units, d.Value] : [d.Year, d.Value];
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

      if(filtered.length) {
        // but some combinations may not have any data:
        filteredDatasets.push({
          data: filtered,
          combinationDescription: getCombinationDescription(combination)
        });
      }
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
      indicatorId: this.indicatorId,
      selectedUnit: this.selectedUnit
    });

    if (initial) {
      this.onSeriesComplete.notify({
        series: this.fieldItemStates
      });
      this.onUnitsComplete.notify({
        units: this.units
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
