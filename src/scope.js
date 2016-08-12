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
    }

    $watch(watchFn, listenerFn=() => {}, valueEq=false) {
        var watcher = {
            watchFn,
            listenerFn,
            valueEq,
            last: initWatchVal
        }
        this.$$watchers.push(watcher)
        this.$$lastDirtyWatch = null
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
        _.each(this.$$watchers , watcher => {
            try {
                let newValue = watcher.watchFn(this)
                let oldValue = watcher.last
                let valueEq = watcher.valueEq
                if(this.$$areEqual(newValue, oldValue, valueEq)) {
                    return this.$$lastDirtyWatch !== watcher
                }
                this.$$lastDirtyWatch = watcher
                oldValue = oldValue === initWatchVal ? newValue : oldValue
                watcher.last = valueEq ? _.cloneDeep(newValue) : newValue
                watcher.listenerFn(newValue, oldValue, this)
                dirty = true
            } catch(e) {
                console.error(e)
            }
        })

        return dirty
    }

    $digest() {
        let ttl = 10
        let dirty
        this.$$lastDirtyWatch = null
        this.$beginPhase('$digest')

        if(this.$$applyAsyncId) {
            clearTimeout(this.$$applyAsyncId)
            this.$$flushApplyAsync()
        }

        do {
            while(this.$$asyncQueue.length) {
                let asyncTask = this.$$asyncQueue.shift()
                asyncTask.scope.$eval(asyncTask.expression)
            }
            dirty = this.$$digestOnce()
            ttl--
            if((dirty || this.$$asyncQueue.length) && ttl < 0) {
                this.$clearPhase()
                throw '10 digest iterations reached'
            }
        } while (dirty || this.$$asyncQueue.length)

        while(this.$$postDigestQueue.length) {
            this.$$postDigestQueue.shift()()
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
                    this.$digest()
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
            this.$digest()
        }
    }

    $applyAsync(expr) {
        this.$$applyAsyncQueue.push(() => {
            this.$eval(expr)
        })

        if(this.$$applyAsyncId) {
            return
        }

        this.$$applyAsyncId = setTimeout(() => {
            this.$apply(() => {
                this.$$flushApplyAsync()
            })
        }, 0)
    }

    $$flushApplyAsync() {
        while(this.$$applyAsyncQueue.length) {
            this.$$applyAsyncQueue.shift()()
        }
        this.$$applyAsyncId = null
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
}