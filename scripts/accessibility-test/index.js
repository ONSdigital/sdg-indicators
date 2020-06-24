const pa11y = require('pa11y');
const assert = require("assert")

describe("example.com", function(){
    describe("Accesibility test", function(){
        it("should pass with no issues", function(){
            pa11y("http://example.com").then((results) => {
                var issues = results.issues

                assert.equal(issues.length, 0)
            })
        })
    })
})