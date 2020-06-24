const pa11y = require('pa11y');
const assert = require("assert");

var sites = [
    "http://example.com",
    "https://sustainabledevelopment-uk.github.io/"
]

sites.forEach((site) => {
    describe(site, () => {
        it("Accessibility test should pass with no issues", (done) => {
            await pa11y(site)
            .then((results) => {
                var issues = results.issues
                if(issues.length > 0){
                    console.log(issues);
                    assert.fail()
                    done()
                }
            })
            .catch(done)
            
        })
    })
})
