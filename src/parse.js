import _ from './utils'
let AST = require('./grammer').parse


export class ASTCompiler {
    constructor(astBuilder) {
        this.astBuilder = astBuilder
    }

    compile(text) {
        const ast = this.astBuilder.ast(text)
        this.state = {
            body: [],
            nextId: 0,
            vars: []
        }
        this.recurse(ast)

        return new Function('s', 'l', (this.state.vars.length ?
            'var ' + this.state.vars.join(',') + ';' : '') +
            this.state.body.join(' '))
    }

    recurse(ast, context, create) {
        var intoId
        switch(ast.type) {
        case AST.Program:
            this.state.body.push('return ', this.recurse(ast.body), ';')
            break
        case AST.Literal:
            return ast.value
        case AST.ArrayExpression:
            var elements = _.map(ast.elements, (e) => {
                return this.recurse(e)
            })
            return '[' + elements.join(',') + ']'
        case AST.ObjectExpression:
            var properties = _.map(ast.properties, (p) => {
                var key = p.key.type === AST.Identifier ?
                    p.key.name : p.key.value
                var value = this.recurse(p.value)
                return key + ':' + value
            })
            return '{' + properties.join(',') + '}'
        case AST.Identifier:
            intoId = this.nextId()
            this.if_(this.getHasOwnProperty('l', ast.name), 
                this.assign(intoId, this.nonComputedMember('l', ast.name)))
            this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s', 
                this.assign(intoId, this.nonComputedMember('s', ast.name)))
            if(context) {
                context.context = this.getHasOwnProperty('l', ast.name) + '?l:s'
                context.name = ast.name
                context.computed = false
            }
            return intoId
        case AST.ThisExpression:
            return 's'
        case AST.MemberExpression:
            intoId = this.nextId()
            var left = this.recurse(ast.object)
            if(context) {
                context.context = left
            }
            if(ast.computed) {
                var right = this.recurse(ast.property)
                this.if_(left, 
                    this.assign(intoId, this.computedMember(left, right)))
                if(context) {
                    context.name = right
                    context.computed = true
                }
            } else {
                this.if_(left, 
                    this.assign(intoId, this.nonComputedMember(left, ast.property.name)))
                if(context) {
                    context.name = ast.property.name
                    context.computed = false
                }
            }
            return intoId
        case AST.CallExpression:
            var callContext = {}
            var callee = this.recurse(ast.callee, callContext)
            var args = _.map(ast.arguments, (arg) => {
                return this.recurse(arg)
            })
            if(callContext.name) {
                if(callContext.computed) {
                    callee = this.computedMember(callContext.context, callContext.name)
                } else {
                    callee = this.nonComputedMember(callContext.context, callContext.name)                    
                }
            }
            return callee + '&&' + callee + '(' + args.join(',') + ')'
        case AST.AssignmentExpression:
            var leftContext = {}
            this.recurse(ast.left, leftContext, true)
            var leftExpr
            if(leftContext.computed) {
                leftExpr = this.computedMember(leftContext.context, leftContext.name)
            } else {
                leftExpr = this.nonComputedMember(leftContext.context, leftContext.name)
            }
            return this.assign(leftExpr, this.recurse(ast.right))
        }
    }

    nonComputedMember(left, right) {
        return '(' + left + ').' + right
    }

    computedMember(left, right) {
        return '(' + left + ')[' + right + ']'
    }

    if_(test, consequent) {
        this.state.body.push('if(', test, '){', consequent, '}')
    }

    assign(id, value) {
        return id + '=' + value + ';'
    }

    nextId() {
        var id = 'v' + (this.state.nextId++)
        this.state.vars.push(id)
        return id
    }

    not(e) {
        return '!(' + e + ')'
    }

    getHasOwnProperty(object, property) {
        return object + '&&("' + property + '" in ' +  object + ')'
    }
}

export class Parser {
    constructor(lexer) {
        this.lexer = lexer
        this.ast = {ast: AST}
        this.astCompiler = new ASTCompiler(this.ast)
    }

    parse(text) {
        return this.astCompiler.compile(text)
    }
}

export function parse(text) {
    const parser = new Parser()
    return parser.parse(text)
}

export default parse