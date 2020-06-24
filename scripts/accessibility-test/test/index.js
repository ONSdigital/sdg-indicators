const pa11y = require('pa11y');
const assert = require("assert");

var sites = [
    "http://example.com",
    "https://sustainabledevelopment-uk.github.io/"
]

var configurations = {
    "desktop": {},
    "highContrast": {
        "actions": [
            "click element .navbar ul.navbar-nav li.contrast-high a"
        ],
        "chromeLaunchConfig": {
            "args": ["--no-sandbox"]
        } 
    },
    "mobile": {
        "viewport": {
            "width": 320,
            "height": 480
        }
    }
}

sites.forEach((site) => {
    Object.keys(configurations).forEach((configuration) => {
        describe(`${site} on ${configuration}`, () => {
            it("Accessibility test should pass with no issues", (done) => {
                pa11y(site, configuration)
                .then((results) => {
                    var issues = results.issues
                    if(issues.length > 0){
                        console.log(issues);
                        assert.fail()
                    }
                    done()
                })
                .catch(done)
                
            })
        })
    })
    
})
