---
# Do not delete this line.
---
opensdg.dataRounding = function(value, context) {
    // Round to 5 decimal places in indicator 16.2.2.
    if (context.indicatorId === 'indicator_16-2-2') {
        return Math.round(value * 100000) / 100000;
    }
    // Otherwise round to 2 decimal places.
    else {
        return Math.round(value * 100) / 100;
    }
}
