import setupModuleLoader from '../src/loader'

describe('setupModuleLoader', () => {

    beforeEach(() => {
        delete window.angular
    })

    it('exposes angular on the window', () => {
        setupModuleLoader(window)
        expect(window.angular).toBeDefined()
    })

    it('create angular just once', () => {
        setupModuleLoader(window)
        var ng = window.angular
        setupModuleLoader(window)
        expect(window.angular).toBe(ng)
    })

    it('expose the angular module function', () => {
        setupModuleLoader(window)
        expect(window.angular.module).toBeDefined()
    })

    it('exposes the angular module function just once', function() {
        setupModuleLoader(window)
        var module = window.angular.module
        setupModuleLoader(window)
        expect(window.angular.module).toBe(module)
    })

    describe('modules', () => {
        beforeEach(() => {
            setupModuleLoader(window)
        })

        it('allows registering a module', () => {
            var myModule = window.angular.module('myModule', [])
            expect(myModule).toBeDefined()
            expect(myModule.name).toBe('myModule')
        })

        it('replaces a module when registered with the same name again', () => {
            var myModule = window.angular.module('myModule', [])
            var myNewModule = window.angular.module('myModule', [])
            expect(myNewModule).not.toBe(myModule)
        })

        it('attaches the requires array to the registered', () => {
            var myModule = window.angular.module('myModule', ['myOtherModule'])
            expect(myModule.requires).toEqual(['myOtherModule'])
        })

        it('allows getting a module', () => {
            var myModule = window.angular.module('myModule', [])
            var gotModule = window.angular.module('myModule')
            expect(gotModule).toBeDefined()
            expect(myModule).toBe(gotModule)
        })

        it('throws when trying to get a nonexistent module', () => {
            expect(() => {
                window.angualr.modle('myModule')
            }).toThrow()
        })

        it('does not allows a module to be called hasOwnProperty', () => {
            expect(() => {
                window.angular.module('hasOwnProperty', [])
            }).toThrow()
        })
    })

})