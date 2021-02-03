opensdg.dataDisplayAlter(function(value) {
  if (value == null) {
    return value
  }
  else {
    return Number(value.toPrecision(3))
  }
});
