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
		// check graph to see if user exists by given email
		var userCheck = {};
		console.log('checking by email...');

		db.getIndexedNode('users', 'email', userEmail, function(err, result){
			if(!err) {
				console.log(results);
				callback(results);
			} else {
				console.log(err);
				callback({ status: 'error', message: err });
			}
		});
	};

	var getUserByFacebookID = function(userFacebookID, callback){
		// check graph to see if user exists by given FB id
		var userCheck = {};
		console.log('checking by fbID...');

		db.getIndexedNode('users', 'fbID', userFacebookID, function(err, result){
			if(!err) {
				console.log(results);
				callback(results);
			} else {
				console.log(err);
				callback({ status: 'error', message: err });
			}
		});
	};

	return {
		checkUserExists: function(req,res,next) {
			// takes a request and checks Graph for ID with index of email or given FB id
			// returns positive if one is found, and the key
			// returns negative if neither is found

			// { key: 'globlme',
			//   data: '{"email":"joseph.lessard@yahoo.com","fbID":"19213532","unique":0.968396843643859}',
			//   auth: '324ee1716342a1a92720d28e9a51ceb5622bc50a0091df5703e19e2b9dfa1734' }

			var data = JSON.parse(req.body.data);

			getUserByEmail(data.email, function(){
				console.log('return from email check');
				console.dir(arguments);
			});

			getUserByFacebookID(data.fbID, function(){
				console.log('return from fb check');
				console.dir(argumments);
			});

			res.json({
				status: "success",
				data: {
					id: UUID.v1(),
					username: "stephen",
					first: "Stephen",
					last: "Rivas Jr",
					email: "me@stephenrivasjr.com",
					birthday: new Date().getTime(),
					sex: "M",
					location: "Orlando"
				}
			});

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
					if (!fbID) node.index( INDEX_NAME, 'email', newUser.fbID, this.parallel() );
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
		}
	};
};

module.exports = User;