var indicatorView = function(model, options) {

  "use strict";

  var view_obj = this;

  this._fieldLimit = 2;
  this._model = model;

  this._chartInstance = undefined;
  this._rootElement = options.rootElement;

  this._model.onDataComplete.attach(function(sender, args) {
    view_obj.createPlot(args);
    view_obj.createTables(args);
  });

  this._model.onSeriesComplete.attach(function(sender, args) {
    view_obj.initialiseSeries(args);
  });

  this._model.onSeriesSelectedChanged.attach(function(sender, args) {
    var selector;
    if(args.series.length === view_obj._fieldLimit) {
      selector = $('#fields input:not(:checked)');
      selector.attr('disabled', true);
      selector.parent().addClass('disabled').attr('title', 'Maximum of ' + view_obj._fieldLimit + ' selections; unselect another to select this field');
    } else {
      selector = $('#fields input');
      selector.removeAttr('disabled');
      selector.parent().removeClass('disabled').removeAttr('title');
    }
  });

  $(this._rootElement).on('click', 'input:checkbox', function() {
    var selectedFields = [];

    $('#fields input:checked').each(function(i, field) {
      selectedFields.push($(field).val());
    });

    view_obj._model.updateSelectedFields(selectedFields);
  });

  this.initialiseSeries = function(args) {
    args.series.forEach(function(series) {
      $('#fields').append($('<label/>').text(series).append($('<input/>')
        .attr({
          'type': 'checkbox',
          'value': series,
        })));
    });
  };

  this.createPlot = function(chartInfo) {

    if(this._chartInstance) {
      this._chartInstance.destroy();
    }

    this._chartInstance = new Chart($(this._rootElement).find('canvas'), {
      type: 'line',
      data: chartInfo,
      options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
                gridLines: {
                    color: '#ccc',
                }
            }],
            yAxes: [{
              ticks: {
                  suggestedMin: 0
              }
            }]
          },
          legend: {
            display: true
          }
      }
    });
  };

  this.toCsv = function(tableData) {
    var lines = [],
        headings = tableData.headings;

    lines.push(headings.join(','));

    _.each(tableData.data, function(dataValues) {
      var line = [];

      _.each(headings, function(heading) {
          line.push(dataValues[heading]);
      });

      lines.push(line.join(','));
    });

    return lines.join('\n');
  };

  this.createTables = function(chartInfo, options) {

    options = options || {};
    var that = this,
        csv_path = options.csv_path,
        el = options.element || '#datatables',
        allow_download = options.allow_download || false,
        csv_options = options.csv_options || {separator: ',', delimiter: '"'},
        datatables_options = options.datatables_options || { paging: false, bInfo: false, searching: false},
        table_class = options.table_class || 'table table-hover';

    // clear:
    $(el).html('');

    // loop through chartInfo.
    chartInfo.tables.forEach(function(tableData, index) {

      $(el).append($('<h3 />').text(tableData.title));
      $(el).append($('<a />').text('Download data')
          .attr({
            'href': URL.createObjectURL(new Blob([that.toCsv(tableData)], { type: 'text/csv' })),
            'download': that.id + tableData.title + '.csv',
            'class': 'btn btn-primary'
          })
          .data('csvdata', that.toCsv(tableData)));

      var currentId = 'indicatortable' + index;

      var currentTable = $('<table />').attr({
        'class': 'table-responsive ' + table_class,
        'id' : currentId
      });

      $(el).append(currentTable);

      var table_head = '<thead><tr>';

      tableData.headings.forEach(function(heading) {
        table_head += '<th>' + heading + '</th>';
      });

      table_head += '</tr></thead>';
      currentTable.append(table_head);
      currentTable.append('<tbody></tbody>');

      tableData.data.forEach(function(data) {
        var row_html = '<tr>';
        tableData.headings.forEach(function(heading) {
          row_html += '<td>' + data[heading] + '</td>';
        });
        row_html += '</tr>';
        currentTable.find('tbody').append(row_html);
      });

      currentTable.DataTable(datatables_options);
    });
  };
};
