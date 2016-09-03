export default function(window) {

    function ensure(obj, name, factory) {
        return obj[name] || (obj[name] = factory())
    }

    var angular = ensure(window, 'angular', Object)
    
    var createModule = function(name, requires, modules) {
        if(name === 'hasOwnProperty') {
            throw 'hasOwnProperty is not a valid module name'
        }
        var invokeQueue = []
        var invokeLater = function(method, arrayMethod) {
            return function() {
                invokeQueue[arrayMethod || 'push']([method, arguments])
                return moduleInstance
            }
        }
        var moduleInstance = {
            name,
            requires,
            constant: invokeLater('constant', 'unshift'),
            provider: invokeLater('provider'),
            _invokeQueue: invokeQueue
        }
        modules[name] = moduleInstance
        return moduleInstance
    }
    var getModule = function(name, modules) {
        if(modules.hasOwnProperty(name)) {
            return modules[name]
        } else {
            throw 'Module ' + name + ' is not available!' 
        }
    }

    ensure(angular, 'module', function() {
        var modules = {}
        return (name, requires) => {
            if(requires) {
                return createModule(name, requires, modules)
            } else {
                return getModule(name, modules)
            }
        }
    })
}