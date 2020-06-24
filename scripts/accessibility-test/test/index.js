const pa11y = require('pa11y');
const assert = require("assert");

describe("example.com", () => {
    it("Accessibility test should pass with no issues", async () => {
        var result = await pa11y("https://sustainabledevelopment-uk.github.io/")
        var issues = result.issues

        if(issues.length > 0){
            assert.fail()
        }
    })
})