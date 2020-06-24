const pa11y = require('pa11y');
const assert = require("assert");

var sites = [
    "http://example.com",
    "https://sustainabledevelopment-uk.github.io/"
]

sites.forEach((site) => {
    describe(site, () => {
        it("Accessibility test should pass with no issues", async () => {
            var result = await pa11y(site)
            var issues = result.issues
    
            if(issues.length > 0){
                assert.fail()
            }
        })
    })
})
