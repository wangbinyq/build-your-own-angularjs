import _ from 'lodash'

function initWatchVal() {}

export class Scope {
    constructor() {
        this.$$watchers = []
        this.$$lastDirtyWatch = null
        this.$$asyncQueue = []
        this.$$applyAsyncQueue = []
        this.$$postDigestQueue = []
        this.$$applyAsyncId = null
        this.$$phase = null
        this.$$children = []
        this.$root = this
    }

    $watch(watchFn, listenerFn=() => {}, valueEq=false) {
        var watcher = {
            watchFn,
            listenerFn,
            valueEq,
            last: initWatchVal
        }
        this.$$watchers.unshift(watcher)
        this.$root.$$lastDirtyWatch = null
        return () => {
            let index = this.$$watchers.indexOf(watcher)
            if(index >= 0) {
                this.$$watchers.splice(index, 1)
                this.$root.$$lastDirtyWatch = null
            }
        }
    }

    $$areEqual(newValue, oldValue, valueEq) {
        if(valueEq) {
            return _.isEqual(newValue, oldValue)
        }
        return newValue === oldValue || 
            ( typeof newValue === 'number' && typeof oldValue === 'number' 
                && isNaN(newValue) && isNaN(oldValue))
    }

    $$digestOnce() {
        let dirty = false
        let continueLoop = true

        this.$$everyScope((scope) => {
            let newValue, oldValue
            _.eachRight(scope.$$watchers , watcher => {
                try {
                    newValue = watcher.watchFn(scope)
                    oldValue = watcher.last
                    let valueEq = watcher.valueEq
                    if(!scope.$$areEqual(newValue, oldValue, valueEq)) {
                        this.$root.$$lastDirtyWatch = watcher
                        oldValue = oldValue === initWatchVal ? newValue : oldValue
                        watcher.last = valueEq ? _.cloneDeep(newValue) : newValue
                        watcher.listenerFn(newValue, oldValue, scope)
                        dirty = true
                    } else if(this.$root.$$lastDirtyWatch === watcher) {
                        continueLoop = false
                        return false
                    }
                } catch(e) {
                    console.error(e)
                }
            })
            return continueLoop
        })

        return dirty
    }

    $digest() {
        let ttl = 10
        let dirty
        this.$root.$$lastDirtyWatch = null
        this.$beginPhase('$digest')

        if(this.$root.$$applyAsyncId) {
            clearTimeout(this.$root.$$applyAsyncId)
            this.$$flushApplyAsync()
        }

        do {
            while(this.$$asyncQueue.length) {
                try {
                    let asyncTask = this.$$asyncQueue.shift()
                    asyncTask.scope.$eval(asyncTask.expression)
                } catch(e) {
                    console.error(e)
                }
            }
            dirty = this.$$digestOnce()
            ttl--
            if((dirty || this.$$asyncQueue.length) && ttl < 0) {
                this.$clearPhase()
                throw '10 digest iterations reached'
            }
        } while (dirty || this.$$asyncQueue.length)

        while(this.$$postDigestQueue.length) {
            try {
                this.$$postDigestQueue.shift()()
            } catch(e) {
                console.error(e)
            }
        }

        this.$clearPhase()
    }

    $eval(expr, locals) {
        return expr(this, locals)
    }

    $evalAsync(expr) {

        if(!this.$$phase && !this.$$asyncQueue.length) {
            setTimeout(() => {
                if(this.$$asyncQueue.length) {
                    this.$root.$digest()
                }
            }, 0)
        }

        this.$$asyncQueue.push({
            scope: this,
            expression: expr
        })
    }

    $apply(expr, locals) {
        try {
            this.$beginPhase('$apply')
            return this.$eval(expr, locals)
        } finally {
            this.$clearPhase()
            this.$root.$digest()
        }
    }

    $applyAsync(expr) {
        this.$$applyAsyncQueue.push(() => {
            this.$eval(expr)
        })

        if(this.$root.$$applyAsyncId) {
            return
        }

        this.$root.$$applyAsyncId = setTimeout(() => {
            this.$apply(() => {
                this.$$flushApplyAsync()
            })
        }, 0)
    }

    $$flushApplyAsync() {
        while(this.$$applyAsyncQueue.length) {
            try {
                this.$$applyAsyncQueue.shift()()
            } catch (e) {
                console.error(e)
            }
        }
        this.$root.$$applyAsyncId = null
    }

    $beginPhase(phase) {
        if(this.$$phase) {
            throw this.$$phase + ' already in progress.'
        }
        this.$$phase = phase
    }

    $clearPhase() {
        this.$$phase = null
    }

    $$postDigest(expr) {
        this.$$postDigestQueue.push(() => {
            expr(this)
        })
    }

    $new(isolated, parent) {
        parent = parent || this

        function ChildScope() {
            this.$$watchers = []
            this.$$children = []
        }
        ChildScope.prototype = this

        let child
        if(isolated) {
            child = new Scope()
            child.$root = parent.$root
            child.$$asyncQueue = parent.$$asyncQueue
            child.$$postDigestQueue = parent.$$postDigestQueue
            child.$$applyAsyncQueue = parent.$$applyAsyncQueue
        } else {
            child = new ChildScope()
            
        }
        child.$parent = parent
        parent.$$children.push(child)
        return child
    }

    $$everyScope(fn) {
        if(fn(this)) {
            return this.$$children.every(child => {
                return child.$$everyScope(fn)
            })
        } else {
            return false
        }
    }

    $destroy() {
        if(this.$parent) {
            _.remove(this.$parent.$$children, (child) => {
                child === this
            })
            this.$parent = null
        }
        this.$$watchers = null
    }

}