import _ from 'lodash'

const isArrayLike = _.isArrayLike

_.mixin({
    isArrayLike(obj) {
        return isArrayLike(obj) && (
            obj.length === 0
            || obj.length > 0 && obj.length-1 in obj
        )
    }
})

export default _

export function setStaticEnumProperty(cls, property) {
    property.forEach((e) => {
        cls[e] = e.toLowerCase()
    })
}