var _ = require('lodash')

module.exports = function(to) {
    return _.template('Hello, <%= name %>!')({name: to})
}