const pa11y = require('pa11y');
const assert = require("assert")

describe("example.com", function(){
    describe("Accesibility test", function(){
        it("should pass with no issues", async function(){
            var result = await pa11y("http://example.com")
            var issues = result.issues

            if(issues.length > 0){
                console.log(issues);
                assert.fail()
            }
        })
    })
})