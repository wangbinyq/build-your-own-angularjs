import parse from '../src/parse'
import { Scope } from '../src/scope'
import _ from 'lodash'
import { register } from '../src/filter'

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
            expect(fn({
                aKey: 42
            })).toBe(42)
            expect(fn({})).toBeUndefined()
        })

        it('returns undefined when looking up attribute from undefined', () => {
            const fn = parse('aKey')
            expect(fn({
                aKey: 42
            })).toBe(42)
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
            expect(fn({
                aKey: {
                    anotherKey: 42
                }
            })).toBe(42)
            expect(fn({
                aKey: {}
            })).toBeUndefined()
            expect(fn({})).toBeUndefined()
            expect(fn()).toBeUndefined()
        })

        it('looks up a member from an object', () => {
            var fn = parse('{aKey: 42}.aKey')
            expect(fn()).toBe(42)
        })

        it('looks up a 4-part identifier path from the scope', () => {
            var fn = parse('aKey.secondKey.thirdKey.fourthKey')
            expect(fn({
                aKey: {
                    secondKey: {
                        thirdKey: {
                            fourthKey: 42
                        }
                    }
                }
            })).toBe(42)
            expect(fn({
                aKey: {
                    secondKey: {
                        thirdKey: {}
                    }
                }
            })).toBeUndefined()
            expect(fn({
                aKey: {}
            })).toBeUndefined()
            expect(fn()).toBeUndefined()
        })

        it('uses locals instead of scope when there is a matching key', () => {
            var fn = parse('aKey')
            var scope = {
                aKey: 42
            }
            var locals = {
                aKey: 43
            }
            expect(fn(scope, locals)).toBe(43)
        })

        it('does not use locals instead of scope when no matching key', () => {
            var fn = parse('aKey')
            var scope = {
                aKey: 42
            }
            var locals = {
                otherKey: 43
            }
            expect(fn(scope, locals)).toBe(42)
        })

        it('uses locals instead of scope when the first part matches', () => {
            var fn = parse('aKey.anotherKey')
            var scope = {
                aKey: {
                    anotherKey: 42
                }
            }
            var locals = {
                aKey: {}
            }
            expect(fn(scope, locals)).toBeUndefined()
        })

        it('parses a simple computed property access', () => {
            const fn = parse('aKey["anotherKey"]')
            expect(fn({
                aKey: {
                    anotherKey: 42
                }
            })).toBe(42)
        })

        it('parses a computed numeric array access', () => {
            var fn = parse('anArray[1]')
            expect(fn({
                anArray: [1, 2, 3]
            })).toBe(2)
        })

        it('parses a computed access with another key as property', () => {
            var fn = parse('lock[key]')
            expect(fn({
                key: 'theKey',
                lock: {
                    theKey: 42
                }
            })).toBe(42)
        })

        it('parses computed access with another access as property', () => {
            var fn = parse('lock[keys["aKey"]]')
            expect(fn({
                keys: {
                    aKey: 'theKey'
                },
                lock: {
                    theKey: 42
                }
            })).toBe(42)
        })

        it('parses a function call', () => {
            var fn = parse('aFunction()')
            expect(fn({
                aFunction: () => {
                    return 42
                }
            })).toBe(42)
        })

        it('parses a function call with a single number argument', () => {
            var fn = parse('aFunction(42)')
            expect(fn({
                aFunction: (a) => {
                    return a
                }
            })).toBe(42)
        })

        it('parses a function call with a single identifier argument', () => {
            var fn = parse('aFunction(n)')
            expect(fn({
                n: 42,
                aFunction: (a) => {
                    return a
                }
            })).toBe(42)
        })

        it('parses a function call with a single function call argument', () => {
            var fn = parse('aFunction(n())')
            expect(fn({
                n: () => {
                    return 42
                },
                aFunction: (a) => {
                    return a
                }
            })).toBe(42)
        })

        it('parses a function call with multiple arguments', () => {
            var fn = parse('aFunction(37, n, fn())')
            expect(fn({
                aFunction: (a1, a2, a3) => {
                    return a1 + a2 + a3
                },
                n: 3,
                fn: () => {
                    return 2
                }
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

        it('does not allow calling the function constructor', function() {
            expect(function() {
                var fn = parse('aFunction.constructor("return window")()')
                fn({
                    aFunction: function() {}
                })
            }).toThrow()
        })

        it('does not allow accessing __proto__', function() {
            expect(function() {
                var fn = parse('obj.__proto__')
                fn({
                    obj: {}
                })
            }).toThrow()
        })

        it('does not allow calling __defineGetter__', function() {
            expect(function() {
                var fn = parse('obj.__defineGetter__("evil", fn)')
                fn({
                    obj: {},
                    fn: function() {}
                })
            }).toThrow()
        })

        it('does not allow calling __defineSetter__', function() {
            expect(function() {
                var fn = parse('obj.__defineSetter__("evil", fn)')
                fn({
                    obj: {},
                    fn: function() {}
                })
            }).toThrow()
        })

        it('does not allow calling __lookupGetter__', function() {
            expect(function() {
                var fn = parse('obj.__lookupGetter__("evil")')
                fn({
                    obj: {}
                })
            }).toThrow()
        })

        it('does not allow calling __lookupSetter__', function() {
            expect(function() {
                var fn = parse('obj.__lookupSetter__("evil")')
                fn({
                    obj: {}
                })
            }).toThrow()
        })

        it('does not allow accessing window as computed property', function() {
            var fn = parse('anObject["wnd"]')
            expect(function() {
                fn({
                    anObject: {
                        wnd: window
                    }
                })
            }).toThrow()
        })

        it('does not allow accessing window as non-computed property', function() {
            var fn = parse('anObject.wnd')
            expect(function() {
                fn({
                    anObject: {
                        wnd: window
                    }
                })
            }).toThrow()
        })

        it('does not allow passing window as function argument', function() {
            var fn = parse('aFunction(wnd)')
            expect(function() {
                fn({
                    aFunction: function() {},
                    wnd: window
                })
            }).toThrow()
        })

        it('does not allow calling methods on window', function() {
            var fn = parse('wnd.scrollTo(0)')
            expect(function() {
                fn({
                    wnd: window
                })
            }).toThrow()
        })

        it('does not allow returning window', function() {
            var fn = parse('aFunction()')
            expect(function() {
                fn({
                    aFunction: function() {
                        return window
                    }
                })
            }).toThrow()
        })

        it('does not allow assigning window', function() {
            var fn = parse('wnd = anObject')
            expect(function() {
                fn({
                    anObject: window
                })
            }).toThrow()
        })

        it('does not allow referencing window', function() {
            var fn = parse('wnd')
            expect(function() {
                fn({
                    wnd: window
                })
            }).toThrow()
        })

        it('does not allow calling functions on DOM elements', function() {
            var fn = parse('el.setAttribute("evil", "true")')
            expect(function() {
                fn({
                    el: document.documentElement
                })
            }).toThrow()
        })

        it('does not allow calling the aliased function constructor', function() {
            var fn = parse('fnConstructor("return window")')
            expect(function() {
                fn({
                    fnConstructor: (function() {}).constructor
                })
            }).toThrow()
        })

        it('does not allow calling functions on Object', function() {
            var fn = parse('obj.create({})')
            expect(function() {
                fn({
                    obj: Object
                })
            }).toThrow()
        })

        it('does not allow calling call', function() {
            var fn = parse('fun.call(obj)')
            expect(function() {
                fn({
                    fun: function() {},
                    obj: {}
                })
            }).toThrow()
        })

        it('does not allow calling apply', function() {
            var fn = parse('fun.apply(obj)')
            expect(function() {
                fn({
                    fun: function() {},
                    obj: {}
                })
            }).toThrow()
        })
    })

    describe('Operator Expresssions', () => {
        it('parses a unary +', function() {
            expect(parse('+42')()).toBe(42)
            expect(parse('+a')({a: 42})).toBe(42)
        })

        it('parses replaces undefined with zero for unary +', () => {
            expect(parse('+a')()).toBe(0)
        })

        it('parses a unary !', () => {
            expect(parse('!true')()).toBe(false)
            expect(parse('!42')()).toBe(false)
            expect(parse('!a')({a: false})).toBe(true)
            expect(parse('!!a')({a: false})).toBe(false)
        })

        it('parses a unary -', () => {
            expect(parse('-42')()).toBe(-42)
            expect(parse('-a')({a: -42})).toBe(42)
            expect(parse('-a')({a: 42})).toBe(-42)
            expect(parse('-a')({})).toBe(0)
        })

        it('parses a Multiplicative Operators', () => {
            expect(parse('21 * 2')()).toBe(42)
            expect(parse('84 / 2')()).toBe(42)
            expect(parse('85 % 43')()).toBe(42)
        })

        it('parses serveral Multiplicatives', () => {
            expect(parse('36 * 2 % 5')()).toBe(2)
        })

        it('parses an addition', () => {
            expect(parse('20 + 22')()).toBe(42)
        })

        it('parses an subtraction', () => {
            expect(parse('84 - 42')()).toBe(42)
        })

        it('parses multiplicatives on a higher precedence than additives', () => {
            expect(parse('2 + 3 * 5')()).toBe(17)
            expect(parse('2 + 3 * 2 + 3')()).toBe(11)
        })

        it('substitiues undefined with zero in addition', () => {
            expect(parse('a + 22')()).toBe(22)
            expect(parse('42 + a')()).toBe(42)
        })

        it('substitiues undefined with zero in subtraction', () => {
            expect(parse('a - 22')()).toBe(-22)
            expect(parse('42 - a')()).toBe(42)
        })

        it('parses relational operators', () => {
            expect(parse('1 < 2')()).toBe(true)
            expect(parse('1 > 2')()).toBe(false)
            expect(parse('1 <= 2')()).toBe(true)
            expect(parse('2 <= 2')()).toBe(true)
            expect(parse('1 >= 2')()).toBe(false)
            expect(parse('2 >= 2')()).toBe(true)            
        })

        it('parse equlality operators', () => {
            expect(parse('42 == 42')()).toBe(true)
            expect(parse('42 == "42"')()).toBe(true)
            expect(parse('42 != 42')()).toBe(false)
            expect(parse('42 === 42')()).toBe(true)
            expect(parse('42 === "42"')()).toBe(false)
            expect(parse('42 !== 42')()).toBe(false)           
        })

        it('parses relationals on a higher precedence than equality', () => {
            expect(parse('2 == "2" > 2 === "2"')()).toBe(false)
        })

        it('parses additives on a higher precedence than relationals', () => {
            expect(parse('2 + 3 < 6 -2')()).toBe(false)
        })

        it('parses logical AND', () => {
            expect(parse('true && true')()).toBe(true)
            expect(parse('true && false')()).toBe(false)
        })

        it('parses logical OR', () => {
            expect(parse('true || true')()).toBe(true)
            expect(parse('true || false')()).toBe(true)
            expect(parse('false || false')()).toBe(false)
        })

        it('parses multiple ANDs', function() {
            expect(parse('true && true && true')()).toBe(true)
            expect(parse('true && true && false')()).toBe(false)
        })

        it('parses multiple ORs', function() {
            expect(parse('true || true || true')()).toBe(true)
            expect(parse('true || true || false')()).toBe(true)
            expect(parse('false || false || true')()).toBe(true)
            expect(parse('false || false || false')()).toBe(false)
        })

        it('short-circuits AND', () => {
            var invoked
            var scope = {fn: function() { invoked = true }}
            parse('false && fn()')(scope)
            expect(invoked).toBeUndefined()
        })

        it('short-circuits OR', () => {
            var invoked
            var scope = {fn: function() { invoked = true }}
            parse('true || fn()')(scope)
            expect(invoked).toBeUndefined()
        })

        it('parses AND with a higher precedence than OR', function() {
            expect(parse('false && true || true')()).toBe(true)
        })

        it('parses OR with a lower precedence than equality', function() {
            expect(parse('1 === 2 || 2 === 2')()).toBeTruthy()
        })

        it('parses the ternary expression', () => {
            expect(parse('a === 42 ? true : false')({a: 42})).toBe(true)
            expect(parse('a === 42 ? true : false')({a: 43})).toBe(false)
        })

        it('parses OR with a higher precedence than ternary', function() {
            expect(parse('0 || 1 ? 0 || 2 : 0 || 3')()).toBe(2)
        })

        it('parses nested ternaries', function() {
            expect(
            parse('a === 42 ? b === 42 ? "a and b" : "a" : c === 42 ? "c" : "none"')({
                a: 44,
                b: 43,
                c: 42
            })).toEqual('c')
        })

        it('parses parentheses altering precedence order', function() {
            expect(parse('21 * (3 - 1)')()).toBe(42)
            expect(parse('false && (true || true)')()).toBe(false)
            expect(parse('-((a % 2) === 0 ? 1 : 2)')({a: 42})).toBe(-1)
        })

        it('parses several statements', function() {
            var fn = parse('a = 1; b = 2; c = 3')
            var scope = {}
            fn(scope)
            expect(scope).toEqual({a: 1, b: 2, c: 3})
        })

        it('returns the value of the last statement', function() {
            expect(parse('a = 1; b = 2; a + b')({})).toBe(3)
        })
    })

    describe('Expresssions and Watches', () => {

        var scope
        beforeEach(() => {
            scope = new Scope()
        })

        it('returns the function itself when given one', function() {
            var fn = function() { }
            expect(parse(fn)).toBe(fn)
        })

        it('still returns a function when given no argument', () => {
            expect(parse()).toEqual(jasmine.any(Function))
        })

        it('accepts expressions for watch functions', () => {
            var theValue

            scope.aValue = 42
            scope.$watch('aValue', (newValue, oldValue, scope) => {
                theValue = newValue
            })
            scope.$digest()

            expect(theValue).toBe(42)
        })

        it('accepts expressions for watch functions', () => {
            var theValue
            scope.aColl = [1, 2, 3]
            scope.$watchCollection('aColl', (newValue, oldValue, scope) => {
                theValue = newValue
            })
            scope.$digest()

            expect(theValue).toEqual([1, 2, 3])
        })

        it('accepts expressions in $eval', () => {
            expect(scope.$eval('42')).toBe(42)
        })

        it('accepts expressions in $apply', () => {
            scope.aFunction = _.constant(42)
            expect(scope.$apply('aFunction()')).toBe(42)
        })

        it('accepts expressions in $evalAsync', done => {
            var called
            scope.aFunction = function() {
                called = true
            }
            scope.$evalAsync('aFunction()')
            scope.$$postDigest(() => {
                expect(called).toBe(true)
                done()
            })
        })

        it('marks integers literal', function() {
            var fn = parse('42')
            expect(fn.literal).toBe(true)
        })

        it('marks strings literal', function() {
            var fn = parse('"abc"')
            expect(fn.literal).toBe(true)
        })

        it('marks booleans literal', function() {
            var fn = parse('true')
            expect(fn.literal).toBe(true)
        })

        it('marks arrays literal', function() {
            var fn = parse('[1, 2, aVariable]')
            expect(fn.literal).toBe(true)
        })

        it('marks objects literal', function() {
            var fn = parse('{a: 1, b: aVariable}')
            expect(fn.literal).toBe(true)
        })

        it('marks unary expressions non-literal', function() {
            var fn = parse('!false')
            expect(fn.literal).toBe(false)
        })

        it('marks binary expressions non-literal', function() {
            var fn = parse('1 + 2')
            expect(fn.literal).toBe(false)
        })

        it('marks integers constant', function() {
            var fn = parse('42')
            expect(fn.constant).toBe(true)
        })

        it('marks strings constant', function() {
            var fn = parse('"abc"')
            expect(fn.constant).toBe(true)
        })

        it('marks booleans constant', function() {
            var fn = parse('true')
            expect(fn.constant).toBe(true)
        })

        it('marks identifiers non-constant', function() {
            var fn = parse('a')
            expect(fn.constant).toBe(false)
        })

        it('marks arrays constant when elements are constant', function() {
            expect(parse('[1, 2, 3]').constant).toBe(true)
            expect(parse('[1, [2, [3]]]').constant).toBe(true)
            expect(parse('[1, 2, a]').constant).toBe(false)
            expect(parse('[1, [2, [a]]]').constant).toBe(false)
        })

        it('marks objects constant when values are constant', function() {
            expect(parse('{a: 1, b: 2}').constant).toBe(true)
            expect(parse('{a: 1, b: {c: 3}}').constant).toBe(true)
            expect(parse('{a: 1, b: something}').constant).toBe(false)
            expect(parse('{a: 1, b: {c: something}}').constant).toBe(false)
        })

        it('marks this as non-constant', () => {
            expect(parse('this').constant).toBe(false)
        })   

        it('marks non-computed lookup constant when object is constant', function() {
            expect(parse('{a: 1}.a').constant).toBe(true)
            expect(parse('obj.a').constant).toBe(false)
        }) 

        it('marks computed lookup constant when object and key are', function() {
            expect(parse('{a: 1}["a"]').constant).toBe(true)
            expect(parse('obj["a"]').constant).toBe(false)
            expect(parse('{a: 1}[something]').constant).toBe(false)
            expect(parse('obj[something]').constant).toBe(false)
        })      

        it('marks function calls non-constant', () => {
            expect(parse('a()').constant).toBe(false)
        }) 

        it('marks filters constant if arguments are', function() {
            register('aFilter', function() {
                return _.identity
            })
            expect(parse('[1, 2, 3] | aFilter').constant).toBe(true)
            expect(parse('[1, 2, a] | aFilter').constant).toBe(false)
            expect(parse('[1, 2, 3] | aFilter:42').constant).toBe(true)
            expect(parse('[1, 2, 3] | aFilter:a').constant).toBe(false)
        })

        it('marks assignments constant when both sides are', function() {
            expect(parse('1 = 2').constant).toBe(true)
            expect(parse('a = 2').constant).toBe(false)
            expect(parse('1 = b').constant).toBe(false)
            expect(parse('a = b').constant).toBe(false)
        })

        it('marks unaries constant when arguments are constant', function() {
            expect(parse('+42').constant).toBe(true)
            expect(parse('+a').constant).toBe(false)
        })

        it('marks binaries constant when both arguments are constant', function() {
            expect(parse('1 + 2').constant).toBe(true)
            expect(parse('1 + 2').literal).toBe(false)
            expect(parse('1 + a').constant).toBe(false)
            expect(parse('a + 1').constant).toBe(false)
            expect(parse('a + a').constant).toBe(false)
        })

        it('marks logicals constant when both arguments are constant', function() {
            expect(parse('true && false').constant).toBe(true)
            expect(parse('true && false').literal).toBe(false)
            expect(parse('true && a').constant).toBe(false)
            expect(parse('a && false').constant).toBe(false)
            expect(parse('a && b').constant).toBe(false)
        })

        it('marks ternaries constant when all arguments are', function() {
            expect(parse('true ? 1 : 2').constant).toBe(true)
            expect(parse('a ? 1 : 2').constant).toBe(false)
            expect(parse('true ? a : 2').constant).toBe(false)
            expect(parse('true ? 1 : b').constant).toBe(false)
            expect(parse('a ? b : c').constant).toBe(false)
        })
    })
})