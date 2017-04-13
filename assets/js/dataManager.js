function getFields(obj) {
	return _.filter(Object.keys(data[0]), function(key) { return ['Year', 'Value'].indexOf(key) === -1; });
}

function allNull(obj, fields) {
	for(var loop = 0; loop < fields.length; loop++) {
		if(obj[fields[loop]])
    	return false;
  }
  return true;
}

function onlyPropertySet(obj, allFields, property) {
	for(var loop = 0; loop < allFields.length; loop++) {
  	if(allFields[loop] === property && !obj[allFields[loop]]) {
    	return false;	// has to have a value
    } else if(allFields[loop] !== property && obj[allFields[loop]]) {
    	return false;	// has to have no value set
    }
  }
  return true;
}

// overall:
var fields = getFields(data[0]);

// each:
[null].concat(fields).forEach(function(field) {
	var results = {
  								field: field ? field : 'Overall',
                	data: _.chain(data)
                      .filter(function(i) { return field ? onlyPropertySet(i, fields, field) : allNull(i, fields); })
                      .sortBy(function(i) { return i.Year; })
                      .value()
                };

	console.log(results);
});
