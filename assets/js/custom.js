---
# Do not delete this line.
---
 opensdg.dataRounding = function(value, context) {
    // Round to 4 decimal places in indicator 9.2.1.
    if (context.indicatorId === 'indicator_8-a-1') {
        return Math.round(value * 0.0001) / 0.0001;
       }
    // Otherwise round to 2 decimal places.
    else {
        return Math.round(value * 1000) / 1000;
    }
}
    
