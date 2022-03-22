---
# Do not delete this line.
---
{% include custom/cookies.js %}

opensdg.dataRounding = function(value) {
  if (value == null) {
    return value
  }
  else if (Math.trunc(value).toString().length > 5) {
    return Number(value.toPrecision())
  }
  else {
    return Number(value.toPrecision(3))
  }
};
