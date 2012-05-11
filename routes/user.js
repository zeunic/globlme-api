// user.js routes

// util objects & libs
var Neo4j = require('neo4j'),
	UUID = require('node-uuid'),
	Step = require('step'),
	db,
	UserReferenceNode;

// CONSTANTS
var INDEX_NAME = "user";

var User = function(config) {
	// TODO
	// gracefully set up default config values if none are passed in
	// or throw appropriate errors

	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);
	console.log(config.databaseUrl + ':' + config.port);

	db.query("START n = node(0) MATCH (n) <-[:USERS_REFERENCE]- (user_ref) RETURN user_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
			console.log('Unable to locate a valid reference node for users');
			console.log(errors);
		} else {
			UserReferenceNode = nodes[0]['user_ref'];
			// console.log(UserReferenceNode);
		}
	});

	var getUserByEmail = function(userEmail, callback){
		db.getIndexedNode('user', 'email', userEmail, callback);
	};

	var getUserByFacebookID = function(userFacebookID, callback){
		db.getIndexedNode('user', 'fbID', userFacebookID, callback);
	};

	return {
		checkUserExists: function(req,res,next) {
			var data = JSON.parse(req.body.data);

			Step(
				function lookUpUser(){
					getUserByEmail(data.email, this.parallel() );
					getUserByFacebookID(data.fbID, this.parallel() );
				},
				function sendResults(err, resultsByEmail, resultsByFBId){
					// does logic go here for this?

					var userData = {};

					if(!resultsByEmail && !resultsByFBId) {
						res.json({ status: 'error', message: 'No user found with those credentials.' });
					} else if (resultsByFBId) {
						userData = resultsByFBId._data.data;
					} else {
						userData = resultsByEmail._data.data;
					}

					delete userData.password;
					res.json({ status: 'success', data: userData });

				}
			);

			// end or next?
		},
		createUser: function(req,res,next){
			// { username, password (sha256), first, last, email, birthday, sex, location  }

			// TODO: validate incoming user sign up data
			// TODO: check that existing username does not exist in db
			// prior to saving new info

			// TODO: lucene full text search indexing?

			var newUser = JSON.parse(req.body.data);
			var userData = {
				id: UUID.v1(),
				username: newUser.username,
				first: newUser.first,
				last: newUser.last,
				email: newUser.email,
				birthday: newUser.birthday,
				sex: newUser.sex,
				location: newUser.location,
				password: newUser.password,
				fbID: newUser.fbID || ''
			};

			var node = db.createNode(userData);

			Step(
				function saveNode(){
					node.save(this);
				},
				function indexNode(){
					node.index( INDEX_NAME, 'email', newUser.email, this.parallel() );
					node.index( INDEX_NAME, 'username', newUser.username, this.parallel() );
					if (newUser.fbID) { node.index( INDEX_NAME, 'fbID', newUser.fbID, this.parallel() ); }
				},
				function relateUserRef(){
					node.createRelationshipTo( UserReferenceNode, 'MEMBER_OF', {}, this );
				},
				function userSaveComplete(err){
					if(!err) {
						res.json(  { status: "success", data: userData } );
					} else {
						res.json( { status: "error", mesage: err } );
					}

					res.end();
				}
			);
		},
		authorizeUser: function(req,res,next){
			var credentials = JSON.parse(req.body.data), userData;
			console.log('testing...');

			db.getIndexedNode('user', 'username', credentials.username, function(err, result){
				if(!err && result) {
					userData = result._data.data;
				}

				if(userData.password === credentials.password) {
					delete userData.password;
					res.json({ status: 'success', data: userData });
				} else {
					res.json({ status: 'error', message: 'Invalid login credentials' });
				}

			});
		}
	};
};

module.exports = User;