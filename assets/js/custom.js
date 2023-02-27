---
# Do not delete this line.
---
{% include custom/cookies.js %}

opensdg.dataRounding = function(value, context) {
   var digitsBeforeDecimal = String(value).split('.')[0].length;
   if (digitsBeforeDecimal > 0) {
       return Number(value.toPrecision(digitsBeforeDecimal))
   }
   else {
       return Number(value.toPrecision(3))
   }
}
