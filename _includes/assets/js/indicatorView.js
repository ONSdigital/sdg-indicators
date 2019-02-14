var indicatorView = function (model, options) {

  "use strict";

  var view_obj = this;
  this._model = model;

  this._chartInstance = undefined;
  this._rootElement = options.rootElement;
  this._tableColumnDefs = options.tableColumnDefs;
  this._mapView = undefined;
  this._legendElement = options.legendElement;

  var chartHeight = screen.height < options.maxChartHeight ? screen.height : options.maxChartHeight;

  $('.plot-container', this._rootElement).css('height', chartHeight + 'px');

  $(document).ready(function() {
    $(view_obj._rootElement).find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      if($(e.target).attr('href') == '#tableview') {
        setDataTableWidth($(view_obj._rootElement).find('#selectionsTable table'));
      } else {
        $($.fn.dataTable.tables(true)).css('width', '100%');
        $($.fn.dataTable.tables(true)).DataTable().columns.adjust().draw();
      }
    });

    $(view_obj._legendElement).on('click', 'li', function(e) {
      $(this).toggleClass('notshown');

      var ci = view_obj._chartInstance,
          index = $(this).data('datasetindex'),
          meta = ci.getDatasetMeta(index);

      meta.hidden = meta.hidden === null? !ci.data.datasets[index].hidden : null;
      ci.update();
    });
  });

  this._model.onDataComplete.attach(function (sender, args) {

    if(view_obj._model.showData) {

      $('#dataset-size-warning')[args.datasetCountExceedsMax ? 'show' : 'hide']();

      if(!view_obj._chartInstance) {
        view_obj.createPlot(args);
      } else {
        view_obj.updatePlot(args);
      }
    }

    view_obj.createSelectionsTable(args);
  });

  this._model.onNoHeadlineData.attach(function() {
    $('#fields .variable-options :checkbox:eq(0)').trigger('click');
  });

  this._model.onSeriesComplete.attach(function(sender, args) {
    view_obj.initialiseSeries(args);

    if(args.hasGeoData && args.showMap) {
      view_obj._mapView = new mapView();
      view_obj._mapView.initialise(args.geoData, args.geoCodeRegEx);
    }
  });

  this._model.onSeriesSelectedChanged.attach(function(sender, args) {
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

    // reset available/unavailable fields
    updateWithSelectedFields();

    // #246
    $(view_obj._rootElement).find('.selected').css('width', '0');
    // end of #246
  });

  this._model.onSelectionUpdate.attach(function(sender, args) {
    $(view_obj._rootElement).find('#clear')[args.selectedFields.length ? 'removeClass' : 'addClass']('disabled');

    // loop through the available fields:
    $('.variable-selector').each(function(index, element) {
      var currentField = $(element).data('field');

      // any info?
      var match = _.findWhere(args.selectedFields, { field : currentField });
      var element = $(view_obj._rootElement).find('.variable-selector[data-field="' + currentField + '"]');
      var width = match ? (Number(match.values.length / element.find('.variable-options label').length) * 100) + '%' : '0';

      $(element).find('.bar .selected').css('width', width);

      // is this an allowed field:
      $(element)[_.contains(args.allowedFields, currentField) ? 'removeClass' : 'addClass']('disallowed');
    });
  });

  this._model.onFieldsStatusUpdated.attach(function (sender, args) {
    //console.log('updating field states with: ', args);

    // reset:
    $(view_obj._rootElement).find('label').removeClass('selected possible excluded');

    _.each(args.data, function(fieldGroup) {
      _.each(fieldGroup.values, function(fieldItem) {
        var element = $(view_obj._rootElement).find(':checkbox[value="' + fieldItem.value + '"][data-field="' + fieldGroup.field + '"]');
        element.parent().addClass(fieldItem.state).attr('data-has-data', fieldItem.hasData);
      });
      // Indicate whether the fieldGroup had any data.
      var fieldGroupElement = $(view_obj._rootElement).find('.variable-selector[data-field="' + fieldGroup.field + '"]');
      fieldGroupElement.attr('data-has-data', fieldGroup.hasData);

      // Re-sort the items.
      view_obj.sortFieldGroup(fieldGroupElement);
    });

    _.each(args.selectionStates, function(ss) {
      // find the appropriate 'bar'
      var element = $(view_obj._rootElement).find('.variable-selector[data-field="' + ss.field + '"]');
      element.find('.bar .default').css('width', ss.fieldSelection.defaultState + '%');
      element.find('.bar .possible').css('width', ss.fieldSelection.possibleState + '%');
      element.find('.bar .excluded').css('width', ss.fieldSelection.excludedState + '%');
    });
  });

  $(this._rootElement).on('click', '#clear', function() {
    view_obj._model.clearSelectedFields();
  });

  $(this._rootElement).on('click', '#fields label', function (e) {

    if(!$(this).closest('.variable-options').hasClass('disallowed')) {
      $(this).find(':checkbox').trigger('click');
    }

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
    }).value());
  }

  $(this._rootElement).on('click', '.variable-options button', function(e) {
    var type = $(this).data('type');
    var $options = $(this).closest('.variable-options').find(':checkbox');

    // The clear button can clear all checkboxes.
    if (type == 'clear') {
      $options.prop('checked', false);
    }
    // The select button must only select checkboxes that have data.
    if (type == 'select') {
      $options.parent().not('[data-has-data=false]').find(':checkbox').prop('checked', true)
    }

    updateWithSelectedFields();

    e.stopPropagation();
  });

  $(this._rootElement).on('click', ':checkbox', function(e) {

    // don't permit excluded selections:
    if($(this).parent().hasClass('excluded') || $(this).closest('.variable-selector').hasClass('disallowed')) {
      return;
    }

    updateWithSelectedFields();

    e.stopPropagation();
  });

  $(this._rootElement).on('click', '.variable-selector', function(e) {

    var options = $(this).find('.variable-options');
    var optionsVisible = options.is(':visible');
    $(options)[optionsVisible ? 'hide' : 'show']();

    e.stopPropagation();
  });

  this.initialiseSeries = function(args) {
    if(args.series.length) {
      var template = _.template($("#item_template").html());

      if(!$('button#clear').length) {
        $('<button id="clear" class="disabled">' + translations.indicator.clear_selections + ' <i class="fa fa-remove"></i></button>').insertBefore('#fields');
      }

      $('#fields').html(template({
        series: args.series,
        allowedFields: args.allowedFields,
        edges: args.edges
      }));

      $(this._rootElement).removeClass('no-series');

    } else {
      $(this._rootElement).addClass('no-series');
    }
  };

  this.initialiseUnits = function(args) {
    var template = _.template($('#units_template').html()),
        units = args.units || [];

    $('#units').html(template({
      units: units
    }));

    if(!units.length) {
      $(this._rootElement).addClass('no-units');
    }
  };

  this.updatePlot = function(chartInfo) {
    view_obj._chartInstance.data.datasets = chartInfo.datasets;

    if(chartInfo.selectedUnit) {
      view_obj._chartInstance.options.scales.yAxes[0].scaleLabel.labelString = chartInfo.selectedUnit;
    }

    view_obj._chartInstance.update(1000, true);

    $(this._legendElement).html(view_obj._chartInstance.generateLegend());
  };

  this.createPlot = function (chartInfo) {

    var that = this;

    var chartConfig = {
      type: this._model.graphType,
      data: chartInfo,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        spanGaps: true,
        scrollX: true,
        scrollCollapse: true,
        sScrollXInner: '150%',
        scales: {
          xAxes: [{
            maxBarThickness: 150,
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
            // default of 85, but do a rough line count based on 150
            // characters per line * 20 pixels per row
            bottom: that._model.footnote ? (20 * (that._model.footnote.length / 150)) + 85 : 85
          }
        },
        legendCallback: function(chart) {
            var text = ['<ul id="legend">'];

            _.each(chart.data.datasets, function(dataset, datasetIndex) {
              text.push('<li data-datasetindex="' + datasetIndex + '">');
              text.push('<span class="swatch' + (dataset.borderDash ? ' dashed' : '') + '" style="background-color: ' + dataset.backgroundColor + '">');
              text.push('</span>');
              text.push(dataset.label);
              text.push('</li>');
            });

            text.push('</ul>');
            return text.join('');
        },
        legend: {
          display: false
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
    };
    if (typeof chartConfigOverrides !== 'undefined') {
      $.extend(true, chartConfig, chartConfigOverrides);
    }

    this._chartInstance = new Chart($(this._rootElement).find('canvas'), chartConfig);

    Chart.pluginService.register({
      afterDraw: function(chart) {
        var $canvas = $(that._rootElement).find('canvas'),
        font = '12px Arial',
        canvas = $canvas.get(0),
        textRowHeight = 20,
        ctx = canvas.getContext("2d");

        ctx.font = font;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#6e6e6e';

        var getLinesFromText = function(text) {
          var width = parseInt($canvas.css('width')), //width(),
          lines = [],
          line = '',
          lineTest = '',
          words = text.split(' ');

          for (var i = 0, len = words.length; i < len; i++) {
            lineTest = line + words[i] + ' ';

            // Check total width of line or last word
            if (ctx.measureText(lineTest).width > width) {
              // Record and reset the current line
              lines.push(line);
              line = words[i] + ' ';
            } else {
              line = lineTest;
            }
          }

          // catch left overs:
          if (line.length > 0) {
            lines.push(line.trim());
          }

          return lines;
        };

        function putTextOutputs(textOutputs, x) {
          var y = $canvas.height() - 10 - ((textOutputs.length - 1) * textRowHeight);

          _.each(textOutputs, function(textOutput) {
            ctx.fillText(textOutput, x, y);
            y += textRowHeight;
          });
        }

        // TODO Merge this with the that.footerFields object used by table
        var graphFooterItems = [];
        if (that._model.dataSource) {
          graphFooterItems.push(translations.indicator.source + ': ' + that._model.dataSource);
        }
        if (that._model.geographicalArea) {
          graphFooterItems.push(translations.indicator.geographical_area + ': ' + that._model.geographicalArea);
        }
        if (that._model.measurementUnit) {
          graphFooterItems.push(translations.indicator.unit_of_measurement + ': ' + that._model.measurementUnit);
        }

        if(that._model.footnote) {
          var footnoteRows = getLinesFromText('Footnote: ' + that._model.footnote);
          graphFooterItems = graphFooterItems.concat(footnoteRows);

          if(footnoteRows.length > 1) {
            //that._chartInstance.options.layout.padding.bottom += textRowHeight * footnoteRows.length;
            that._chartInstance.resize(parseInt($canvas.css('width')), parseInt($canvas.css('height')) + textRowHeight * footnoteRows.length);
            that._chartInstance.resize();
          }
        }

        putTextOutputs(graphFooterItems, 0);
      }
    });

    $(this._legendElement).html(view_obj._chartInstance.generateLegend());
  };

  this.toCsv = function (tableData) {
    var lines = [],
    headings = _.map(tableData.headings, function(heading) { return '"' + heading + '"'; });

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

  var setDataTableWidth = function(table) {
    table.find('th').each(function() {
      var textLength = $(this).text().length;
      for(var loop = 0; loop < view_obj._tableColumnDefs.length; loop++) {
        var def = view_obj._tableColumnDefs[loop];
        if(textLength < def.maxCharCount) {
          if(!def.width) {
            $(this).css('white-space', 'nowrap');
          } else {
            $(this).css('width', def.width + 'px');
            $(this).data('width', def.width);
          }
          break;
        }
      }
    });

    table.removeAttr('style width');

    var totalWidth = 0;
    table.find('th').each(function() {
      if($(this).data('width')) {
        totalWidth += $(this).data('width');
      } else {
        totalWidth += $(this).width();
      }
    });

    // ascertain whether the table should be width 100% or explicit width:
    var containerWidth = table.closest('.dataTables_wrapper').width();

    if(totalWidth > containerWidth) {
      table.css('width', totalWidth + 'px');
    } else {
      table.css('width', '100%');
    }
  };

  var initialiseDataTable = function(el) {
    var datatables_options = options.datatables_options || {
      paging: false,
      bInfo: false,
      bAutoWidth: false,
      searching: false,
      responsive: false,
      order: [[0, 'asc']]
    }, table = $(el).find('table');

    datatables_options.aaSorting = [];

    table.DataTable(datatables_options);

    setDataTableWidth(table);
  };

  this.createSelectionsTable = function(chartInfo) {
    this.createTable(chartInfo.selectionsTable, chartInfo.indicatorId, '#selectionsTable', true);
    this.createTableFooter(chartInfo.footerFields, '#selectionsTable');
    this.createDownloadButton(chartInfo.selectionsTable, 'Table', chartInfo.indicatorId, '#selectionsTable');
    this.createSourceButton(chartInfo.shortIndicatorId, '#selectionsTable');
    // Chart buttons
    $('#chartSelectionDownload').empty();
    this.createDownloadButton(chartInfo.selectionsTable, 'Chart', chartInfo.indicatorId, '#chartSelectionDownload');
    this.createSourceButton(chartInfo.shortIndicatorId, '#chartSelectionDownload');
  };

  this.createDownloadButton = function(table, name, indicatorId, el) {
    if(window.Modernizr.blobconstructor) {
      var downloadKey = 'download_csv';
      if (name == 'Chart') {
        downloadKey = 'download_chart';
      }
      if (name == 'Table') {
        downloadKey = 'download_table';
      }
      $(el).append($('<a />').text(translations.indicator[downloadKey])
      .attr({
        'href': URL.createObjectURL(new Blob([this.toCsv(table)], {
          type: 'text/csv'
        })),
        'onClick': 'ga("send", "event", "Downloads", "Download CSV", "' + translations.indicator.download_csv_title + '")',
        'download': indicatorId + '.csv',
        'title': translations.indicator.download_csv_title,
        'class': 'btn btn-primary btn-download',
        'tabindex': 0
      })
      .data('csvdata', this.toCsv(table)));
    } else {
      var headlineId = indicatorId.replace('indicator', 'headline');
      var id = indicatorId.replace('indicator', '');
      $(el).append($('<a />').text(translations.indicator.download_headline)
      .attr({
        'href': remoteDataBaseUrl + '/headline/' + id + '.csv',
        'onClick': 'ga("send", "event", "Downloads", "Download CSV", "' + translations.indicator.download_headline_title + '")',
        'download': headlineId + '.csv',
        'title': translations.indicator.download_headline_title,
        'class': 'btn btn-primary btn-download',
        'tabindex': 0
      }));
    }
  }

  this.createSourceButton = function(indicatorId, el) {
    $(el).append($('<a />').text(translations.indicator.download_source)
    .attr({
      'href': remoteDataBaseUrl + '/data/' + indicatorId + '.csv',
      'onClick': 'ga("send", "event", "Downloads", "Download CSV", "' + translations.indicator.download_source + '")',
      'download': indicatorId + '.csv',
      'title': translations.indicator.download_source_title,
      'class': 'btn btn-primary btn-download',
      'tabindex': 0
    }));
  }

  this.createTable = function(table, indicatorId, el) {

    options = options || {};
    var that = this,
    csv_path = options.csv_path,
    allow_download = options.allow_download || false,
    csv_options = options.csv_options || {
      separator: ',',
      delimiter: '"'
    },
    table_class = options.table_class || 'table table-hover';

    // clear:
    $(el).html('');

    if(table && table.data.length) {
      var currentTable = $('<table />').attr({
        'class': /*'table-responsive ' +*/ table_class,
        'width': '100%'
        //'id': currentId
      });

      currentTable.append('<caption>' + that._model.chartTitle + '</caption>');

      var table_head = '<thead><tr>';

      var getHeading = function(heading, index) {
        var span = '<span class="sort" />';
        var span_heading = '<span>' + heading + '</span>';
        return (!index || heading.toLowerCase() == 'units') ? span_heading + span : span + span_heading;
      };

      table.headings.forEach(function (heading, index) {
        table_head += '<th' + (!index || heading.toLowerCase() == 'units' ? '': ' class="table-value"') + ' scope="col">' + getHeading(heading, index) + '</th>';
      });

      table_head += '</tr></thead>';
      currentTable.append(table_head);
      currentTable.append('<tbody></tbody>');

      table.data.forEach(function (data) {
        var row_html = '<tr>';
        table.headings.forEach(function (heading, index) {
          row_html += '<td' + (!index || heading.toLowerCase() == 'units' ? '' : ' class="table-value"') + '>' + (data[index] ? data[index] : '-') + '</td>';
        });
        row_html += '</tr>';
        currentTable.find('tbody').append(row_html);
      });

      $(el).append(currentTable);

      // initialise data table
      initialiseDataTable(el);

    } else {
      $(el).append($('<p />').text('There is no data for this breakdown.'));
    }
  };

  this.createTableFooter = function(footerFields, el) {
    var footdiv = $('<div />').attr({
      'id': 'selectionTableFooter',
      'class': 'table-footer-text'
    });

    _.each(footerFields, function(val, key) {
      if(val) footdiv.append($('<p />').text(key + ': ' + val));
    });

    $(el).append(footdiv);
  };

  this.sortFieldGroup = function(fieldGroupElement) {
    var sortLabels = function(a, b) {
      var aObj = { hasData: $(a).attr('data-has-data'), text: $(a).text() };
      var bObj = { hasData: $(b).attr('data-has-data'), text: $(b).text() };
      if (aObj.hasData == bObj.hasData) {
        return (aObj.text > bObj.text) ? 1 : -1;
      }
      return (aObj.hasData < bObj.hasData) ? 1 : -1;
    };
    fieldGroupElement.find('label')
    .sort(sortLabels)
    .appendTo(fieldGroupElement.find('.variable-options'));
  }
};
