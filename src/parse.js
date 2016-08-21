import { setStaticEnumProperty } from './utils'
import _ from './utils'

/*eslint no-unused-vars: 0*/
const bnf =
`
ast: program
program: (filter ';')+
filter: assignment ('|' identifier (':' assignment)+)+
assignment: ternary ('=' ternary)?
ternary: logicalOR ('?' assignment ':' assignment)?
logicalOR: logicalAND ('||' logicalAND)+
logicalAND: equality ('&&' equality)+
equality: relational (['==', '!=', '===', '!=='] relational)+
relational: additive (['<', '>', '<=', '>='] additive)+
additive: multiplicative (['+', '-'] multiplicative)+
multiplicative: unary (['*', '/', '%'] unary)+
unary: ['+', '-', '!'] unary
    | primary
primary: primaryLeft (primaryRight)+
primaryLeft: '(' filter ')'
    | '[' arrayDeclaration ']'
    | '{' object '}'
    | contants
    | identifier
    | contant
primaryRight: '.' identifier
    | '[' identifier ']'
    | '(' parseArguments ')'
arrayDeclaration: (assignment ',')+
object: (identifier ':' assignment ',')+
    | (constant ':' assignment ',')+
parseArguments: (assignment ',')+
identifier: Identifier
contant: Literal
constatns: 'null' | 'ture' | 'false' | 'this' | '$locals'
`
/*eslint no-unused-vars: 1*/


const rules = [{
    pattern: /(?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?/,
    type: 'literal'
}, {
    pattern: /\.\d+(?:[eE][+\-]?\d+)?/,
    type: 'literal'
}, {
    pattern: /'(?:[^'\\]|\\.)*'/,
    type: 'literal'
}, {
    pattern: /"(?:[^"\\]|\\.)*"/,
    type: 'literal'        
}, {
    pattern: /null/,
    type: 'literal'
}, {
    pattern: /false/,
    type: 'literal'
}, {
    pattern: /true/,
    type: 'literal'
}, {
    pattern: /this/,
    type: 'this'
}, {
    pattern: /\[/,
    type: '['
}, {
    pattern: /\]/,
    type: ']'
}, {
    pattern: /,/,
    type: ','
}, {
    pattern: /\./,
    type: '.'
}, {
    pattern: /{/,
    type: '{'
}, {
    pattern: /}/,
    type: '}'
}, {
    pattern: /:/,
    type: ':'
},{
    pattern: /\(/,
    type: '('
},{
    pattern: /\)/,
    type: ')'
}, {
    pattern: /=/,
    type: '='
}, {
    pattern: /[a-zA-Z$_][_a-zA-Z0-9]*/,
    type: 'identifier'
}]


let regexp = (() => {
    const regex_parts  = []
    rules.map((r) => {
        regex_parts.push('(' + r.pattern.source +')')
    })
    return new RegExp(regex_parts.join('|'), 'g')
})()

let skip_ws = new RegExp('\\S', 'g')
let ws_end = new RegExp('\\s+$', 'g')

export class Lexer {

    constructor() {
    }

    lex(text) {
        this.text = text
        this.tokens = []
        regexp.lastIndex = 0

        while(regexp.lastIndex < this.text.length) {
            skip_ws.lastIndex = regexp.lastIndex
            const match = skip_ws.exec(this.text)
            if(match) {
                regexp.lastIndex = match.index
            }

            const result = regexp.exec(this.text)
            if (result === null) {
                if(ws_end.test(this.text)) {
                    break
                }
                throw Error('Cannot match a token at position ' + regexp.lastIndex)
            } else {
                for(let i=0; i<rules.length; i++) {
                    if(result[i+1] !== undefined) {
                        this.tokens.push({
                            type: rules[i].type,
                            value: result[0]
                        })
                        break
                    }
                }
            }
        }

        return this.tokens
    }
}

export class AST {

    constructor(lexer) {
        this.lexer = lexer
    }

    ast(text) {
        this.tokens = this.lexer.lex(text)

        return this.program()
    }

    program() {
        return {
            type: AST.Program,
            body: this.assignment()
        }
    }

    assignment() {
        var left = this.primary()
        if(this.expect('=')) {
            var right = this.primary()
            return {
                type: AST.AssignmentExpression,
                left: left,
                right: right
            }
        }
        return left
    }

    peek(ast) {
        if(this.tokens.length > 0) {
            if(this.tokens[0].type === ast || !ast) {
                return this.tokens[0]
            }
        }
    }

    expect(ast) {
        const token = this.peek(ast)
        if(token) {
            return this.tokens.shift()
        }
    }

    consume(ast) {
        const token = this.expect(ast)
        if(token.type != ast) {
            throw 'Unexpected. Expecting: ' + ast
        }
        return token
    }

    arrayDeclaration() {
        const elements = []
        if(!this.peek(']')) {
            do {
                elements.push(this.assignment())
            } while(this.expect(','))
        }
        this.consume(']')
        return {
            type: AST.ArrayExpression,
            elements
        }
    }

    object() {
        const properties = []
        if(!this.peek('}')) {
            do {
                const property = { type: AST.Property }
                if(this.peek('identifier')) {
                    property.key = this.identifier()
                } else {
                    property.key = this.constant()
                }
                this.consume(':')
                property.value = this.assignment()

                properties.push(property)

            } while(this.expect(','))
        }
        this.consume('}')
        return {
            type: AST.ObjectExpression,
            properties
        }
    }

    identifier() {
        return {type: AST.Identifier, name: this.consume('identifier').value}
    }

    primary() {
        let primary
        if(this.expect('[')) {
            primary = this.arrayDeclaration()
        } else if (this.expect('{')) {
            primary = this.object()
        } else if (this.expect('this')) {
            primary = {
                type: AST.ThisExpression
            }
        } else if(this.peek('identifier')) {
            primary = this.identifier()
        } else {
            primary = this.constant()
        }
        var next
        while((next = this.expect('.')) || (next = this.expect('['))
                || (next = this.expect('('))) {
            if(next.type == '[') {
                primary = {
                    type: AST.MemberExpression,
                    object: primary,
                    property: this.primary(),
                    computed: true
                }
                this.consume(']')
            } else if(next.type == '.') {
                primary = {
                    type: AST.MemberExpression,
                    object: primary,
                    property: this.identifier(),
                    computed: false
                }
            } else if(next.type == '(') {
                primary = {
                    type: AST.CallExpression,
                    callee: primary,
                    arguments: this.parseArguments()
                }
                this.consume(')')
            }
        }
        return primary

    }

    parseArguments() {
        var args = []
        if(!this.peek(')')) {
            do {
                args.push(this.assignment())
            } while(this.expect(','))
        }
        return args
    }

    constant() {
        return {
            type: AST.Literal,
            value: this.consume('literal').value
        }
    }
}

setStaticEnumProperty(AST, [
    'Program',
    'Literal',
    'ArrayExpression',
    'ObjectExpression',
    'Property',
    'Identifier',
    'ThisExpression',
    'LocalsExpression',
    'MemberExpression',
    'CallExpression',
    'AssignmentExpression',
    'UnaryExpression',
    'BinaryExpresssion',
    'LogicalExpression',
    'ConditionalExpression'
])


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

    nextId() {
        const id = 'v' + (this.state.nextId++)
        this.state.vars.push(id)
        return id
    }

    recurse(ast, context, create) {
        let intoId
        switch(ast.type) {
        case AST.Program:
            this.state.body.push('return', this.recurse(ast.body), ';')
            break
        case AST.Literal:
            return ast.value
        case AST.ArrayExpression:
            var elements = _.map(ast.elements, (element) => {
                return this.recurse(element)
            })
            return '[' + elements.join(',') + ']'
        case AST.ObjectExpression:
            var properties = _.map(ast.properties, (property) => {

                const key = property.key.type === AST.Identifier ? property.key.name : this.recurse(property.key)

                return key + ':' + this.recurse(property.value)
            })
            return '{' + properties.join(',') + '}'
        case AST.Identifier:
            intoId = this.nextId()
            this.if_(this.getHasOwnProperty('l', ast.name), 
                this.assign(intoId, this.nonComputedMember('l', ast.name)))
            if(create) {
                this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + 
                        ' && s &&' + 
                        this.not(this.getHasOwnProperty('s', ast.name)),
                    this.assign(this.nonComputedMember('s', ast.name), '{}'))
            }         
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
            var left = this.recurse(ast.object, undefined, create)
            if(context) {
                context.context = left
            }
            if(ast.computed) {
                var right = this.recurse(ast.property)
                if(create) {
                    this.if_(this.not(this.computedMember(left, right)),
                        this.assign(this.computedMember(left, right), '{}'))
                }
                this.if_(left,
                    this.assign(intoId, this.computedMember(left, right)))
                if(context) {
                    context.name = right
                    context.computed = true
                }
            } else {
                if(create) {
                    this.if_(this.not(this.nonComputedMember(left, ast.property.name)),
                        this.assign(this.nonComputedMember(left, ast.property.name), '{}'))
                }
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
            var args = _.map(ast.arguments, arg => {
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

    getHasOwnProperty(object, property) {
        return object + '&&("' + property +'" in ' + object + ')'
    }

    not(e) {
        return `!(${e})`
    }

    assign(id, value) {
        return id + '=' + value + ';'
    }

    computedMember(left, right) {
        return '(' + left + ')[' + right + ']'
    }

    nonComputedMember(left, right) {
        return '(' + left + ').' + right
    }

    if_(test, consequent) {
        this.state.body.push('if(', test, '){', consequent, '}')
    }
}

export class Parser {
    constructor(lexer) {
        this.lexer = lexer
        this.ast = new AST(this.lexer)
        this.astCompiler = new ASTCompiler(this.ast)
    }

    parse(text) {
        return this.astCompiler.compile(text)
    }
}

export function parse(text) {
    const lexer = new Lexer()
    const parser = new Parser(lexer)
    return parser.parse(text)
}

export default parse