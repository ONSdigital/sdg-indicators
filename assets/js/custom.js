opensdg.dataRounding = function(value) {
  if (value == null) {
    return value
  }
  else {
    return value.toPrecision(3)
  }
};
