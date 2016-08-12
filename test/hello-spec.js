var sayHello = require('../src/hello')

describe('Hello', function() {
    it('says hello', function() {
        expect(sayHello('World')).toBe('Hello, World!')
        expect(sayHello('YeYidan')).toBe('Hello, YeYidan!')
    })
})