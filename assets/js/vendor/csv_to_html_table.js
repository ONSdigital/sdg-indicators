function init_table(options) {

  options = options || {};
  var csv_path = options.csv_path,
      el = options.element || 'table-container',
      allow_download = options.allow_download || false,
      csv_options = options.csv_options || {separator: ',', delimiter: '"'},
      datatables_options = options.datatables_options || { paging: false, bInfo: false, searching: false},
      table_class = options.table_class || 'table table-hover';

  $("#" + el).html('<table class="' + table_class + '" id="my-table"></table>');
  var table = $('#' + el).find('table');

  $.when($.get(csv_path)).then(
    function(data){      
      var csv_data = $.csv.toArrays(data, csv_options);

      var table_head = '<thead><tr>';

      for (head_id = 0; head_id < csv_data[0].length; head_id++) { 
        table_head += '<th>' + csv_data[0][head_id] + '</th>';
      }

      table_head += '</tr></thead>';
      table.append(table_head);
      table.append('<tbody></tbody>');

      for (var row_id = 1; row_id < csv_data.length; row_id++) { 
        var row_html = '<tr>';

        for (col_id = 0; col_id < csv_data[row_id].length; col_id++) { 
          row_html += '<td>' + csv_data[row_id][col_id] + '</td>';
        } 
          
        row_html += '</tr>';

        table.find('tbody').append(row_html);
      }

      table.DataTable(datatables_options);

      // if (allow_download)
      //   $("#" + el).append("<p><a class='btn btn-info' href='" + csv_path + "'><i class='glyphicon glyphicon-download'></i> Download as CSV</a></p>");
    });
}