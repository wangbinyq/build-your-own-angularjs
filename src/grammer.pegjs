{
    function setStaticEnumProperty(cls, property) {
        property.forEach((e) => {
            cls[e] = e.toLowerCase()
        })
    }
    
    var AST = peg$parse;
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
        'BinaryExpression',
        'LogicalExpression',
        'ConditionalExpression'
    ]);
}

program
    = _ bodys:(filter _ ";" _)* _ last:filter? _ {
        var body = bodys.length ? bodys.map(b => b[0]) : []
        if(last) {
            body.push(last)
        }
        return {type:AST.Program, body: body} 
    }

filter
    = left:assignment _ filterCall:("|" _ filterCall _)* {
        var res = left;
        if(filterCall.length) {
            for(var i=0; i<filterCall.length; i++) {
                var filter = filterCall[i][2];
                filter.arguments.unshift(res);
                res = filter;
            }
        }
        return res
    }

filterCall
    = callee:identifier _ args:(":" _ assignment _)* {
        args = args.map((arg) => arg[2])
        return {
            type: AST.CallExpression,
            callee,
            arguments: args,
            filter: true
        }
    }

assignment
    = left:ternary _ right:("=" _ ternary _)? {
        return right ? {
            type: AST.AssignmentExpression,
            left: left,
            right: right[2]
        } : left
    }

assignments
    = first:assignment _ "," _ elements:assignments _ {
        elements.unshift(first)
        return elements
    }
    / assignment:assignment _ ","? _ {
        return [assignment]
    }

ternary
    = test:logicalOR _ consequent:("?" _ assignment _ ":" _ assignment _)? {
        return consequent ? {
            type: AST.ConditionalExpression,
            test: test,
            consequent: consequent[2],
            alternate: consequent[6]
        } : test
    }

logicalOR
    = left:logicalAND _ right:("||" _ logicalAND _)* {
        if(right.length) {
            for(var i=0; i<right.length; i++) {
                left = {
                    type: AST.LogicalExpression,
                    left: left,
                    operator: '||',
                    right: right[i][2]
                }
            }
        }
        return left
    }

logicalAND
    = left:equality _ right:("&&" _ equality _)* {
        if(right.length) {
            for(var i=0; i<right.length; i++) {
                left = {
                    type: AST.LogicalExpression,
                    left: left,
                    operator: '&&',
                    right: right[i][2]
                }
            }
        }
        return left        
    }

equality
    = left:relational _ right:(("===" / "!==" / "==" / "!=") _ relational _)* {
        if(right.length) {
            for(var i=0; i<right.length; i++) {
                left = {
                    type: AST.BinaryExpression,
                    left: left,
                    operator: right[i][0],
                    right: right[i][2]
                }
            }
        }
        return left        
    }

relational
    = left:additive _ right:(("<=" / ">=" / ">" / "<") _ additive _)* {
        if(right.length) {
            for(var i=0; i<right.length; i++) {
                left = {
                    type: AST.BinaryExpression,
                    left: left,
                    operator: right[i][0],
                    right: right[i][2]
                }
            }
        }
        return left        
    }

additive
    = left:multiplicative _ right:([+\-] _ multiplicative _)* {
        if(right.length) {
            for(var i=0; i<right.length; i++) {
                left = {
                    type: AST.BinaryExpression,
                    left: left,
                    operator: right[i][0],
                    right: right[i][2]
                }
            }
        }
        return left        
    }
    
multiplicative
    = left:unary _ right:([*/%] _ unary _)* {
        if(right.length) {
            for(var i=0; i<right.length; i++) {
                left = {
                    type: AST.BinaryExpression,
                    left: left,
                    operator: right[i][0],
                    right: right[i][2]
                }
            }
        }
        return left        
    }

unary
    = operator:[+!\-] _ argument:unary _ {
        return {
            type: AST.UnaryExpression,
            operator: operator,
            argument: argument
        }
    }
    / primary

primary
    = primaryLeft:primaryLeft _ primaryNext:primaryNext* {
        var primary = primaryLeft;
        if(primaryNext.length) {
            for(var i=0; i<primaryNext.length; i++) {
                if(primaryNext[i].callee) {
                    primaryLeft = primary
                    primary = primaryNext[i]
                    primary.callee = primaryLeft
                } else if(primaryNext[i].object) {
                    primaryLeft = primary
                    primary = primaryNext[i]
                    primary.object = primaryLeft
                }
            }
        }
        return primary
    }

primaryLeft
    = "(" _ filter:filter _ ")" _ {
        return filter
    }
    / "[" _ arrayDeclaration:arrayDeclaration _ "]" _ {
        return arrayDeclaration
    }
    / "{" _ properties:properties _ "}" _ {
        return {
            type: AST.ObjectExpression,
            properties: properties
        }
    }
    / constants
    / identifier
    / constant

primaryNext
    = "[" _ primary:primary _ "]" _ {
        return {
            type: AST.MemberExpression,
            object: {},
            property: primary,
            computed: true
        }
    }
    / "." _ identifier:identifier _ {
        return {
            type: AST.MemberExpression,
            object: {},
            property: identifier,
            computed: false
        }
    }
    / "(" _ parseArguments:parseArguments _ ")" _ {
        return {
            type: AST.CallExpression,
            callee: {},
            arguments: parseArguments
        }
    }
    
arrayDeclaration
	= elements:assignments? _ {
        return {
            type: AST.ArrayExpression,
            elements: elements || []
        }
    }
    
properties
	= property:keyvalue _ "," _ properties:properties _ {
        properties.unshift(property)
        return properties
    }
    / property:keyvalue _ ","? _ {
        return [{
            type: AST.Property,
            value: property.value,
            key: property.key
        }]
    }
    / _ {
        return []
    }

keyvalue
    = key:(identifier / constant) _ ":" _ value:assignment _ {
        return {
            key: key,
            value: value
        }
    }

parseArguments
	= arg:assignment _ "," _ args:parseArguments {
        args.unshift(arg)
        return args
    }
    / arg:assignment _ {
        return [arg]
    }
    / _ {
        return []
    }
    
identifier
    = name:$([a-zA-Z$_][a-zA-Z_0-9]*) { return { type: AST.Identifier, name: name} }

constants
	= "null"![a-zA-Z_0-9] {
        return { 
            type: AST.Literal,
            value: 'null'
        }
    }
    / "true"![a-zA-Z_0-9] {
        return {
            type: AST.Literal,
            value: true
        }
    }
    / "false"![a-zA-Z_0-9] {
        return {
            type: AST.Literal,
            value: false
        }
    }
    / "this"![a-zA-Z_0-9] {
        return { 
            type: AST.ThisExpression
        }
    }
    / "$locals"![a-zA-Z_0-9] {
        return {
            type: AST.LocalsExpression
        }
    }
    
constant
	= value:(string / number) {
        return {
            type: AST.Literal,
            value: value
        }
    }

string
    = "'" ("\\'" / [^'])* "'" {
        return text()
    }
    / '"' ('\\"' / [^"])* '"' {
        return text()
    }

number
    = int frac? exp? { return parseFloat(text()); }
    / frac exp? { return parseFloat(text()); }

digit1_9      = [1-9]
e             = [eE]
exp           = e (minus / plus)? DIGIT+
frac          = "." DIGIT+
int           = zero / (digit1_9 DIGIT*)
minus         = "-"
plus          = "+"
zero          = "0"
DIGIT  = [0-9]
 
 _ "whitespace"
  = [ \t\n\r]*