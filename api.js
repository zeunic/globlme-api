/**
* Module dependencies.
*/

var express = require('express'),
	format = require('util').format,
	api = module.exports = express.createServer();

var validate = require('./modules/validate.js'),
	stream = require('./routes/stream.js'),
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
	// api.use(express.bodyParser());
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


/*
 * Route definitions for /stream section of API
 */

api.get('/stream/:id/:relationship', setUpRequest, stream.getNodesByRelationship);
api.get('/stream/:id', setUpRequest, stream.getNodeById);
api.get('/stream', setUpRequest, stream.getStream);
api.put('/stream', setUpRequest, stream.updateNode);
api.post('/stream', setUpRequest, stream.createNode);
api.del('/stream/:id', setUpRequest, stream.deleteNode);

api.get('/', function(req, res){
  res.send('<form method="post" name="thisForm" id="thisForm" enctype="multipart/form-data">'
    + '<p>Title: <input type="text" name="title" /></p>'
    + '<p>Image: <input type="file" name="image" /></p>'
    + '<p><input type="submit" value="Upload" /></p>'
    + '</form>');
});

api.post('/', function(req, res, next){
  // the uploaded file can be found as `req.files.image` and the
  // title field as `req.body.title`

	req.on('data', function(){
		console.log('receiving data');
	});

	req.on('end', function(){
		console.log('request ended...');
		console.log(req);
	});

	// res.send(format('\nuploaded %s (%d Kb) to %s as %s'
	// 	, req.files.image.name
	// 	, req.files.image.size / 1024 | 0
	// 	, req.files.image.path
	// 	, req.body.title)
	// );
});



api.listen(3000);
console.log("Express server listening on port %d in %s mode", api.address().port, api.settings.env);
