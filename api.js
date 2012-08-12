/**
* Module dependencies.
*/

var express = require('express'),
	format = require('util').format,
	api = module.exports = express.createServer();

var validate = require('./modules/validate.js'),
	Stream = require('./routes/stream.js'),
	User = require('./routes/user.js'),
	Moment = require('./routes/moment.js'),
	Tag = require('./routes/tags.js'),
	Adventure = require('adventure.js'),
	Group = require('group.js'),
	Images = require('image.js'),
	Step = require('step'),
	email = require('mailer');


/**
* Database Connection / Configuration Settings
*/

var dbConfig = { port: '7474', databaseUrl: '' };

console.log(api.settings.env);

switch (api.settings.env) {
	case "production" :
		dbConfig.databaseUrl = "http://10.179.106.202";
		break;
	case "development" :
		dbConfig.databaseUrl = "http://10.179.74.14";
		break;
	default :
		dbConfig.databaseUrl = "http://localhost";
	break;
}

console.log(dbConfig);

// API Modules
var UserModule = new User(dbConfig),
	TagModule = new Tag(dbConfig),
	StreamModule = new Stream(dbConfig),
	MomentModule = new Moment(dbConfig),
	AdventureModule = new Adventure(dbConfig),
	GroupModule = new Group(dbConfig),
	ImageModule = new Images({});


/**
* Email Handling?
*/

process.on('uncaughtException', function (err) {
	// console.log('Caught exception: ' + err);

	console.log(err);
	console.log(err.stack);

	var message = "WARNING: Globl.me API Error: \r\n\r\n" +
		"ERROR: " + err +"\r\n" +
		"STACK: " + err.stack;

	email.send({
		host: 'smtp.gmail.com',
		port: '25',
		to: 'Stephen Rivas Jr <stephen@zeunic.com>',
		from: 'Globl.me API <social@zeunic.com>',
		subject: 'WARNING: Globl.me API Error',
		body: message,
		username: 'social@zeunic.com',
		password: '$s4sites',
		authentication: 'login'
	}, function(err, result){
		console.log(err || result);
	});

});


/**
* Express App Configuration Settings
*/

api.configure(function(){
	api.set('views', __dirname + '/views');
	api.set('view engine', 'jade');
	api.use(function(req,res,next){
		console.log('middleware');
		if (req.originalUrl === '/v1.1/uploads') {
			console.log('need to grab async here');
			ImageModule.acceptAsyncUpload(req,res,next);
		} else {
			console.log('uh, no route or path matched?');
			console.log(req.originalUrl);
			next();
		}
	});
	api.use(express.bodyParser({ uploadDir:'./_uploads' }));
	api.use(express.methodOverride());
	api.use(api.router);
	// api.use(express.static(__dirname + '/public'));
});

api.configure('development', function(){
	api.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

api.configure('production', function(){
	api.use(express.errorHandler());
});


/**
* Route Control Settings and App Params
*/

// Route preconditions to set up a valid and authorized request and request data
var setUpRequest = [validate.validateRequestData, validate.authorizeRequest, validate.defineRequestAction];

// placeholder api version precondition
api.param(':apiVersion', function(req, res, next, apiVersion){
	if(apiVersion === 'v1.1') {
		next();
	} else {
		res.json({ status: "error", message: "api version invalid, please upgrade your application" });
		res.end();
	}
});




/*
 * API Route Definitions and Mappings
 */

api.post('/uploads/', function(req,res,next){
	
});

// stream route declarations -> maps to stream.js
api.post('/:apiVersion/stream', setUpRequest, StreamModule.getStream);
api.post('/:apiVersion/stream/search', setUpRequest, StreamModule.search);

api.post('/:apiVersion/stream/relationships/create/:start', setUpRequest, StreamModule.createRelationship);
api.post('/:apiVersion/stream/relationships', setUpRequest, StreamModule.searchRelationships);

// Get User-Specific Stream
api.post('/:apiVersion/stream/me/:id', setUpRequest, StreamModule.getMeStream);

// Get Collections
api.post('/:apiVersion/stream/adventure/:id', setUpRequest, StreamModule.getAdventure);
api.post('/:apiVersion/stream/tag/:id', setUpRequest, StreamModule.getTag);
api.post('/:apiVersion/stream/group/:id', setUpRequest, StreamModule.getGroup);

// specific routes for getting a user, or a user profile
api.post('/:apiVersion/stream/profile/:id', setUpRequest, StreamModule.getProfile);
api.post('/:apiVersion/stream/user/:id', setUpRequest, StreamModule.getUserStream);

api.post('/:apiVersion/node/delete/:id', setUpRequest, StreamModule.deleteNode);
api.post('/:apiVersion/relationship/delete/:id', setUpRequest, StreamModule.deleteRelationship);
api.post('/:apiVersion/node/update/:id', setUpRequest, StreamModule.updateNode);
api.post('/:apiVersion/relationship/update/:id',setUpRequest, StreamModule.updateRelationship);

// tag creation -> maps to ./routes/tags.js
api.post('/:apiVersion/tag/create', setUpRequest, TagModule.createTag);

// moment specific routes -> maps to ./routes/moment.js
api.post('/:apiVersion/moment/create',setUpRequest, MomentModule.createMoment);

// moment specific routes -> maps to ./routes/adventure.js
api.post('/:apiVersion/adventure/create',setUpRequest, AdventureModule.create);

// moment specific routes -> maps to ./routes/adventure.js
api.post('/:apiVersion/group/create',setUpRequest, GroupModule.create);

// user route declarations -> maps to ./routes/user.js
api.post('/:apiVersion/user/exists', setUpRequest, UserModule.checkUserExists);
api.post('/:apiVersion/user/auth', setUpRequest, UserModule.authorizeUser);
api.post('/:apiVersion/user/create', setUpRequest, UserModule.createUser);
api.post('/:apiVersion/user/updatePhoto', setUpRequest, UserModule.updatePhoto);

// api.post('/:apiVersion/magic/lol', setUpRequest, TagModule.magicLol);

// invitations route, not sure where to put this yet
api.post('/:apiVersion/user/invitations', setUpRequest, UserModule.getInvitations);

api.post('/:apiVersion/feedback', setUpRequest, function(req, res, next){
	var feedback = JSON.parse(req.body.data).text,
		username = JSON.parse(req.body.data).username;

	var message = "In App Feedback from: " + username + ": \r\n\r\n" +
		feedback;

	email.send({
		host: 'smtp.gmail.com',
		port: '25',
		to: 'Support <social@zeunic.com>',
		from: 'Feedback <social@zeunic.com>',
		subject: 'Globl.me In-App Feedback',
		body: message,
		username: 'social@zeunic.com',
		password: '$s4sites',
		authentication: 'login'
	}, function(err, result){
		console.log(err || result);
		if(result) res.json({ status: "success", message: "Feedback sent"});
	});

});


/**
* App Environment / Listen Settings
*/


switch (api.settings.env) {
	case "production" :
		api.listen(80);
		break;
	case "development" :
		api.listen(80);
		console.log('API server started on port %s', api.address().port);
		break;
	default :
		api.listen(3000);
		console.log('API server started on port %s', api.address().port);
	break;
}