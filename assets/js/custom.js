---
# Do not delete this line.
---
 opensdg.dataRounding = function(value, context) {
    // Round to 4 decimal places in indicator 9.2.1.
    if (context.indicatorId === 'indicator_5-3-2') {
        return Math.round(value * 1000) / 1000;
       }
    // Otherwise round to 2 decimal places.
    else {
        return Math.round(value * 1000) / 1000;
    }
}
    
