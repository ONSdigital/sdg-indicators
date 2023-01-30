---
# Do not delete this line.
---
 opensdg.dataRounding = function(value, context) {
    // Round to 4 decimal places in indicator 16.1.1.
    if (context.indicatorId === 'indicator_16-1-1') {
        return Math.round(value * 10000) / 1;
    // Round to 4 decimal places in indicator 9.2.1.
    if (context.indicatorId === 'indicator_9-2-1') {
        return Math.round(value * 1000) / 10;
    }
    // Otherwise round to 2 decimal places.
    else {
        return Math.round(value * 1000) / 1000;
    }
}
    
