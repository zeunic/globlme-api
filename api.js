/**
* Module dependencies.
*/

var express = require('express'),
	api = module.exports = express.createServer();

var validate = require('./modules/validate.js'),
	stream = require('./modules/stream.js'),
	cloudfiles = require('cloudfiles');

// var config = { auth: { username: 'zeunicllc', apiKey: 'e4e2973174da5aeb4e63fbdd51f39527' } };
// var cloudfilesClient = cloudfiles.createClient(config);

// cloudfilesClient.setAuth(function(){
//   cloudfilesClient.getContainer('globl.me', true, function(test, container){
//     console.log(container);
//     container.getFiles(function(err, files){
//       console.log(files);
//     });
//   });
// });

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
var setUpRequest = [validate.authorizeRequest, validate.defineRequestAction, validate.validateRequestData];

api.param(':relationship', function(req,res, next, relationship) {
	console.log('this precondition would determine you gave a relationship param and validate it against the list of pre-determined valid relationship look ups (like comments/likes)');

	console.log(relationship);

	next();
});

// Temp & Test Routes
api.get('/admin', function(req,res){
	res.render('index', {title: 'admin'});
});


/*
 * Route definitions for /stream section of API
 */

api.get('/stream/:id/:relationship', setUpRequest, function(req,res,next){
	var id = req.params.id,
		relationship = req.params.relationship;
	if(id && relationship) {
		console.log('should get both: ');
		console.log(req.params);
	} else {
		next();
	}
});

api.get('/stream/:id', setUpRequest, function(req,res,next){
	var id = req.params.id;
	if(id) {
		console.log('should get node: ');
		console.log(req.params);
	} else {
		next();
	}
});

api.get('/stream', setUpRequest, function(req,res){
	console.log('no id OR relationship was passed');
});

api.put('/stream', setUpRequest, function(req,res){
	console.log('updating...');
	console.log(req.body);
});

api.post('/stream', setUpRequest, function(req,res){
	console.log('should post: ');
	cloudfilesClient.setAuth(function(){
		cloudfilesClient.addFile('globl.me', {
			remote: 'userGuid/file_cdn2.png',
			local: 'stream.png'
		}, function(err, uploaded){
			if(err) { console.log(err) }
			else { console.log(uploaded); console.log('now can i get that url back some how?'); }
		});
	});
});

api.del('/stream', setUpRequest, function(req,res){
	console.log('should delete: ');
	console.log(req.body);
});



api.listen(3000);
console.log("Express server listening on port %d in %s mode", api.address().port, api.settings.env);
