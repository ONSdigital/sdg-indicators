const pa11y = require('pa11y');
const assert = require("assert")

async function runAccessibilityTests(){
    var results = await pa11y("http://example.com")
    var issues = results.issues
    
    assert.deepEqual(issues.length, 0)
}

runAccessibilityTests()