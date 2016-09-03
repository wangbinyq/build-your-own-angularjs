import _  from 'lodash'

var FN_ARGS =  /^function\s*[^\(]*\(\s*([^\)]*)\)/m
var FN_ARG =   /^\s*(_?)(\S+?)\1\s*$/
var STRIP_COMMENTS = /(\/\/.*$)|(\/\*.*?\*\/)/mg
var INSTANTIATING = {}

export default function(modulesToLoad, strictDi) {

    var providerCache = {}
    var providerInjector = createInternalInjector(providerCache, function() {
        throw 'Unknown provider: ' + path.join(' <- ')
    })
    var instanceCache = {}
    var InstanceInjector = createInternalInjector(instanceCache, function(name) {
        var provider = providerInjector.get(name + 'Provider')
        return InstanceInjector.invoke(provider.$get, provider)
    })
    var loadedModule = {}
    var path = []
    strictDi = (strictDi === true)
    var $provide = {
        constant(key, value) {
            if(key === 'hasOwnProperty') {
                throw 'hasOwnProperty is not a valid constant name!'
            }
            instanceCache[key] = value
            providerCache[key] = value
        },
        provider(key, provider) {
            if(_.isFunction(provider)) {
                provider = providerInjector.instantiate(provider)
            }
            providerCache[key + 'Provider'] = provider
        }
    }

    function annotate(fn) {
        if(_.isArray(fn)) {
            return fn.slice(0, fn.length -1)
        } else if(fn.$inject) {
            return fn.$inject
        } else if(!fn.length) {
            return []
        } else {
            if(strictDi) {
                throw 'fn is not using explicit annotation and ' +
                    'cannot be invoked in strict mode'
            }
            var source = fn.toString().replace(STRIP_COMMENTS, '')
            var argDeclaration = source.match(FN_ARGS)
            return _.map(argDeclaration[1].split(','), (argName) => {
                return argName.match(FN_ARG)[2]
            })
        }
    }

    function createInternalInjector(cache, factoryFn) {
        function getService(name) {
            if(cache.hasOwnProperty(name)) {
                if(cache[name] === INSTANTIATING) {
                    throw new Error('Circular dependency found: ' +
                        name + ' <- ' + path.join(' <- ')) 
                }
                return cache[name]
            } else {
                path.unshift(name)
                cache[name] = INSTANTIATING
                try {
                    return (cache[name] = factoryFn(name))
                } finally {
                    path.shift()
                    if(cache[name] === INSTANTIATING) {
                        delete cache[name]
                    }
                }

            }
        }

        function invoke(fn, self, locals) {
            var args = _.map(annotate(fn), (token) => {
                if(_.isString(token)) {
                    return locals && locals.hasOwnProperty(token) ?
                        locals[token] :
                        getService(token)
                } else {
                    throw 'Incorrect injection token! Expected a string, got ' + token
                }           
            })
            if(_.isArray(fn)) {
                fn = _.last(fn)
            }
            return fn.apply(self, args)
        }

        function instantiate(cls, locals) {
            var UnwrappedType = _.isArray(cls) ? _.last(cls) : cls
            var instance = Object.create(UnwrappedType.prototype)
            invoke(cls, instance, locals)
            return instance
        }

        return {
            has(name) {
                return cache.hasOwnProperty(name) ||
                    providerCache.hasOwnProperty(name+'Provider')
            },
            get: getService,
            invoke,
            annotate,
            instantiate
        }
    }

    _.forEach(modulesToLoad, function loadModule(moduleName) {
        if(!loadedModule.hasOwnProperty(moduleName)) {
            loadedModule[moduleName] = true
            var module = window.angular.module(moduleName)
            _.forEach(module.requires, loadModule)       
            _.forEach(module._invokeQueue, (invokeArgs) => {
                var method = invokeArgs[0]
                var args = invokeArgs[1]
                $provide[method].apply($provide, args)
            })
        }
    })

    return InstanceInjector
}