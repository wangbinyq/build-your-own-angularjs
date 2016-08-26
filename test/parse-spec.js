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
            const fn = parse('[1, "two", [3], true, ] ')
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

        it('parses a simple computed property access', () => {
            const fn = parse('aKey["anotherKey"]')
            expect(fn({aKey: {anotherKey: 42}})).toBe(42)
        })
        
        it('parses a computed numeric array access', () => {
            var fn = parse('anArray[1]')
            expect(fn({anArray: [1, 2, 3]})).toBe(2)
        })

        it('parses a computed access with another key as property', () => {
            var fn = parse('lock[key]')
            expect(fn({key: 'theKey', lock: {theKey: 42}})).toBe(42)
        })

        it('parses computed access with another access as property' , () => {
            var fn = parse('lock[keys["aKey"]]')
            expect(fn({keys: {aKey: 'theKey'}, lock: {theKey: 42}})).toBe(42)
        })

        it('parses a function call', () => {
            var fn = parse('aFunction()')
            expect(fn({aFunction:() => {return 42}})).toBe(42)
        })

        it('parses a function call with a single number argument', () => {
            var fn = parse('aFunction(42)')
            expect(fn({aFunction: (a) => {return a}})).toBe(42)
        })

        it('parses a function call with a single identifier argument', () => {
            var fn = parse('aFunction(n)')
            expect(fn({n: 42, aFunction: (a) => {return a}})).toBe(42)
        })

        it('parses a function call with a single function call argument', () => {
            var fn = parse('aFunction(n())')
            expect(fn({n: () => {return 42}, aFunction: (a) => {return a}})).toBe(42)
        })

        it('parses a function call with multiple arguments', () => {
            var fn = parse('aFunction(37, n, fn())')
            expect(fn({
                aFunction: (a1, a2, a3) => {return a1 + a2 + a3},
                n: 3,
                fn: () =>{return 2}
            })).toBe(42)
        })

        it('calls methods accessed as computed properties', () => {
            var scope = {
                anObject: {
                    aMember: 42,
                    aFunction: function() {
                        return this.aMember
                    }
                }
            }

            var fn = parse('anObject["aFunction"]()')
            expect(fn(scope)).toBe(42)
        })

        it('calls methods accessed as non-computed properties', () => {
            var scope = {
                anObject: {
                    aMember: 42,
                    aFunction: function() {
                        return this.aMember
                    }
                }
            }

            var fn = parse('anObject.aFunction()')
            expect(fn(scope)).toBe(42)
        })

        it('binds bare functions to the scope', () => {
            var scope = {
                aFunction: function() {
                    return this
                }
            }
            var fn = parse('aFunction()')
            expect(fn(scope)).toBe(scope)
        })

        it('binds bare function s on locals to the locals', () => {
            var scope = {}
            var locals = {
                aFunction() {
                    return this
                }
            }
            var fn = parse('aFunction()')
            expect(fn(scope, locals)).toBe(locals)
        })

        it('parses a simple attribute assignment', () => {
            var fn = parse('a=42')
            var scope = {}
            fn(scope)
            expect(scope.a).toBe(42)
        })

        it('can assignment any primary Expresssion', () => {
            var fn = parse('a = aFunction()')
            var scope = {
                aFunction() {
                    return 42
                }
            }
            fn(scope)
            expect(scope.a).toBe(42)
        })

        it('can assign a computed object property', () => {
            var fn = parse('anObject["a"] = 42')
            var scope = {
                anObject: {}
            }
            fn(scope)
            expect(scope.anObject.a).toBe(42)
        })        
        
        it('can assign a non-computed object property', () => {
            var fn = parse('anObject.a = 42')
            var scope = {
                anObject: {}
            }
            fn(scope)
            expect(scope.anObject.a).toBe(42)
        })

        it('can assign a nested object property', () => {
            var fn = parse('anArray[0].a = 42')
            var scope = {
                anArray: [{}]
            }
            fn(scope)
            expect(scope.anArray[0].a).toBe(42)
        })

        it('creates the objects in the assignment path that do not exist', () => {
            var fn = parse('some["nested"].property.path=42')
            var scope = {}
            fn(scope)
            expect(scope.some.nested.property.path).toBe(42)
        })
    })

})