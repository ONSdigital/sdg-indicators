const pa11y = require('pa11y');

async function runAccessibilityTests(){
    var results = await pa11y("http://example.com")
    console.log(results);
    
}

runAccessibilityTests()