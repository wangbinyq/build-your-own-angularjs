import {filter, register} from '../src/filter'
import parse from '../src/parse'
import _ from 'lodash'

describe('filter', () => {
    it('can be registered and obtained', () => {
        var myFilter = function() {}
        var myFilterFactory = function() {
            return myFilter
        }
        register('my', myFilterFactory)
        expect(filter('my')).toBe(myFilter)
    })

    it('allows registering multiple filters with an object', () => {
        var myFilter = function(){}
        var myOtherFilter = function(){}
        register({
            my(){
                return myFilter
            },
            myOther() {
                return myOtherFilter
            }
        })
        expect(filter('my')).toBe(myFilter)
        expect(filter('myOther')).toBe(myOtherFilter)
    })

    it('can parse filter expressions', () => {
        register('upcase', () => {
            return str => {
                return str.toUpperCase()
            }
        })
        var fn = parse('aString | upcase')
        expect(fn({aString: 'Hello'})).toEqual('HELLO')
    })

    it('can parse filter chain expressions', () => {
        register('upcase', function() {
            return function(s) {
                return s.toUpperCase()
            }
        })
        register('exclamate', function() {
            return function(s) {
                return s + '!'
            }
        })
        var fn = parse('"hello" | upcase | exclamate')
        expect(fn()).toEqual('HELLO!')     
    })

    it('can pass an additional argument to filters', function() {
        register('repeat', function() {
            return function(s, times) {
                return _.repeat(s, times)
            }
        })
        var fn = parse('"hello" | repeat:3')
        expect(fn()).toEqual('hellohellohello')
    })

    it('can pass several additional arguments to filters', function() {
        register('surround', function() {
            return function(s, left, right) {
                return left + s + right
            }
        })
        var fn = parse('"hello" | surround:"*":"!"')
        expect(fn()).toEqual('*hello!')
    }) 
})