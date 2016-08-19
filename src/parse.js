import { setStaticEnumProperty } from './utils'

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
    pattern: /\.\d*(?:[eE][+\-]?\d+)?/,
    type: 'literal'
}, {
    pattern: /\'.*\'/,
    type: 'literal'
}, {
    pattern: /\".*\"/,
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
    pattern: /\[/,
    type: '['
}, {
    pattern: /\]/,
    type: ']'
}, {
    pattern: /,/,
    type: ','
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
            body: this.primary()
        }
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
                elements.push(this.primary())
            } while(this.expect(','))
        }
        this.consume(']')
        return {
            type: AST.ArrayExpression,
            elements
        }
    }

    primary() {
        if(this.expect('[')) {
            return this.arrayDeclaration()
        }
        return this.constant()
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
            body: []
        }
        this.recurse(ast)

        return new Function('s', this.state.body.join(' '))
    }

    recurse(ast) {
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
        }
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