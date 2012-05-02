
// user.js routes

var Neo4j = require('neo4j'),
	UUID = require('node-uuid'),
	db;

var User = function(config) {
	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);
	console.log(config.databaseUrl + ':' + config.port);
};

User.prototype.userExists = function userExists(req,res,next) {
	// takes a request and checks Graph for ID with index of email or given FB id
	// returns positive if one is found, and the key
	// returns negative if neither is found

	db.getNodeById(1, function callback(err, result) {
		if (err) {
			console.error(err);
		} else {
			console.log(result);    // if an object, inspects the object
			// res.send(result.db._request.get.toString());
			console.log('creating createRelationshipTo');
			db.getNodeById(3, function callback(err, other){
				console.log('got the other id:');
				console.log(other);
				result.createRelationshipTo(other, 'attempt_what', { data: "lol what is this" }, function(err){
					console.log('create rel args');
					console.dir(arguments);
				});
			});
		}
	});

	// res.send('Fetch\'d');
	//res.end();

};

User.prototype.createUser = function createUser(req,res,next) {
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

};

module.exports = User;