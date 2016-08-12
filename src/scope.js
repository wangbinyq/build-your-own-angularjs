import _ from 'lodash'

function initWatchVal() {}

export class Scope {
    constructor() {
        this.$$watchers = []
        this.$$lastDirtyWatch = null
        this.$$asyncQueue = []
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
        })

        return dirty
    }

    $digest() {
        let ttl = 10
        let dirty
        this.$$lastDirtyWatch = null

        do {
            while(this.$$asyncQueue.length) {
                let asyncTask = this.$$asyncQueue.shift()
                asyncTask.scope.$eval(asyncTask.expression)
            }
            dirty = this.$$digestOnce()
            ttl--
            if((dirty || this.$$asyncQueue.length) && ttl < 0) {
                throw '10 digest iterations reached'
            }
        } while (dirty || this.$$asyncQueue.length)
    }

    $eval(expr, locals) {
        return expr(this, locals)
    }

    $evalAsync(expr) {
        this.$$asyncQueue.push({
            scope: this,
            expression: expr
        })
    }

    $apply(expr, locals) {
        try {
            return this.$eval(expr, locals)
        } finally {
            this.$digest()
        }
    }
}