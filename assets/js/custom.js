---
# Do not delete this line.
---
 opensdg.dataRounding = function(value, context) {
    // Round to 4 SF in indicator 5.3.2.
    if (context.indicatorId === 'indicator_5-3-2') {
        return return Number(value.toPrecision(4))
       }
    // Otherwise round to 3 decimal places.
    else {
        return Math.round(value * 1000) / 1000;
    }
}
    
