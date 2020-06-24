const pa11y = require('pa11y');

async function runAccessibilityTests(){
    var results = await pa11y("http://example.com")
    var issues = results.issues
    
    if(issues.length > 0){
        console.log(issues);
        throw new Error("Issues found while testing for accessibility")    
    }
}

runAccessibilityTests()