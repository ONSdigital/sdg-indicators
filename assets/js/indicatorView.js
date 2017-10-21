var indicatorView = function (model, options) {

  "use strict";

  var view_obj = this;

  //this._fieldLimit = 2;
  this._model = model;

  this._chartInstance = undefined;
  this._rootElement = options.rootElement;
  
  var chartHeight = screen.height < options.maxChartHeight ? screen.height : options.maxChartHeight;

  $('.plot-container', this._rootElement) 
    .css('height', chartHeight + 'px'); 

  this._model.onDataComplete.attach(function (sender, args) {

    if(view_obj._model.showData) {
      if(!view_obj._chartInstance) {
        view_obj.createPlot(args);
      } else {
        view_obj.updatePlot(args);
      }
    }
    
    view_obj.createTables(args);
  });

  this._model.onSeriesComplete.attach(function (sender, args) {
    view_obj.initialiseSeries(args);
  });

  this._model.onSeriesSelectedChanged.attach(function (sender, args) {
    // var selector;
    // if (args.series.length === view_obj._fieldLimit) {
    //   selector = $('#fields input:not(:checked)');
    //   selector.attr('disabled', true);
    //   selector.parent().addClass('disabled').attr('title', 'Maximum of ' + view_obj._fieldLimit + ' selections; unselect another to select this field');
    // } else {
    //   selector = $('#fields input');
    //   selector.removeAttr('disabled');
    //   selector.parent().removeClass('disabled').removeAttr('title');
    // }
  });

  this._model.onUnitsComplete.attach(function(sender, args) {
    view_obj.initialiseUnits(args);
  });

  this._model.onUnitsSelectedChanged.attach(function(sender, args) {
    // update the plot's y axis label
    // update the data
  });

  this._model.onFieldsCleared.attach(function(sender, args) {
    $(view_obj._rootElement).find(':checkbox').prop('checked', false);
    $(view_obj._rootElement).find('#clear').addClass('disabled');

    // #246
    $(view_obj._rootElement).find('.selected').css('width', '0');
    // end of #246
  });

  this._model.onSelectionUpdate.attach(function(sender, selectedFields) {
    $(view_obj._rootElement).find('#clear')[selectedFields.length ? 'removeClass' : 'addClass']('disabled');

    // loop through the available fields:
    $('.variable-selector').each(function(index, element) {
      var currentField = $(element).data('field');

      // any info?
      var match = _.findWhere(selectedFields, { field : currentField });
      var element = $(view_obj._rootElement).find('.variable-selector[data-field="' + currentField + '"]');
      var width = match ? (Number(match.values.length / element.find('.variable-options label').length) * 100) + '%' : '0';

      $(element).find('.bar .selected').css('width', width);
    });
  });

  this._model.onFieldsStatusUpdated.attach(function (sender, args) {
    //console.log('updating field states with: ', args);

    // reset: 
    $(view_obj._rootElement).find('label').removeClass('selected possible excluded');

    _.each(args.data, function(fieldGroup) {
      _.each(fieldGroup.values, function(fieldItem) {
        var element = $(view_obj._rootElement).find(':checkbox[value="' + fieldItem.value + '"][data-field="' + fieldGroup.field + '"]');
        element.parent().addClass(fieldItem.state);
      });
    });

    _.each(args.selectionStates, function(ss) {
      // find the appropriate 'bar'
      var element = $(view_obj._rootElement).find('.variable-selector[data-field="' + ss.field + '"]');
      element.find('.bar .default').css('width', ss.fieldSelection.defaultState + '%');
      element.find('.bar .possible').css('width', ss.fieldSelection.possibleState + '%');
      element.find('.bar .excluded').css('width', ss.fieldSelection.excludedState + '%');
    });
  });

  $(document).click(function(e) {
    $('.variable-options').hide();
  });

  $(this._rootElement).on('click', '#clear', function() {
    view_obj._model.clearSelectedFields();
  });

  $(this._rootElement).on('click', '#fields label', function (e) {
    $(this).find(':checkbox').trigger('click');
    e.preventDefault();
    e.stopPropagation();
  });

  $(this._rootElement).on('change', '#units input', function() {
    view_obj._model.updateSelectedUnit($(this).val());
  });

  // generic helper function, used by clear all/select all and individual checkbox changes:
  var updateWithSelectedFields = function() {
    view_obj._model.updateSelectedFields(_.chain(_.map($('#fields input:checked'), function (fieldValue) {
      return {
        value: $(fieldValue).val(),
        field: $(fieldValue).data('field')
      };
    })).groupBy('field').map(function(value, key) {
      return {
          field: key,
          values: _.pluck(value, 'value')
      };
    }).value(), {
      field: $(this).data('field'),
      value: $(this).val(),
      selected: $(this).is(':checked')
    });
  }

  $(this._rootElement).on('click', '.variable-options button', function(e) {
    var type = $(this).data('type');
    var $options = $(this).closest('.variable-options').find(':checkbox');

    $options.prop('checked', type == 'select');

    updateWithSelectedFields();

    e.stopPropagation();
  });
  
  $(this._rootElement).on('click', ':checkbox', function(e) {

    // don't permit excluded selections:
    if($(this).parent().hasClass('excluded')) {
      return;
    }

    updateWithSelectedFields();

    e.stopPropagation();
  });

  $(this._rootElement).on('click', '.variable-selector', function(e) {

    var options = $(this).find('.variable-options');
    var optionsVisible = options.is(':visible');

    // ensure any others are hidden:
    $('.variable-options').hide();

    // but reinstate this one:
    $(options)[optionsVisible ? 'hide' : 'show']();

    e.stopPropagation();
  });

  this.initialiseSeries = function (args) {
    var template = _.template($("#item_template").html());

    $('<button id="clear" class="disabled">Clear selections <i class="fa fa-remove"></i></button>').insertBefore('#fields');

    $('#fields').html(template({
        series: args.series
    }));
  };

  this.initialiseUnits = function(args) {
    var template = _.template($('#units_template').html());

    $('#units').html(template({
      units: args.units
    }));
  };

  this.updatePlot = function(chartInfo) {
    view_obj._chartInstance.data.datasets = chartInfo.datasets;

    if(chartInfo.selectedUnit) {
      view_obj._chartInstance.options.scales.yAxes[0].scaleLabel.labelString = chartInfo.selectedUnit;
    }

    view_obj._chartInstance.update(1000, true);
  };

  this.createPlot = function (chartInfo) {
    
    var that = this;

    this._chartInstance = new Chart($(this._rootElement).find('canvas'), {
      type: 'line',
      data: chartInfo,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            gridLines: {
              color: '#ddd',
            }
          }],
          yAxes: [{
            ticks: {
              suggestedMin: 0
            },
            scaleLabel: {
              display: this._model.selectedUnit ? this._model.selectedUnit : this._model.measurementUnit,
              labelString: this._model.selectedUnit ? this._model.selectedUnit : this._model.measurementUnit
            }
          }]
        },
        layout: {
          padding: {
            top: 20,
            bottom: 55
          }
        },
        legend: {
          display: true,
          //usePointStyle: true,
          usePointStyle: false,
          position: 'bottom',
          padding: 20
        },
        title: {
          fontSize: 18,
          fontStyle: 'normal',
          display: this._model.chartTitle,
          text: this._model.chartTitle,
          padding: 20
        },
        plugins: {
          scaler: {}
        }
      }
    });

    Chart.pluginService.register({
      afterDraw: function(chart) {
        var $canvas = $(that._rootElement).find('canvas');

        var textOutputs = [
          'Source: ' + (that._model.dataSource ? that._model.dataSource : ''),
          'Geographical Area: ' + (that._model.geographicalArea ? that._model.geographicalArea : ''),
          'Unit of Measurement: ' + (that._model.measurementUnit ? that._model.measurementUnit : '')
        ];

        var textRowHeight = 20;
        var x = 0;
        var y = $canvas.height() - 40 - (textOutputs.length * textOutputs.length);

        var canvas = $canvas.get(0);
        var ctx = canvas.getContext("2d");

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial';
        ctx.fillStyle = '#6e6e6e';

        _.each(textOutputs, function(textOutput) {
          ctx.fillText(textOutput, x, y);
          y += textRowHeight;
        });
       }
    });
  };

  this.toCsv = function (tableData) {
    var lines = [],
      headings = tableData.headings;

    lines.push(headings.join(','));

    _.each(tableData.data, function (dataValues) {
      var line = [];

      _.each(headings, function (heading, index) {
        line.push(dataValues[index]);
      });

      lines.push(line.join(','));
    });

    return lines.join('\n');
  };

  this.createTables = function (chartInfo) {

    options = options || {};
    var that = this,
      csv_path = options.csv_path,
      el = options.element || '#datatables',
      allow_download = options.allow_download || false,
      csv_options = options.csv_options || {
        separator: ',',
        delimiter: '"'
      },
      datatables_options = options.datatables_options || {
        paging: false,
        bInfo: false,
        searching: false/*,
        scrollX: true,
        sScrollXInner: '100%',
        sScrollX: '100%'*/
      },
      table_class = options.table_class || 'table table-hover';

    // clear:
    $(el).html('');

    // loop through chartInfo.
    chartInfo.tables.forEach(function (tableData, index) {

      $(el).append($('<h3 />').text(tableData.title));

      if (tableData.data.length) {
        var currentId = 'indicatortable' + index;

        var currentTable = $('<table />').attr({
          'class': 'table-responsive ' + table_class,
          'id': currentId
        });

        var table_head = '<thead><tr>';

        tableData.headings.forEach(function (heading) {
          table_head += '<th>' + heading + '</th>';
        });

        table_head += '</tr></thead>';
        currentTable.append(table_head);
        currentTable.append('<tbody></tbody>');

        tableData.data.forEach(function (data) {
          var row_html = '<tr>';
          tableData.headings.forEach(function (heading, index) {
            row_html += '<td>' + (data[index] ? data[index] : '-') + '</td>';
          });
          row_html += '</tr>';
          currentTable.find('tbody').append(row_html);
        });

        if(window.Modernizr && window.Modernizr.blobconstructor) {
//          $(el).append($('<h5 />').text('Download Headline Data')
//            .attr({
//              'class': 'download'
//            }));
          $(el).append($('<a />').text('Download Headline Data')
            .attr({
              'href': URL.createObjectURL(new Blob([that.toCsv(tableData)], {
                type: 'text/csv'
              })),
              'download': chartInfo.indicatorId + tableData.title + '.csv',
              'title': 'Download as CSV',
              'class': 'btn btn-primary btn-download'
            })
            .data('csvdata', that.toCsv(tableData)));
        }

		  $(el).append(currentTable);

        // equal width columns:
        datatables_options.aoColumns = _.map(tableData.headings, function (h) {
          return {
            sWidth: (100 / tableData.headings.length) + '%'
          };
        });
        datatables_options.aaSorting = [];

        currentTable.DataTable(datatables_options);

      } else {
        $(el).append($('<p />').text('There is no data for this breakdown.'));
      }

      $(el).append('<hr />');
    });
  };
};
