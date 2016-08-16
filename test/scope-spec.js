/*eslint no-unused-vars: 0*/

import { Scope } from '../src/scope'
import _ from 'lodash'

describe('Scope', () => {
    it('can be constructed and used as an object', () => {
        const scope = new Scope()
        scope.aProperty = 1
        expect(scope.aProperty).toBe(1)
    })

    describe('digest', () => {
        
        let scope

        beforeEach(() => {
            scope = new Scope()
        })

        it('calls the listener function of a watch on first $digest', () => {
            const watchFn = () => {
                return 'wat'
            }
            const listenerFn = jasmine.createSpy()
            scope.$watch(watchFn, listenerFn)
            
            scope.$digest()

            expect(listenerFn).toHaveBeenCalled()
        })

        it('calls the watch function with the scope as argument', () => {
            const watchFn = jasmine.createSpy()
            const listenerFn = () => {}
            scope.$watch(watchFn, listenerFn)
            
            scope.$digest()

            expect(watchFn).toHaveBeenCalledWith(scope)
        })

        it('calls the listener function when the watched value changes', () => {
            scope.someValue = 'a'
            scope.counter = 0

            scope.$watch((scope)=> {
                return scope.someValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            expect(scope.counter).toBe(0)

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.someValue = 'b'
            expect(scope.someValue).toBe('b')
            expect(scope.counter).toBe(1)     

            scope.$digest()
            expect(scope.counter).toBe(2)       
        })

        it('calls listener when watch value is first undefined', () => {
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.someValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)
        })

        it('calls listener with new value as old value the first time', () => {
            let oldValueGiven
            scope.someValue = 123

            scope.$watch((scope) => {
                return scope.someValue + 1
            }, (newValue, oldValue, scope) => {
                oldValueGiven = oldValue
            })

            scope.$digest()
            expect(oldValueGiven).toBe(124)
        })

        it('may have watchers that omit the listener function', () => {
            const watchFn = jasmine.createSpy().and.returnValue('something')

            scope.$watch(watchFn)
            scope.$digest()
            expect(watchFn).toHaveBeenCalled()
        })

        it('triggers chained watchers in the same digest', () => {

            scope.name = 'Jane'
            scope.$watch((scope) => {
                return scope.nameUpper
            }, (newValue, oldValue, scope) => {
                if (newValue) {
                    scope.initial = newValue.substring(0, 1) + '.'
                }
            })

            scope.$watch((scope) => {
                return scope.name
            }, (newValue, oldValue, scope) => {
                if(newValue) {
                    scope.nameUpper = newValue.toUpperCase()
                }
            })

            scope.$digest()
            expect(scope.initial).toBe('J.')
            expect(scope.nameUpper).toBe('JANE')

            scope.name = 'Bob'
            scope.$digest()
            expect(scope.initial).toBe('B.')
            expect(scope.nameUpper).toBe('BOB')            
        })

        it('gives up on the watches after 10 iterations', () => {

            scope.counterA = 0
            scope.counterB = 0

            scope.$watch((scope) => {
                return scope.counterA
            }, (newValue, oldValue, scope) => {
                scope.counterB++
            })

            scope.$watch((scope) => {
                return scope.counterB
            }, (newValue, oldValue, scope) => {
                scope.counterA++
            })

            expect((() => { scope.$digest() })).toThrow()
        })

        it('ends the digest when the last watch is clean', () => {
            scope.array = new Array(100)
            let watchExecutions = 0

            _.times(100, i => {
                scope.$watch((scope) => {
                    watchExecutions++
                    return scope.array[i]
                }, () => {})
            })

            scope.$digest()
            expect(watchExecutions).toBe(200)

            scope.array[20] = 1
            scope.$digest()
            expect(watchExecutions).toBe(321)            
        })

        it('does not end digest so that new watches are not run', () => {
            scope.someValue = 'a'
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.someValue
            }, (newValue, oldValue, scope) => {
                scope.$watch((scope) => {
                    return scope.someValue
                }, (newValue, oldValue, scope) => {
                    scope.counter++
                })
            })

            scope.$digest()
            expect(scope.counter).toBe(1)
        })

        it('compares based on value if enabled', () => {
            scope.someValue = [1, 2, 3]
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.someValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            }, true)

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.someValue.push(4)
            scope.$digest()
            expect(scope.counter).toBe(2)
        })


        it('correctly handles NaNs', () => {
            scope.number = NaN
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.number
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)
            
            scope.$digest()
            expect(scope.counter).toBe(1)
        })


        it('executes $eval\'ed function and returns result', function() {
            scope.aValue = 42
            let result = scope.$eval(function(scope) {
                return scope.aValue
            })
            expect(result).toBe(42)
        })

        it('passes the second $eval argument straight through', function() {
            scope.aValue = 42
            let result = scope.$eval(function(scope, arg) {
                return scope.aValue + arg
            }, 2)
            expect(result).toBe(44)
        })

        it('executes $apply\'ed function and starts the digest', function() {
            scope.aValue = 'someValue'
            scope.counter = 0
            scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.$apply(function(scope) {
                scope.aValue = 'someOtherValue'
            })
            expect(scope.counter).toBe(2)
        })

        it('executes $evalAsync\'ed function later in the same cycle', () => {
            scope.aValue = [1, 2, 3]
            scope.asyncEvaluated = false
            scope.asyncEvaluatedImmediately = false

            scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.$evalAsync((scope) => {
                    scope.asyncEvaluated = true
                })
                scope.asyncEvaluatedImmediately = scope.asyncEvaluated
            })

            scope.$digest()
            expect(scope.asyncEvaluated).toBe(true)
            expect(scope.asyncEvaluatedImmediately).toBe(false)            
        })

        it('executes $evalAsync\'ed functions added by watch functions', () => {
            scope.aValue = [1, 2, 3]
            scope.asyncEvaluated = false
            scope.asyncEvaluatedImmediately = false

            scope.$watch((scope) => {
                if(!scope.asyncEvaluated) {
                    scope.$evalAsync((scope) => {
                        scope.asyncEvaluated = true
                    })
                }
                scope.asyncEvaluatedImmediately = scope.asyncEvaluated
                return scope.aValue
            }, (newValue, oldValue, scope) => {
            })

            scope.$digest()
            expect(scope.asyncEvaluated).toBe(true)
        })

        it('executes $evalAsync\'ed functions even when not dirty', () => {
            scope.aValue = [1, 2, 3]
            scope.asyncEvaluatedTimes = 0

            scope.$watch((scope) => {
                if(scope.asyncEvaluatedTimes < 2) {
                    scope.$evalAsync((scope) => {
                        scope.asyncEvaluatedTimes++
                    })
                }
                return scope.aValue
            }, (newValue, oldValue, scope) => {
            })

            scope.$digest()
            expect(scope.asyncEvaluatedTimes).toBe(2)            
        })

        it('eventually halts $evalAsyncs added by watches', () => {
            scope.aValue = [1, 2, 3]

            scope.$watch((scope) => {
                scope.$evalAsync((scope) => {
                })
                return scope.aValue
            }, (newValue, oldValue, scope) => {
            })

            expect(() => { scope.$digest() }).toThrow()          
        })

        it('has a $$phase field whose value is the current digest phase', () => {
            scope.aValue = [1, 2, 3]

            scope.phaseInWatchFunction = undefined
            scope.phaseInListenerFunction = undefined
            scope.phaseInApplyFunction = undefined

            scope.$watch((scope)=>{
                scope.phaseInWatchFunction = scope.$$phase
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.phaseInListenerFunction = scope.$$phase
            })

            scope.$apply((scope) => {
                scope.phaseInApplyFunction = scope.$$phase
            })

            expect(scope.phaseInWatchFunction).toBe('$digest')
            expect(scope.phaseInListenerFunction).toBe('$digest')
            expect(scope.phaseInApplyFunction).toBe('$apply')
        })

        it('schedules a digest in $evalAsync', (done) => {
            scope.aValue = 'abc'
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$evalAsync((scope) => {
            })

            expect(scope.counter).toBe(0)

            setTimeout(() => {
                expect(scope.counter).toBe(1)
                done()
            }, 10)
        })

        it('allows async $apply with $applyAsync', (done) => {
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.$applyAsync((scope) => {
                scope.aValue = 'abc'
            })

            expect(scope.counter).toBe(1)

            setTimeout(() => {
                expect(scope.counter).toBe(2)
                done()
            }, 10)            
        })

        it('never executes $applyAsync\'ed function in the same cycle', (done) => {
            scope.aValue = [1, 2, 3]
            scope.asyncApplied = false

            scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.$applyAsync((scope) => {
                    scope.asyncApplied = true
                })
            })

            scope.$digest()
            expect(scope.asyncApplied).toBe(false)
            setTimeout(() => {
                expect(scope.asyncApplied).toBe(true)
                done()
            }, 10)              
        })

        it('coalesces many calls to $applyAsync', (done) =>{
            scope.aValue = [1, 2, 3]
            scope.counter = 0

            scope.$watch((scope) => {
                scope.counter++
                return scope.aValue
            }, (newValue, oldValue, scope) => {
               
            })

            scope.$applyAsync((scope) => {
                scope.aValue = 'abc'
            })

            scope.$applyAsync((scope) => {
                scope.aValue = 'edf'
            })

            expect(scope.counter).toBe(0)
            setTimeout(() => {
                expect(scope.counter).toBe(2)
                done()
            }, 10)              
        })

        it('cancels and flushes $applyAsync if digested first', (done) =>{
            scope.aValue = [1, 2, 3]
            scope.counter = 0

            scope.$watch((scope) => {
                scope.counter++
                return scope.aValue
            }, (newValue, oldValue, scope) => {
               
            })

            scope.$applyAsync((scope) => {
                scope.aValue = 'abc'
            })

            scope.$applyAsync((scope) => {
                scope.aValue = 'edf'
            })

            scope.$digest()
            expect(scope.counter).toBe(2)
            expect(scope.aValue).toBe('edf')

            setTimeout(() => {
                expect(scope.counter).toBe(2)
                done()
            }, 10)              
        })

        it('runs a $$postDigest function after each digest', () => {
            scope.counter = 0

            scope.$$postDigest((scope)=> {
                scope.counter++
            })

            expect(scope.counter).toBe(0)

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.$digest()
            expect(scope.counter).toBe(1)        
        })

        it('does not include $$postDigest in the digest', () => {
            scope.aValue = 'origin value'

            scope.$$postDigest((scope) => {
                scope.aValue = 'changed value'
            })

            scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.watchedValue = newValue
            })

            scope.$digest()
            expect(scope.watchedValue).toBe('origin value')

            scope.$digest()
            expect(scope.watchedValue).toBe('changed value')
        })

        it('catches exceptions in watch functions and continues', () => {
            scope.aValue = 'abc'
            scope.counter = 0

            scope.$watch(() => {
                throw 'Error'
            })

            scope.$watch(() => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)
        })

        it('catches exceptions in listener functions and continues', () => {
            scope.aValue = 'abc'
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.aValue
            }, () => {
                throw 'Error'
            })

            scope.$watch(() => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)            
        })

        it('catches exceptions in $evalAsync', (done) => {
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$evalAsync((scope) => {
                throw 'Error'
            })

            setTimeout(() => {
                expect(scope.counter).toBe(1)
                done()
            }, 10)  
        })

        it('catches exceptions in $applyAsync', (done) => {
            scope.counter = 0

            scope.$applyAsync((scope) => {
                throw 'Error'
            })

            scope.$applyAsync((scope) => {
                throw 'Error'
            })

            scope.$applyAsync((scope) => {
                scope.counter++
            })

            setTimeout(() => {
                expect(scope.counter).toBe(1)
                done()
            }, 10)              
        })

        it('catches exceptions in $$postDigest', () => {
            scope.didRun = false

            scope.$$postDigest((scope) => {
                throw 'Error'
            })

            scope.$$postDigest((scope) => {
                scope.didRun = true
            })

            scope.$digest()
            expect(scope.didRun).toBe(true)
        })

        it('allows destroying a $watch with a removal function', () => {
            scope.aValue = 'abc'
            scope.counter = 0

            let destroyWatcher = scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.aValue = 'def'
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.aValue = 'ghi'
            destroyWatcher()
            scope.$digest()
            expect(scope.counter).toBe(2)
        })

        it('allows destroying a $watch during digest', () => {
            let watchCalls = []
            scope.aValue = 'abc'

            scope.$watch((scope) => {
                watchCalls.push(1)
                return scope.aValue
            })

            let destroyWatcher = scope.$watch((scope) => {
                watchCalls.push(2)
                destroyWatcher()
            })

            scope.$watch((scope) => {
                watchCalls.push(3)
                return scope.aValue
            })

            scope.$digest()
            expect(watchCalls).toEqual([1, 2, 3, 1, 3])
        })

        it('allows a $watch to destroy another during digest', () => {
            scope.aValue = 'abc'
            scope.counter = 0

            scope.$watch((scope) => {
                return scope.aValue
            }, () => {
                destroyWatcher()
            })

            let destroyWatcher = scope.$watch((scope) => {
            })

            scope.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)
        })

        it('allows destroying several $watches during digest' , () => {
            
        })
    })

    describe('watchGroup', () => {
        let scope

        beforeEach(() => {
            scope = new Scope()
        }) 
    })


    describe('inheritance', () => {

        let parent, child

        beforeEach(() => {
            parent = new Scope()
            child = parent.$new()
        }) 

        it('inherits the parent\'s properties', () => {
            const parent = new Scope()
            parent.aValue = [1, 2, 3]

            const child = parent.$new()

            expect(child.aValue).toEqual([1, 2, 3])

        })

        it('does not cause a parent to inherit its properties', () => {
            const parent = new Scope()

            const child = parent.$new()
            child.aValue = [1, 2, 3]

            expect(parent.aValue).toBeUndefined()            
        })

        it('inherits the parent\'s properties whenever they are defined', () => {
            const parent = new Scope()
            const child = parent.$new()
            parent.aValue = [1, 2, 3]

            expect(child.aValue).toEqual([1, 2, 3])            
        })

        it('can manipulate a parent scope\'s property', () => {
            const parent = new Scope()
            parent.aValue = [1, 2, 3]

            const child = parent.$new()
            child.aValue.push(4)

            expect(child.aValue).toEqual([1, 2, 3, 4])                
            expect(parent.aValue).toEqual([1, 2, 3, 4])                
        })

        it('can watch a property in the parent', () => {
            const parent = new Scope()
            const child = parent.$new()
            parent.aValue = [1, 2, 3]
            child.counter = 0

            child.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            }, true)

            child.$digest()
            expect(child.counter).toBe(1)

            parent.aValue.push(4)
            child.$digest()
            expect(child.counter).toBe(2)            
        })

        it('can be nested at any depth', () => {
            const a = new Scope()
            const aa = a.$new()
            const aaa = aa.$new()
            const aab = aa.$new()
            const ab = a.$new()
            const abb = ab.$new()

            a.value = 1

            expect(aa.value).toBe(1)
            expect(aaa.value).toBe(1)
            expect(aab.value).toBe(1)
            expect(ab.value).toBe(1)
            expect(abb.value).toBe(1)

            ab.anotherValue = 2

            expect(abb.anotherValue).toBe(2)
            expect(aa.anotherValue).toBeUndefined
            expect(aaa.anotherValue).toBeUndefined       
        })

        it('shadows a parent\'s property with the same name', () => {
            const parent = new Scope()
            const child = parent.$new()

            parent.name = 'Joe'
            child.name = 'Jill'

            expect(parent.name).toBe('Joe')
            expect(child.name).toBe('Jill')
        })

        it('does not shadow members of parent scope\'s attributes', () => {
            const parent = new Scope()
            const child = parent.$new()

            parent.user = {
                name: 'Joe'
            }
            child.user.name = 'Jill'

            expect(parent.user.name).toBe('Jill')
            expect(child.user.name).toBe('Jill')            
        })

        it('does not digest its parent(s)', () => {
            parent.aValue = 'abc'

            parent.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.aValueWas = newValue
            })

            child.$digest()
            expect(parent.aValueWas).toBeUndefined()

        })

        it('keeps a record of its children', () => {
            const child2 = parent.$new()
            const child2_1 = child2.$new()

            expect(parent.$$children.length).toBe(2)
            expect(parent.$$children[0]).toBe(child)
            expect(parent.$$children[1]).toBe(child2)

            expect(child.$$children.length).toBe(0)

            expect(child2.$$children.length).toBe(1)
            expect(child2.$$children[0]).toBe(child2_1)
        })

        it('digests its children', () => {
            parent.aValue = 'abc'

            child.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.aValueWas = newValue
            })

            parent.$digest()
            expect(child.aValueWas).toBe('abc')
        })

        it('digests from root on $apply', () => {
            const child2 = child.$new()
            parent.aValue = 'abc'
            parent.counter = 0

            parent.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            child2.$apply(() => {})
            expect(parent.counter).toBe(1)
        })

        it('schedules a digest from root on $evalAsync', (done) => {
            const child2 = child.$new()
            parent.aValue = 'abc'
            parent.counter = 0

            parent.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            child2.$evalAsync(() => {})
            setTimeout(() => {
                expect(parent.counter).toBe(1)
                done()
            }, 10)
        })

        it('does not have access to parent attributes when isolated', () => {
            const child = parent.$new(true)
            parent.aValue = 'abc'

            expect(child.aValue).toBeUndefined()
        })

        it('cannot watch parent attributes when isolated', () => {
            const child = parent.$new(true)
            parent.aValue = 'abc'
            child.counter = 0

            child.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.aValueWas = newValue
            })

            child.$digest()
            expect(child.aValueWas).toBeUndefined()          
        })

        it('digests its isolated children', () => {
            let parent = new Scope()
            let child = parent.$new(true)

            expect(parent.$$children[0]).toBe(child)

            child.aValue = 'abc'

            child.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.aValueWas = newValue
            })

            parent.$digest()
            expect(child.aValueWas).toBe('abc')            
        })

        it('digests from root on $apply when isolated', () => {
            const child = parent.$new(true)
            const child2 = child.$new()

            parent.aValue = 'abc'
            parent.counter = 0

            parent.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            child2.$apply(() => {})
            expect(parent.counter).toBe(1)
        })

        it('schedules a digest from root on $evalAsync when isolated', (done) => {
            const child = parent.$new(true)
            const child2 = child.$new()
            parent.aValue = 'abc'
            parent.counter = 0

            parent.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            child2.$evalAsync(() => {})
            setTimeout(() => {
                expect(parent.counter).toBe(1)
                done()
            }, 10)            
        })

        it('executes $evalAsync functions on isolated scopes', (done) => {
            const child = parent.$new(true)

            child.$evalAsync(scope => {
                scope.didEvalAsync = true
            })

            setTimeout(() => {
                expect(child.didEvalAsync).toBe(true)
                done()
            }, 10)
        })

        it('executes $$postDigest functions on isolated scopes', () => {
            const child = parent.$new(true)

            child.$$postDigest((scope) => {
                scope.didPostDigest = true
            })

            parent.$digest()
            expect(child.didPostDigest).toBe(true)
        })

        it('can take some other scope as the parent', () => {
            const prototypeParent = new Scope()
            const hierarchyParent = new Scope()
            const child = prototypeParent.$new(false, hierarchyParent)

            prototypeParent.a = 42
            expect(child.a).toBe(42)

            child.counter = 0
            child.$watch((scope) => {
                scope.counter++
            })

            prototypeParent.$digest()
            expect(child.counter).toBe(0)

            hierarchyParent.$digest()
            expect(child.counter).toBe(2)
        })

        it('is no longer digested when $destroy has been called', () => {
            child.aValue = [1, 2, 3]
            child.counter = 0
            
            child.$watch((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            }, true)

            parent.$digest()
            expect(child.counter).toBe(1)

            child.aValue.push(4)
            parent.$digest()
            expect(child.counter).toBe(2)

            child.$destroy()
            child.aValue.push(5)
            parent.$digest()
            expect(child.counter).toBe(2)
        })
    })

    describe('watchCollection', () => {
        let scope

        beforeEach(() => {
            scope = new Scope()
        })

        it('works like a normal watch for non-collections', () => {
            scope.aValue = 42
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.valueProvided = newValue
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)
            expect(scope.valueProvided).toBe(42)

            scope.aValue = 43
            scope.$digest()
            expect(scope.valueProvided).toBe(43)
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)
        })

        it('works like a normal watch for NaNs', () => {
            scope.aValue = NaN
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.$digest()
            expect(scope.counter).toBe(1)
        })

        it('notices when the value becomes an array', () => {
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.arr
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.arr = [1, 2, 3]
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)
        })

        it('notices an item added to an array', () => {
            scope.arr = [1, 2, 3]
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.arr
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.arr.push(4)
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)
        })

        it('notices an item removed from an array', () => {
            scope.arr = [1, 2, 3]
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.arr
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.arr.shift()
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)
        })

        it('notices an item replaced in an array', () => {
            scope.arr = [1, 2, 3]
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.arr
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.arr[1] = 42
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)
        })

        it('notices items reordered in an array', () => {
            scope.arr = [2, 1, 3]
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.arr
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.arr.sort()
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)            
        })

        it('does not fail on NaNs in arrays', () => {
            scope.arr = [2, NaN, 3]
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.arr
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)            
        })

        it('notices an item replaced in an arguments object', () => {
            (function() {
                scope.arrayLike = arguments
            })(1, 2, 3)

            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.arrayLike
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.arrayLike[1] = 42
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)
        })

        it('notices an item replaced in a NodeList object', () => {
            document.documentElement.appendChild(document.createElement('div'))
            scope.arrayLike = document.getElementsByTagName('div')

            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.arrayLike
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            document.documentElement.appendChild(document.createElement('div'))
            scope.$digest()
            expect(scope.counter).toBe(2)            
        })

        it('notices when the value becomes an object', () => {
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.obj
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.obj = {a:1}
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)             
        })

        it('notices when an attribute is added to an object', () => {
            scope.counter = 0
            scope.obj = {a:1}

            scope.$watchCollection((scope) => {
                return scope.obj
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.obj.b = 2
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)             
        })

        it('notices when an attribute is changed in an object', () => {
            scope.counter = 0
            scope.obj = {a:1}

            scope.$watchCollection((scope) => {
                return scope.obj
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.obj.a = 2
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)             
        })

        it('does not fail on NaN attributes in objects', () => {
            scope.counter = 0
            scope.obj = {a:NaN}

            scope.$watchCollection((scope) => {
                return scope.obj
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            scope.obj.a = 2
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)              
        })

        it('notices when an attribute is removed from an object', () => {
            scope.counter = 0
            scope.obj = {a:1}

            scope.$watchCollection((scope) => {
                return scope.obj
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            expect(scope.counter).toBe(1)

            delete scope.obj.a
            scope.$digest()
            expect(scope.counter).toBe(2)

            scope.$digest()
            expect(scope.counter).toBe(2)              
        })

        it('does not consider any object with a length property an array', () => {
            scope.obj = {length: 42, otherKey: 'abc'}
            scope.counter = 0

            scope.$watchCollection((scope) => {
                return scope.obj 
            }, (newValue, oldValue, scope) => {
                scope.counter++
            })

            scope.$digest()
            scope.obj.newKey = 'def'
            scope.$digest()
            expect(scope.counter).toBe(2) 
        })

        it('gives the old non-collection value to listeners', () => {
            scope.aValue = 42
            let oldValueGiven

            scope.$watchCollection((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                oldValueGiven = oldValue
            })

            scope.$digest()

            scope.aValue = 43
            scope.$digest()
            expect(oldValueGiven).toBe(42)
        })

        it('gives the old array value to listeners', () => {
            scope.aValue = [1, 2, 3]
            let oldValueGiven

            scope.$watchCollection((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                oldValueGiven = oldValue
            })

            scope.$digest()

            scope.aValue.push(4)
            scope.$digest()
            expect(oldValueGiven).toEqual([1, 2, 3])
        })

        it('gives the old object value to listeners', () => {
            scope.aValue = {a:1}
            let oldValueGiven

            scope.$watchCollection((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                oldValueGiven = oldValue
            })

            scope.$digest()

            scope.aValue.a = 2
            scope.$digest()
            expect(oldValueGiven).toEqual({a:1})
        })

        it('uses the new value as the old value on first digest', () => {
            scope.aValue = {a:1}
            let oldValueGiven

            scope.$watchCollection((scope) => {
                return scope.aValue
            }, (newValue, oldValue, scope) => {
                oldValueGiven = oldValue
            })

            scope.$digest()

            expect(oldValueGiven).toEqual({a:1})            
        })
    })

    describe('Events', () => {
        let scope, parent, child, isolatedChild

        beforeEach(() => {
            parent = new Scope()
            scope = parent.$new()
            child = scope.$new()
            isolatedChild = scope.$new(true)
        })

        it('allows registering listeners', () => {
            const listener1 = () => {}
            const listener2 = () => {}
            const listener3 = () => {}

            scope.$on('someEvent', listener1)
            scope.$on('someEvent', listener2)
            scope.$on('someOtherEvent', listener3)

            expect(scope.$$listeners).toEqual({
                someEvent: [listener1, listener2],
                someOtherEvent: [listener3]
            })
        })

        it('registers different listeners for every scope', () => {
            const listener1 = () => {}
            const listener2 = () => {}
            const listener3 = () => {}

            scope.$on('someEvent', listener1)
            child.$on('someEvent', listener2)
            isolatedChild.$on('someOtherEvent', listener3)

            expect(scope.$$listeners).toEqual({someEvent: [listener1]})                       
            expect(child.$$listeners).toEqual({someEvent: [listener2]})                       
            expect(isolatedChild.$$listeners).toEqual({someOtherEvent: [listener3]})                       
        })

        _.each(['$emit', '$broadcast'], (method) => {
            it('calls the listeners of the matching event on ' + method, () => {
                const listener1 = jasmine.createSpy()
                const listener2 = jasmine.createSpy()
                
                scope.$on('someEvent', listener1)
                scope.$on('someOtherEvent', listener2)

                scope[method]('someEvent')
                expect(listener1).toHaveBeenCalled()
                expect(listener2).not.toHaveBeenCalled()
            })

            it('passes an event object with a name to listeners on ' + method, () => {
                const listener = jasmine.createSpy()
                
                scope.$on('someEvent', listener)

                scope[method]('someEvent')
                expect(listener).toHaveBeenCalled()
                expect(listener.calls.mostRecent().args[0].name).toEqual('someEvent')
            })

            it('passes the same event object to each listener on ' + method, () => {
                const listener1 = jasmine.createSpy()
                const listener2 = jasmine.createSpy()
                
                scope.$on('someEvent', listener1)
                scope.$on('someEvent', listener2)

                scope[method]('someEvent')
                const event1 = listener1.calls.mostRecent().args[0]
                const event2 = listener2.calls.mostRecent().args[0]
                expect(event1).toBe(event2)
            })

            it('returns the event object on ' + method, () => {
                const returnedEvent = scope[method]('someEvent')
                expect(returnedEvent).toBeDefined()
                expect(returnedEvent.name).toBe('someEvent')                
            })

            it('can be deregistered ' + method, () => {
                const listener = jasmine.createSpy()
                const deregistered = scope.$on('someEvent', listener)

                deregistered()

                scope[method]('someEvent')
                expect(listener).not.toHaveBeenCalled()
            })

            it('does not skip the next listener when removed on ' + method, () => {
                let deregister
                const listener = function() {
                    deregister()
                }
                const nextListener = jasmine.createSpy()

                deregister = scope.$on('someEvent', listener)
                scope.$on('someEvent', nextListener)

                scope[method]('someEvent')

                expect(nextListener).toHaveBeenCalled()
            })

            it('is sets defaultPrevented when preventDefault called on' + method, () => {
                const listener = (event) => {
                    event.preventDefault()
                }

                scope.$on('someEvent', listener)

                const event = scope[method]('someEvent')

                expect(event.defaultPrevented).toBe(true)
            })
        })

        it('propagates up the scope hierarchy on $emit', () => {
            const scopeListener = jasmine.createSpy()
            const parentListener = jasmine.createSpy()

            parent.$on('someEvent', parentListener)
            scope.$on('someEvent', scopeListener)

            scope.$emit('someEvent')

            expect(scopeListener).toHaveBeenCalled()            
            expect(parentListener).toHaveBeenCalled()            
        })

        it('propagates down the scope hierarchy on $broadcast', () => {
            const scopeListener = jasmine.createSpy()
            const parentListener = jasmine.createSpy()
            const isolatedListener = jasmine.createSpy()

            parent.$on('someEvent', parentListener)
            scope.$on('someEvent', scopeListener)
            isolatedChild.$on('someEvent', isolatedListener)

            parent.$broadcast('someEvent')

            expect(isolatedListener).toHaveBeenCalled()            
            expect(scopeListener).toHaveBeenCalled()            
            expect(parentListener).toHaveBeenCalled()             
        })

        it('propagates the same event down on $broadcast', () => {
            const scopeListener = jasmine.createSpy()
            const childListener = jasmine.createSpy()
            
            scope.$on('someEvent', scopeListener)
            child.$on('someEvent', childListener)

            scope.$broadcast('someEvent')
            const scopeEvent = scopeListener.calls.mostRecent().args[0]
            const childEvent = childListener.calls.mostRecent().args[0]
            expect(scopeEvent).toBe(childEvent)            
        })

        it('attaches targetScope on $emit', () => {
            const scopeListener = jasmine.createSpy()
            const parentListener = jasmine.createSpy()
            
            scope.$on('someEvent', scopeListener)
            parent.$on('someEvent', parentListener)

            scope.$emit('someEvent')
            
            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope)
            expect(parentListener.calls.mostRecent().args[0].targetScope).toBe(scope)            
        })

        it('attaches targetScope on $broadcast', () => {
            const scopeListener = jasmine.createSpy()
            const childListener = jasmine.createSpy()
            
            scope.$on('someEvent', scopeListener)
            child.$on('someEvent', childListener)

            scope.$broadcast('someEvent')
            
            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope)
            expect(childListener.calls.mostRecent().args[0].targetScope).toBe(scope)            
        })

        it('attaches currentScope on $emit', () => {
            let currentScopeOnScope, currentScopeOnParent

            const scopeListener = (event) => {
                currentScopeOnScope = event.currentScope
            }

            const parentListener = (event) => {
                currentScopeOnParent = event.currentScope
            }

            scope.$on('someEvent', scopeListener)
            parent.$on('someEvent', parentListener)

            scope.$emit('someEvent')

            expect(currentScopeOnScope).toBe(scope)
            expect(currentScopeOnParent).toBe(parent)
        })

        it('attaches currentScope on $broadcast', () => {
            let currentScopeOnScope, currentScopeOnChild

            const scopeListener = (event) => {
                currentScopeOnScope = event.currentScope
            }

            const childListener = (event) => {
                currentScopeOnChild = event.currentScope
            }

            scope.$on('someEvent', scopeListener)
            child.$on('someEvent', childListener)

            scope.$broadcast('someEvent')

            expect(currentScopeOnScope).toBe(scope)
            expect(currentScopeOnChild).toBe(child)
        })

        it('sets currentScope to null after propagation on $emit', () => {
            let event
            const scopeListener = (evt) => {
                event = evt
            }

            scope.$on('someEvent', scopeListener)
            scope.$emit('someEvent')

            expect(event.currentScope).toBe(null)
        })

        it('sets currentScope to null after propagation on $broadcast', () => {
            let event
            const scopeListener = (evt) => {
                event = evt
            }

            scope.$on('someEvent', scopeListener)
            scope.$broadcast('someEvent')

            expect(event.currentScope).toBe(null)
        })

        it('does not propagate to parents when stopped', () => {
            const scopeListener = (event) => {
                event.stopPropagation()
            }
            const parentListener = jasmine.createSpy()

            scope.$on('someEvent', scopeListener)
            parent.$on('someEvent', parentListener)

            scope.$emit('someEvent')

            expect(parentListener).not.toHaveBeenCalled()
        })

        it('is received by listeners on current scope after being stopped', () => {
            const listener1 = (event) => {
                event.stopPropagation()
            }
            const listener2 = jasmine.createSpy()
            
            scope.$on('someEvent', listener1)
            scope.$on('someEvent', listener2)

            scope.$emit('someEvent')

            expect(listener2).toHaveBeenCalled()           
        })

        it('fire destroy when destroyed', () => {
            
        })
    })

})