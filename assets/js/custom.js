opensdg.dataRounding = function(value) {
  var mult = Math.pow(10, 3 - Math.floor(Math.log(value) / Math.LN10) - 1);
  return Math.round(value * mult) / mult;
};
