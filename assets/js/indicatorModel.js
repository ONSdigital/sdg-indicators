var indicatorModel = function (options) {

  Array.prototype.containsValue = function(val) {
    return this.indexOf(val) != -1;
  };

  // events:
  this.onDataComplete = new event(this);
  this.onSeriesComplete = new event(this);
  this.onSeriesSelectedChanged = new event(this);
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
    this.onSelectionUpdate.notify(fields.length);
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
            backgroundColor: '#' + colors[datasetIndex],
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
    // var isAll = true;
    // _.each(that.fieldInfo, function(fi) {
    //   if(!_.every(fi.values, function(v) { return v.state === 'default'; })) {
    //     isAll = false;
    //   }
    // });

    //console.log('filter first on: ', _.chain(that.selectedFields).pluck('field').without(that.userInteraction.field).value());
    //console.log('and then on...', this.userInteraction.field);
    //console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    //console.log(fields);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    console.log('original: ', this.data.length);

    var andFieldNames = _.chain(that.selectedFields).pluck('field').without(that.userInteraction.field).value(),
        andFields = _.filter(fields, function(f) { return andFieldNames.containsValue(f.field); }),
        isMatch, 
        matchedData = [];

    // first, filter on the field types that have not just been modified:
    if(andFields.length) {
      matchedData = _.filter(this.data, function(item) {
        isMatch = true;
        for(var loop = 0; loop < andFields.length; loop++) {
          if(!andFields[loop].values.containsValue(item[andFields[loop].field])) {
            isMatch = false;
          }
        }
        return isMatch;
      });
    } else {
      matchedData = this.data;
    }

    // and then, on the field that has just been modified:

    // ***********************************************************
    // FIRST, find out what's currently left:
    // SECOND, then do a selection on the remaining fields:
    // ***********************************************************
    var possibleValues = [];

    if(that.userInteraction.field) {

      // what's available for this field?
      var preFilter = _.chain(matchedData).pluck(that.userInteraction.field).filter(function(item) { return item; }).uniq().value();

      console.log('SELFIELDS ', that.selectedFields);
    
      // filter on this field's selections:
      var interactiveFieldValues = _.findWhere(that.selectedFields, { 'field' : that.userInteraction.field }) ? 
        _.findWhere(fields, { 'field' : that.userInteraction.field }).values : [];
      
      console.log('selected values for THAT field!: ', interactiveFieldValues);

      // might be none if the last click cleared the selections for this field:
      if(interactiveFieldValues.length) {
        // now do a filter on what's been selected
        matchedData = _.filter(matchedData, function(item) {
          return interactiveFieldValues.containsValue(item[that.userInteraction.field]);
        });
      }
      
      console.table(matchedData);

      var postFilter = _.chain(matchedData).pluck(that.userInteraction.field).filter(function(item) { return item; }).uniq().value();

      possibleValues = _.difference(preFilter, postFilter);

      console.log('pre: ', preFilter, ', post: ', postFilter, ', diff: ', _.difference(preFilter, postFilter));
    }
    
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    console.log('post length: ', matchedData.length);
    console.log('possible values: ', possibleValues.toString());

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
    //console.log(this.fieldInfo);

    //console.table(fieldsAndValues);

   // console.table(_.map(fieldsAndValues, function(item) { return { field: item.field, values: item.values.toString() }; }));

    _.each(this.fieldInfo, function(fieldInfoItem) {

      var currentFieldAndValues = _.findWhere(fieldsAndValues, { field: fieldInfoItem.field });


      //console.log('fii: ', fieldInfoItem.field);

      //console.log(matched);
      // go through each field value state:
      _.each(fieldInfoItem.values, function(fieldItem) {

        // reset:
        if(that.selectedFields.length === 0) {
          fieldItem.state = 'default';
        } else if(fieldInfoItem.field !== that.userInteraction.field) {
          if(currentFieldAndValues.values.containsValue(fieldItem.value) && _.findWhere(that.selectedFields, { field: fieldInfoItem.field })) {
            fieldItem.state = 'selected';
          } else if(currentFieldAndValues.values.containsValue(fieldItem.value)) {
            fieldItem.state = 'default';
          } else {
            fieldItem.state = 'excluded';
            console.log('excluding something: ', fieldItem);
          }
        } else {
          // the currently interacting field:

          // 
        }


        // is the field somethings that's just been interacted with?


/*
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
*/

/*
        // update the selected field information based on the new states:
        if(fieldItem.state != 'selected' && that.selectedFields.length) {
          // find it in the equivalent fieldInfo, and remove:
          // field: fieldInfoItem.field
          var toUpdate = _.findWhere(that.selectedFields, { field: fieldInfoItem.field });

          if(toUpdate) {
            toUpdate.values = _.without(toUpdate.values, fieldItem.value);
          }
        }
*/
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

    // console.log('this.selectedFields', this.selectedFields);
    // console.log('this.fieldInfo', this.fieldInfo);
    
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
