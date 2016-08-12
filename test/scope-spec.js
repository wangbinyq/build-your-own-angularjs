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
})