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
	//Images = require('./modules/image.js'),
	Step = require('step');


/**
* Database Connection / Configuration Settings
*/

var dbConfig = { port: '7474', databaseUrl: '' };
dbConfig.databaseUrl = (api.settings.env == "development") ? "http://localhost" : "http://10.179.106.202";

// API Modules
var UserModule = new User(dbConfig),
	TagModule = new Tag(dbConfig),
	StreamModule = new Stream(dbConfig),
	MomentModule = new Moment(dbConfig),
	AdventureModule = new Adventure(dbConfig),
	GroupModule = new Group(dbConfig);


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


/**
* Route Control Settings and App Params
*/

// Route preconditions to set up a valid and authorized request and request data
var setUpRequest = [validate.validateRequestData, validate.authorizeRequest, validate.defineRequestAction];

// placeholder api version precondition
api.param(':apiVersion', function(req, res, next, apiVersion){
	if(apiVersion === 'v1') {
		next();
	} else {
		res.end('Invalid API Version request');
	}
});




/*
 * API Route Definitions and Mappings
 */


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
api.post('/:apiVersion/user/updatePhoto/', setUpRequest, UserModule.updatePhoto);


/**
* App Environment / Listen Settings
*/


if (api.settings.env == "development") {
	api.listen(3000);
} else {
	api.listen(80);
}