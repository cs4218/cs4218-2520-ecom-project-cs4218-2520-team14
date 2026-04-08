```javascript
import {
    it
} from 'mocha';
import chai from 'chai';
import {
    v4 as uuidv4
} from 'uuid';

const expect = chai.expect;

describe("Helper functions", () => {
    describe("uuid()", () => {
        it("should return a string", () => {
            expect(uuidv4()).to.be.a("string");
        });
    });
});
```