var indicatorModel = function (options) {

  var that = this;
  this.data = options.data;
  this.country = options.country;
  this.indicatorId = options.indicatorId;
  this.chartTitle = options.chartTitle;
  this.measurementUnit = options.measurementUnit;
  this.dataSource = options.dataSource;
  this.geographicalArea = options.geographicalArea;
  this.selectedFields = [];

  this.roundingFunc = options.roundingFunc || function(value) {
    var to = 3, mult = Math.pow(10, to - Math.floor(Math.log(value) / Math.LN10) - 1);
    return Math.round(value * mult) / mult;
  };

  // prepare the data according to the rounding function:
  this.data = _.map(this.data, function(item) {
    item.Value = that.roundingFunc(item.Value);
    return item;
  });

  this.onDataComplete = new event(this);
  this.onSeriesComplete = new event(this);
  this.onSeriesSelectedChanged = new event(this);

  this.datasetObject = {
    fill: false,
    pointHoverRadius: 5,
    pointBackgroundColor: '#ffffff',
    pointHoverBorderWidth: 1,
    tension: 0,
    spanGaps: false
  };

  var colors = ['777777', '0082e5', '79c3fc', '005da7', 'ff9c18', 'f47d00', 'ad8cf3', '9675e2'];

  this.getFieldsAndValues = function () {
    var that = this, uniqueFields = _.filter(Object.keys(this.data[0]), function (key) {
      return ['Year', 'Value'].indexOf(key) === -1;
    });

    // return field and its unique fields:
    return _.map(uniqueFields, function(field) {
      return {
        field: field,
        values: _.filter(_.uniq(_.pluck(that.data, field)), function(f) { return f; })
      };
    });
  };

  this.allNull = function (obj, fields) {
    for (var loop = 0; loop < fields.length; loop++) {
      if (obj[fields[loop]])
        return false;
    }
    return true;
  };

  this.onlyPropertySet = function (obj, allFields, properties) {
    if (!_.isArray(properties)) {
      properties = [properties];
    }

    for (var loop = 0; loop < allFields.length; loop++) {
      if (properties.indexOf(allFields[loop]) !== -1 && !obj[allFields[loop]]) {
        return false; // has to have a value
      } else if (properties.indexOf(allFields[loop]) === -1 && obj[allFields[loop]]) {
        return false; // has to have no value set
      }
    }
    return true;
  };

  this.updateSelectedFields = function (fields) {
    this.selectedFields = fields;
    this.getData();
  };

  this.getData = function (initial) {

    var fields = this.selectedFields,
      datasets = [],
      selectableFields = _.pluck(this.getFieldsAndValues(), 'field'),
      that = this,
      seriesData = [],
      tableData = [],
      years = _.chain(this.data).pluck('Year').uniq().sortBy(function (year) {
        return year;
      }).value(),
      allFunc = function () {
        return _.chain(that.data)
          .filter(function (i) {
            return that.allNull(i, selectableFields);
          })
          .sortBy(function (i) {
            return i.Year;
          })
          .map(function (d) {
            return _.pick(d, _.identity);
          })
          .value();
      },
      datasetIndex = 0,
      convertToDataset = function (data, field, fieldValue) {
        var fieldIndex = field ? _.findIndex(that.selectedFields, function (f) {
            return f === field;
          }) : undefined,
          ds = _.extend({
            label: field && fieldValue ? field + ' ' + fieldValue : that.country,
            borderColor: '#' + colors[datasetIndex],
            pointBorderColor: '#' + colors[datasetIndex],
            data: _.map(years, function (year) {
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

    if (fields && !_.isArray(fields)) {
      fields = [].concat(fields);
    }

    // use all:
    datasets.push(convertToDataset(allFunc()));
    tableData.push({
      title: 'Headline for ' + this.country,
      headings: ['Year', 'Value'],
      data: _.map(allFunc(), function (d) {
        return [d.Year, d.Value];
      })
    });

    // with optional fields:
    if (_.isArray(fields)) {
      fields.forEach(function (field) {
        var data =
          _.chain(that.data)
          .filter(function (i) {
            return that.onlyPropertySet(i, selectableFields, field);
          })
          .sortBy(function (i) {
            return i.Year;
          })
          .map(function (d) {
            return _.pick(d, _.identity);
          })
          .value();

        // Year, fieldvalue-1, fieldvalue-2, fieldvalue-n
        var uniqueFieldValues = _.chain(data).pluck(field).uniq().sortBy(function (d) {
            return d[field];
          }).value(),
          result = _.map(years, function (year) {
            return _.reduce(_.where(data, {
              'Year': year
            }), function (o, v) {
              o.Year = v.Year;
              o[v[field]] = v.Value;
              return o;
            }, {});
          });

        tableData.push({
          title: 'Breakdown by ' + field,
          headings: ['Year'].concat(uniqueFieldValues),
          data: _.filter(data, function (d) {
            return d.Value;
          }).length ? _.map(_.filter(result, function (rr) {
            return Object.keys(rr).length;
          }), function (r) {
            return [r.Year].concat(_.map(uniqueFieldValues, function (f) {
              return r[f];
            }));
          }) : []
        });

        // breakdown by that field's individual series:
        _.chain(data).pluck(field).uniq().value()
          .forEach(function (value, index) {
            datasets.push(convertToDataset(
              _.chain(data)
              .filter(function (d) {
                return d[field] === value;
              })
              .sortBy(function (d) {
                return d.Year;
              }).value(),
              field,
              value
            ));
          });
      });

      // combined disaggregations:
      if (fields.length === 2) {
        // extract data:
        var combinedData =
          _.chain(that.data)
          .filter(function (i) {
            return that.onlyPropertySet(i, selectableFields, fields);
          })
          .sortBy(function (i) {
            return i.Year;
          })
          .map(function (d) {
            return _.pick(d, _.identity);
          })
          .value();

        // get unique field labels:
        var uniqueFieldCombinations = _.map(_.groupBy(combinedData, function (d) {
          return d[fields[0]] + '_' + d[fields[1]];
        }), function (grouped) {
          return _.pick(grouped[0], fields[0], fields[1]);
          //return grouped[0][fields[0]] + '_' + grouped[0][fields[1]];
        });

        tableData.push({
          title: 'Breakdown by ' + fields.join(' and '),
          headings: ['Year'].concat(_.map(uniqueFieldCombinations, function (fc) {
            return fc[fields[0]] + ' and ' + fc[fields[1]];
          })),
          data: combinedData.length ? _.map(years, function (year) {
            return [year].concat(_.map(uniqueFieldCombinations, function (ufc) {
              ufc.Year = year;
              var found = _.findWhere(combinedData, ufc);
              return found ? found.Value : undefined;
            }));
          }) : []
        });

        //console.log('data combined: ', JSON.stringify(combinedData));
      }
    }

    this.onDataComplete.notify({
      datasets: datasets,
      labels: years,
      tables: tableData,
      indicatorId: this.indicatorId
    });

    if (initial) {
      this.onSeriesComplete.notify({
        series: this.getFieldsAndValues()
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
