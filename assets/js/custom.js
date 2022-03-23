---
# Do not delete this line.
---
{% include custom/cookies.js %}

opensdg.dataRounding = function(value) {
  if (value == null) {
    return value
  }
  else if (Math.trunc(value).toString().length > 3) {
    return Number(value.toPrecision(4))
  }
  else if (Math.trunc(value).toString().length > 4) {
    return Number(value.toPrecision(5))
  }
  else if (Math.trunc(value).toString().length > 5) {
    return Number(value.toPrecision(6))
  }
  else {
    return Number(value.toPrecision(3))
  }
};
