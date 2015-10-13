var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');
var Random = require('random-js');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["subject.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases()
        fakeDemo()

}

var engine = Random.engines.mt19937().autoSeed();

function createConcreteIntegerValue( greaterThan, constraintValue )
{
	if( greaterThan )
		return Random.integer(constraintValue,constraintValue+10)(engine);
	else
		return Random.integer(constraintValue-10,constraintValue)(engine);
}

function Constraint(properties)
{
	this.ident = properties.ident;
	this.expression = properties.expression;
	this.operator = properties.operator;
	this.value = properties.value;
	this.funcName = properties.funcName;
	// Supported kinds: "fileWithContent","fileExists"
	// integer, string, phoneNumber
	this.kind = properties.kind;
}

function fakeDemo()
{
	var ph = faker.phone.phoneNumberFormat();
	console.log(ph);
	console.log( '123-'+'919'+'-1234');
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': {}
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
		}
	}
};

function paraObject() {
return {'params': ''}
}

function coverAllConstrain(constrainted, paraId, length, newparams, tcs)
{
	if (paraId >= length)
	{
                var a = JSON.parse(JSON.stringify(newparams));;
                //console.log(a);
		tcs.push(a);
		//console.log(tcs);
		return;	
	}
	if (constrainted[paraId].length == 0)
	{	
		newparams[paraId] = '';
		coverAllConstrain(constrainted, paraId + 1, length, newparams, tcs);
		return;
	}
	
	for (var i=0; i < constrainted[paraId].length; i++)
	{
		newparams[paraId] = constrainted[paraId][i];
		//console.log(constrainted[paraId][i]);
		coverAllConstrain(constrainted, paraId+1, length, newparams, tcs);
	}
	return;
}

function generateTestCases()
{

	var content = "var subject = require('./subject.js')\nvar mock = require('mock-fs');\nvar _tmp_var='0';\n";
	for ( var funcName in functionConstraints )
	{
               console.log(funcName);
		
		var params = {};
		var constrainted = [];
		// initialize params
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			params[paramName] = '\'\'';
			constrainted[i] = [];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
		}
		//console.log( params );

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// Handle global constraints...
		var fileWithContent = _.some(constraints, {kind: 'fileWithContent' });
		var pathExists      = _.some(constraints, {kind: 'fileExists' });
		var dirExist = true;
		var fileWithoutContent = true;
		// plug-in values for parameters
		for( var c = 0; c < constraints.length; c++ )
		{
			var constraint = constraints[c];

			if( params.hasOwnProperty( constraint.ident ) )
			{
				var paraId = 0;
				for (var i =0; i< functionConstraints[funcName].params.length; i++ )
				{
					if(constraint.ident == functionConstraints[funcName].params[i])
					{
						paraId = i;
						break;
					}
				}
				constrainted[paraId].push(constraint);
			}
		}
		// generate all combinations
		//console.log("constrainted:");
		//console.log(constrainted);
		var tmpc = [];
		var alltc = [];
		coverAllConstrain(constrainted, 0, functionConstraints[funcName].params.length, tmpc, alltc);
		//console.log("All tc:");
		//console.log("printing alltc\n");
		console.log(alltc);
		for (var tc=0 ; tc < alltc.length; tc++)
		{
 	 		//console.log(alltc[tc]);
			for(var p =0; p < alltc[tc].length; p++)
			{
				//console.log(alltc[tc][p]);
				var constraint = alltc[tc][p];
				if(constraint == '')
				{
				   var parName = functionConstraints[funcName].params[p];
				   params[parName] = '\'\'';
				}
				else
				{
				   //console.log(constraint);
				   if(constraint.kind == 'phoneNumber')
				   {
					if(constraint.operator == 'substring')
					{
						params[constraint.ident] = '\'' +constraint.value+'9855489\'';
					}
					else
					{
					 	params[constraint.ident] = '\'' + faker.phone.phoneNumber()+'\'';
					}
				   }
				   else
				   { 
				       params[constraint.ident] = constraint.value;
				   }
				}
				   // Prepare function arguments.
			}
			//console.log(params);
			var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");
  			//console.log(args);
			if( 0 && (pathExists || fileWithContent))
			{
				content += generateMockFsTestCases(pathExists,!fileExist, fileWithContent,funcName, args);
				// Bonus...generate constraint variations test cases
				content += generateMockFsTestCases(pathExists, fileExist, fileWithContent, funcName, args);
				content += generateMockFsTestCases(!pathExists,!fileExist, fileWithContent,funcName, args);
				content += generateMockFsTestCases(pathExists,!fileExist, !fileWithContent,funcName, args);
				content += generateMockFsTestCases(!pathExists,!fileExist, !fileWithContent,funcName, args);
			}
			else
			{
			// Emit simple test case.
				content += "subject.{0}({1});\n".format(funcName, args );
			}
		}		
		var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");
		if( pathExists || fileWithContent )
		{
			content += generateMockFsTestCases(pathExists, dirExist, fileWithContent, fileWithoutContent, funcName, args);
			// Bonus...generate constraint variations test cases
			content += generateMockFsTestCases(pathExists, dirExist, fileWithContent, !fileWithoutContent, funcName, args);
			content += generateMockFsTestCases(pathExists, !dirExist, fileWithContent, fileWithoutContent, funcName, args);
			content += generateMockFsTestCases(!pathExists, !dirExist, fileWithContent, !fileWithoutContent, funcName, args);
			content += generateMockFsTestCases(pathExists, dirExist, !fileWithContent, false, funcName, args);
			content += generateMockFsTestCases(!pathExists, !dirExist, !fileWithContent,false, funcName, args);
		}
		else
		{
			// Emit simple test case.
			content += "subject.{0}({1});\n".format(funcName, args );
		}
	}


	fs.writeFileSync('test.js', content, "utf8");

}

function generateMockFsTestCases (pathExists, fileExists, fileWithContent, fileWithoutContent, funcName,args) 
{
	var testCase = "";
	// Build mock file system based on constraints.
	var mergedFS = {};
	if( pathExists )
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
		if(fileExists)
		{
			mergedFS[attrname] = {"dir1":"testdir"};
		}
	}
	if( fileWithContent )
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
		if(fileWithoutContent)
		{
			mergedFS[attrname] = {'file1':''};
		}
	}

	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			if(params.indexOf("phoneNumber") >-1)
			{
			// add phone number constraint
				functionConstraints[funcName].constraints.push( 
					new Constraint(
					{
						ident: "phoneNumber",
						value: '',
						funcName: funcName,
						kind: 'phoneNumber',
						operator : '',
						expression: ''
					}));
			}
			// Check for expressions using argument.
			traverse(node, function(child)
			{
 				if( child.type == 'UnaryExpression' && child.operator == "!")
				{
					if(child.argument.type == 'Identifier' && params.indexOf(child.argument.name)>-1)
					{
						var expression = buf.substring(child.range[0], child.range[1]);
							functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: child.argument.name,
									value: true,
									funcName: funcName,
									kind: 'boolean',
									operator : child.operator,
									expression: expression
								}));

					}
					if(child.argument.type == 'MemberExpression' && child.argument.object.type == 'Identifier'
						&& params.indexOf(child.argument.object.name)>-1
						&& child.argument.property)
					{
						var expression = buf.substring(child.range[0], child.range[1]);
						var val = {};
						var name = child.argument.property.name;
						val[name] = true;
						console.log(val);
							functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: child.argument.object.name,
									value: JSON.stringify(val),
									funcName: funcName,
									kind: 'string',
									operator : child.operator,
									expression: expression
								}));
					}
				}
				if( child.type === 'BinaryExpression')
				{
					if(child.left.type == 'Identifier' && child.operator == "==" && params.indexOf(child.left.name) <= 0 && params.indexOf("phoneNumber") > -1)
					{
						// must be area
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: 'phoneNumber',
								value: child.right.value,
								funcName: funcName,
								kind: 'phoneNumber',
								operator : 'substring',
								expression:''
							}));
					}
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						var cType = typeof(child.right.value);
						var rightRight;
						var rightLeft;
						if (cType == 'number')
						{
							rightRight = parseInt(rightHand)+1;
							rightLeft = parseInt(rightHand)-1;
						}
						else
						{
							rightRight = "_tmp_var";
							rightLeft = "_tmp_var";
						}


						if( child.operator == "==" || child.operator == "<" || child.operator == ">")
						{ 
							functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: child.left.name,
									value: rightHand,
									funcName: funcName,
									kind: cType,
									operator : child.operator,
									expression: expression
								}));
							if(cType == 'number')
							{
								functionConstraints[funcName].constraints.push( 
									new Constraint(
									{
										ident: child.left.name,
										value: rightRight,
										funcName: funcName,
										kind: cType,
										operator : child.operator,
										expression: expression
									}));
							}
							functionConstraints[funcName].constraints.push( 
								new Constraint(
								{
									ident: child.left.name,
									value: rightLeft,
									funcName: funcName,
									kind: cType,
									operator : child.operator,
									expression: expression
								}));
						}
					}
   					if(child.left.type == "CallExpression" && child.left.callee.type == "MemberExpression"
						&& child.left.callee.object.type == "Identifier")
					{
						var expression = buf.substring(child.range[0], child.range[1]);
						//var rightHand = buf.substring(child.left.arguments.range[0], child.left.arguments.range[1]);
						var cType = 'string';
						console.log(child.left.arguments[0].value);
						var rightHand = buf.substring(child.left.arguments[0].range[0],child.left.arguments[0].range[1]);
						functionConstraints[funcName].constraints.push(
                                                                new Constraint(
                                                                {
                                                                        ident: child.left.callee.object.name,
                                                                        value: rightHand,
                                                                        funcName: funcName,
                                                                        kind: cType,
                                                                        operator : child.operator,
                                                                        expression: expression
                                                                }));
					}
				}

				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file1'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								// A fake path to a file
								value:  "'path/fileExists'",
								funcName: funcName,
								kind: "fileExists",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}

			});

			console.log( functionConstraints[funcName]);

		}
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();
