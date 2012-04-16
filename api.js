/**
* Module dependencies.
*/

var express = require('express'),
	format = require('util').format,
	api = module.exports = express.createServer();

var validate = require('./modules/validate.js'),
	stream = require('./routes/stream.js'),
	cloudfiles = require('cloudfiles');

var config = { auth: { username: 'zeunicllc', apiKey: 'e4e2973174da5aeb4e63fbdd51f39527' } };
var cloudfilesClient = cloudfiles.createClient(config);

cloudfilesClient.setAuth(function(){
	cloudfilesClient.getContainer('globl.me', true, function(test, container){
		// console.log(container);
	});
});

/**
* Express App Configuration Settings
*/

api.configure(function(){
	api.set('views', __dirname + '/views');
	api.set('view engine', 'jade');
	api.use(express.bodyParser());
	api.use(express.methodOverride());
	api.use(api.router);
	api.use(express.static(__dirname + '/public'));
});

api.configure('development', function(){
	api.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

api.configure('production', function(){
	api.use(express.errorHandler());
});

// Route preconditions to set up a valid and authorized request and request data
var setUpRequest = [validate.validateRequestData, validate.authorizeRequest, validate.defineRequestAction];

api.param(':relationship', function(req,res, next, relationship) {
	console.log('this precondition would determine you gave a relationship param and validate it against the list of pre-determined valid relationship look ups (like comments/likes)');

	console.log(relationship);

	next();
});

// placeholder api version precondition
api.param(':apiVersion', function(req, res, next, apiVersion){
	if(apiVersion === 'v1') {
		next();
	} else {
		res.end('Invalid API Version request');
	}
});

/*
 * Route definitions for /stream section of API
 */

api.get('/:apiVersion/stream/:id/:relationship', setUpRequest, stream.getNodesByRelationship);
api.get('/:apiVersion/stream/:id', setUpRequest, stream.getNodeById);
api.get('/:apiVersion/stream', setUpRequest, stream.getStream);
api.put('/:apiVersion/stream', setUpRequest, stream.updateNode);
api.post('/:apiVersion/stream', setUpRequest, stream.createNode);
api.del('/:apiVersion/stream/:id', setUpRequest, stream.deleteNode);

if (api.settings.env == "development") {
	api.listen(3000);
} else {
	api.listen(80);
}