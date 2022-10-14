---
# Do not delete this line.
---
opensdg.dataRounding = function(value, context) {
    // Round to 4 decimal places in indicator 3.1.1.
    if (context.indicatorId === 'indicator_3-1-1') {
        return Math.round(value * 10000) / 10000;
    }
    // Otherwise round to 2 decimal places.
    else {
        return Math.round(value * 100) / 100;
    }
}
