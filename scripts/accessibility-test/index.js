const pa11y = require('pa11y');
const assert = require("assert")

pa11y("http://example.com").then((results) => {
    var issues = results.issues

    assert.deepEqual(issues.length, 0)
})