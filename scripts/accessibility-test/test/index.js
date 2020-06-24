const pa11y = require('pa11y');
const assert = require("assert");

var sites = [
    "https://sustainabledevelopment-uk.github.io/",
    "https://sustainabledevelopment-uk.github.io/1"
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

for (var i = 0; i < sites.length; i++) {
    var site = sites[i]
    for (var a = 0; a < Object.keys(configurations).length; a++) {
        var configurationName = Object.keys(configurations)[a]
        var configuration = configurations[configurationName]

        describe(`${site} on ${configurationName}`, () => {
            it("should pass accessibility tests", (done) => {
                pa11y(site, configuration)
                .then((result) => {
                    var issues = result.issues

                    if(issues.length > 0){
                        console.log(issues)
                        assert.fail()
                    }
                    done()
                })
                .catch(done)
            })
        })
    }
}