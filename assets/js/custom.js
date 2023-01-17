---
# Do not delete this line.
---
{% include custom/cookies.js %}

opensdg.dataRounding = function(value) {
  if (value == null) {
    return value
  }
  else {
    return Number(value.toPrecision(3))
  }
};
function myMapColorFunction(indicatorId, goalId) {
  if (goalId == 3) {
    return chroma.brewer.Greens;
  }
  if (goalId == 11) {
    return chroma.brewer.Oranges;
  }
  else {
    return opensdg.mapColors.default;
  }
}
