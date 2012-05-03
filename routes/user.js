
// user.js routes

var Neo4j = require('neo4j'),
	UUID = require('node-uuid'),
	db;

var User = function(config) {
	// TODO
	// gracefully set up default config values if none are passed in
	// or throw appropriate errors

	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);
	console.log(config.databaseUrl + ':' + config.port);

	var UsersReferenceNode = {};

	db.query("START n = (0) MATCH (n) <-[:USERS_REFERENCE]- (user_ref) RETURN user_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
		} else {
			UsersReferenceNode = nodes;
			console.log(UsersReferenceNode);
		}
	});

	var getUserByEmail = function(){
		// check graph to see if user exists by given email
	};

	var getUserByFacebookID = function(){
		// check graph to see if user exists by given FB id
	};

	return {
		checkUserExists: function(req,res,next) {
			// takes a request and checks Graph for ID with index of email or given FB id
			// returns positive if one is found, and the key
			// returns negative if neither is found
		},
		createUser: function(req,res,next){
			// { username, password (sha256), first, last, email, birthday, sex, location  }
			var newUser = JSON.parse(req.body.data);

			console.log('create user: ' + newUser);

			var userResponse = {
				id: UUID.v1(),
				username: newUser.username,
				first: newUser.first,
				last: newUser.last,
				email: newUser.email,
				birthday: newUser.birthday,
				sex: newUser.sex,
				location: newUser.location
			};

			console.log(userResponse);

			res.json(JSON.stringify(userResponse));
			res.end();
		}
	};
};

module.exports = User;