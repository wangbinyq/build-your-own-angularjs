import parse from '../src/parse'

describe('parse', () => {

    describe('Literal Expresssions', () => {
        it('can parse an integer', () => {
            const fn = parse('42')
            expect(fn).toBeDefined()
            expect(fn()).toBe(42)
        })

        it('can parse a floating point number', () => {
            const fn = parse('4.2')
            expect(fn).toBeDefined()
            expect(fn()).toBe(4.2)
        })

        it('can parse a floating point number without an integer part', () => {
            const fn = parse('.42')
            expect(fn).toBeDefined()
            expect(fn()).toBe(.42)
        })

        it('can parse a number in scientific notation', () => {
            const fn = parse('42e3')
            expect(fn).toBeDefined()
            expect(fn()).toBe(42e3)
        })

        it('can parse scientific notation with a float coefficient', () => {
            const fn = parse('.42e2')
            expect(fn).toBeDefined()
            expect(fn()).toBe(42)
        })

        it('can parse scientific notation with negative exponents', () => {
            const fn = parse('4200e-2')
            expect(fn).toBeDefined()
            expect(fn()).toBe(42)
        })

        it('can parse scientific notation with the + sign', () => {
            const fn = parse('.42e+2')
            expect(fn).toBeDefined()
            expect(fn()).toBe(42)
        })

        it('can parse upper case scientific notation', () => {
            const fn = parse('4200E-2')
            expect(fn).toBeDefined()
            expect(fn()).toBe(42)
        })

        it('will not parse invalid scientific notation', () => {
            expect(function() {
                parse('42e-')
            }).toThrow()
            expect(function() {
                parse('42e-a')
            }).toThrow()
        })

        it('can parse a string in single quotes', () => {
            const fn = parse("'abc'")
            expect(fn()).toBe('abc')
        })

        it('can parse a string in double quotes', () => {
            const fn = parse('"abc"')
            expect(fn()).toBe('abc')
        })

        it('will not parse a string with mismatching quotes', () => {
            expect(function() {
                parse('"abc\'')
            }).toThrow()
        })

        it('can parse a string with single quotes inside', () => {
            const fn = parse("'a\\\'b'")
            expect(fn()).toBe('a\'b')
        })

        it('can parse a string with double quotes inside', () => {
            const fn = parse("'a\\\"b'")
            expect(fn()).toBe('a"b')
        })

        it('will parse a string with unicode escapes', () => {
            const fn = parse('"\\u00A0"')
            expect(fn()).toBe('\u00A0')
        })

        it('will not parse a string with invalid unicode escapes', () => {
            expect(function() {
                parse('"\\u00T0"')
            }).toThrow()
        })

        it('will parse null', () => {
            const fn = parse('null')
            expect(fn()).toBe(null)
        })

        it('will parse false', () => {
            const fn = parse('false')
            expect(fn()).toBe(false)
        })

        it('will parse true', () => {
            const fn = parse('true')
            expect(fn()).toBe(true)
        })

        it('ignores whitespace', () => {
            const fn = parse('  \n42  ')
            expect(fn()).toBe(42)
        })

        it('will parse an empty array', () => {
            const fn = parse('[]')
            expect(fn()).toEqual([])
        })

        it('will parse a non-empty array', () => {
            const fn = parse('[1, "two", [3], true]')
            expect(fn()).toEqual([1, 'two', [3], true])
        })

        it('will parse an array with trailing commas', () => {
            const fn = parse('[1, "two", [3], true], ')
            expect(fn()).toEqual([1, 'two', [3], true])
        })

        it('will parse an empty object', () => {
            expect(parse('{}')()).toEqual({})
        })

        it('will parse a non-empty object', () => {
            expect(parse('{"a key": 1, "another-key": 2}')()).toEqual({
                'a key': 1,
                'another-key': 2
            })
        })

        it('will parse an object with identifier keys', () => {
            expect(parse('{a: 1, b: [2, 3], c: {d: 4}}')()).toEqual({
                a: 1,
                b: [2, 3],
                c: {
                    d: 4
                }
            })
        })
    })

    describe('Lookup and Function Call Expresssions', () => {
        it('looks up an attribute from the scope', () => {
            const fn = parse('aKey')
            expect(fn({aKey: 42})).toBe(42)
            expect(fn({})).toBeUndefined()
        })

        it('returns undefined when looking up attribute from undefined', () => {
            const fn = parse('aKey')
            expect(fn({aKey: 42})).toBe(42)
            expect(fn()).toBeUndefined()            
        })

        it('will parse this', () => {
            const scope = {}
            const fn = parse('this')
            expect(fn(scope)).toBe(scope)
            expect(fn()).toBeUndefined()
        })

        it('looks up a 2-part identifier path from the scope', () => {
            var fn = parse('aKey.anotherKey')
            expect(fn({aKey: {anotherKey: 42}})).toBe(42)
            expect(fn({aKey: {}})).toBeUndefined()
            expect(fn({})).toBeUndefined()
            expect(fn()).toBeUndefined()
        })

        it('looks up a member from an object', () => {
            var fn = parse('{aKey: 42}.aKey')
            expect(fn()).toBe(42)
        })

        it('looks up a 4-part identifier path from the scope', () => {
            var fn = parse('aKey.secondKey.thirdKey.fourthKey')
            expect(fn({aKey: {secondKey: {thirdKey: {fourthKey: 42}}}})).toBe(42)
            expect(fn({aKey: {secondKey: {thirdKey: {}}}})).toBeUndefined()
            expect(fn({aKey: {}})).toBeUndefined()
            expect(fn()).toBeUndefined()
        })

        it('uses locals instead of scope when there is a matching key', () => {
            var fn = parse('aKey')
            var scope = {aKey: 42}
            var locals = {aKey: 43}
            expect(fn(scope, locals)).toBe(43)
        })

        it('does not use locals instead of scope when no matching key', () => {
            var fn = parse('aKey')
            var scope = {aKey: 42}
            var locals = {otherKey: 43}
            expect(fn(scope, locals)).toBe(42)            
        })

        it('uses locals instead of scope when the first part matches', () => {
            var fn = parse('aKey.anotherKey')
            var scope = {aKey: {anotherKey: 42}}
            var locals = {aKey: {}}
            expect(fn(scope, locals)).toBeUndefined()
        })
    })

})