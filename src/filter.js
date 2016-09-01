import _ from 'lodash'
import filterFilter from './filter_filter'

var filters = {}

function register(name, factory) {
    if(_.isObject(name)) {
        return _.map(name, (factory, name) => {
            return register(name, factory)
        })
    } else {
        var filter = factory()
        filters[name] = filter
        return filter
    }
}

function filter(name) {
    return filters[name]
}

register('filter', filterFilter)

export {
    filter,
    register
}