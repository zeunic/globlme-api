/**
* Module dependencies.
*/

var express = require('express'),
	format = require('util').format,
	api = module.exports = express.createServer();

var validate = require('./modules/validate.js'),
	stream = require('./routes/stream.js'),
	User = require('./routes/user.js'),
	Moment = require('./routes/moment.js'),
	Admin = require('./routes/admin.js'),
	//Images = require('./modules/image.js'),
	Step = require('step');

var dbConfig = { port: '7474', databaseUrl: '' };

dbConfig.databaseUrl = (api.settings.env == "development") ? "http://localhost" : "http://10.179.106.202";


// API Modules
var UserModule = new User(dbConfig),
	//ImageModule = new Images(),
	MomentModule = new Moment(),
	AdminModule = new Admin(dbConfig);




/**
* Express App Configuration Settings
*/

api.configure(function(){
	api.set('views', __dirname + '/views');
	api.set('view engine', 'jade');
	api.use(express.bodyParser({ uploadDir:'./_uploads' }));
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
var setUpRequest = [validate.validateRequestData/*, validate.authorizeRequest*/, validate.defineRequestAction];

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

// api.get('/image', function(req,res,next){
// 	Step(
// 		function(){
// 			images.formatImage['convertImageToJpg']('_tmp_images/tebowing.jpg', this);
// 		},
// 		function(err, errInfo, imageInfo) {
// 			console.log('image info obtained and converted if need be...');
// 			console.dir(arguments);
// 			images.formatImage['cropSquare'](imageInfo, 0, 0, this);
// 		}, function(err) {
// 			console.log('converted image to jpg, then cut a square of it, now ready to poop out thumbs');
// 			// images.formatImage['saveImageSizes'](originalSourcePath);
// 		}
// 	);
// });

// stream route declarations -> maps to stream.js
// api.get('/:apiVersion/stream/:id', setUpRequest, stream.getNodesByRelationship);
// api.get('/:apiVersion/stream/:id', setUpRequest, stream.getNodeById);
// api.get('/:apiVersion/stream', setUpRequest, stream.getStream);
// api.put('/:apiVersion/stream', setUpRequest, stream.updateNode);
// api.post('/:apiVersion/stream', setUpRequest, stream.createNode);
// api.del('/:apiVersion/stream/:id', setUpRequest, stream.deleteNode);


// comment here
api.post('/:apiVersion/moment', setUpRequest, MomentModule.createMoment);

// user route declarations -> maps to ./routes/user.js
api.get('/:apiVersion/user/exists', UserModule.checkUserExists);
api.post('/:apiVersion/user/create', setUpRequest, UserModule.createUser);


// Admin Routes
api.get('/admin/query', AdminModule.query);
api.post('/admin/createNode', AdminModule.createNode);
api.post('/admin/createRel', AdminModule.createRel);

if (api.settings.env == "development") {
	api.listen(3000);
} else {
	api.listen(80);
}