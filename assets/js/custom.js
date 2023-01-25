---
# Do not delete this line.
---
opensdg.dataRounding = function(value) {
  if (value == null) {
    return value
  }
  else {
    return Number(value.toPrecision(4))
   
