// user.js routes
var request = require('request');

function typeOf(value) {
	var s = typeof value;
		if (s === 'object') {
			if (value) {
				if (value instanceof Array) {
					s = 'array';
				}
			} else {
				s = 'null';
		}
	}
	return s;
}

// util objects & libs
var Neo4j = require('neo4j'),
	UUID = require('node-uuid'),
	Step = require('step'),
	Images = require('image'),
	db,
	UserReferenceNode,
	ImagesModule;

// CONSTANTS
var INDEX_NAME = "user";

var User = function(config) {
	ImagesModule = new Images();

	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);

	db.query("START n = node(0) MATCH (n) <-[:USERS_REFERENCE]- (user_ref) RETURN user_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
		} else {
			UserReferenceNode = nodes[0]['user_ref'];
		}
	});

	var gremlinOptions = {
		uri: config.databaseUrl + ':' + config.port + '/db/data/ext/GremlinPlugin/graphdb/execute_script',
		method: 'POST',
		json: {}
	};

	var executeGremlin = function(query, callback) {
		gremlinOptions.json = { script: query };
		request(gremlinOptions, callback);
	};

	var getUserByEmail = function(userEmail, callback){
		db.getIndexedNode(INDEX_NAME, 'email', userEmail, callback);
	};

	var getUserByFacebookID = function(userFacebookID, callback){
		db.getIndexedNode(INDEX_NAME, 'fbID', userFacebookID, callback);
	};

	var getUserByUsername = function(userName, callback) {
		db.getIndexedNode(INDEX_NAME, 'username', userName, callback);
	};

	var formatInvites = function(nodes) {
		var inviteResults = [];

		for(var i=0, j=nodes.length; i<j; i++) {
			var newObj = {},
				invite = nodes[i][0].data,
				inviteID = nodes[i][0].self.split('/').pop(),
				collection = nodes[i][1].data,
				collectionID = nodes[i][1].self.split('/').pop(),
				collectionMembers = nodes[i][2].data,
				author = nodes[i][3].data,
				authorID = nodes[i][3].self.split('/').pop();

			delete author.password;

			newObj.author = author;
			newObj.authorID = authorID;
			newObj.collection = collection;
			newObj.collectionID = collectionID;
			newObj.moments = collectionMembers;
			newObj.invite = invite;
			newObj.inviteID = inviteID;
			inviteResults.push(newObj);
		}

		return inviteResults;
	};

	return {
		checkUserExists: function(req,res,next) {
			var data = JSON.parse(req.body.data);

			Step(
				function lookUpUser(){
					if(data.fbID && typeof data.fbID !== 'string') {
						var usersFbIDs = data.fbID,
							group = this.group();

						usersFbIDs.forEach(function(fbID){
							getUserByFacebookID(fbID, group());
						});

						getUserByEmail(data.email, group() );
					} else {
						getUserByFacebookID(data.fbID, this.parallel() );
						getUserByEmail(data.email, this.parallel() );
					}
				},
				function sendResults(err, resultsByFBId, resultsByEmail){
					var results = {};

					if(!resultsByEmail && !resultsByFBId) {
						results.status = 'error';
						results.message = 'No user(s) found with those credentials';
					} else if (resultsByFBId) {
						results.status = 'success';
						results.data = [];

						if(typeOf(resultsByFBId) === 'array') {
							for (var i=0, j=resultsByFBId.length; i<j; i++) {
								if(resultsByFBId[i]) {
									var userResult = resultsByFBId[i]._data.data;
									delete userResult.password;
									userResult.id = resultsByFBId[i].self.split('/').pop();
									results.data.push(userResult);
								}
							}
						} else {
							results.data = resultsByFBId._data.data;
							results.data.id = resultsByFBId.self.split('/').pop();
						}

					} else {
						results.status = 'success';
						results.data = resultsByEmail._data.data;
						results.data.id = resultsByEmail.self.split('/').pop();
						delete results.data.password;
					}
					res.json(results);
				}
			);
		},
		createUser: function(req,res,next){
			var newUser = JSON.parse(req.body.data),
				userNode, userFollows;

			var userData = {
				guid: UUID.v1(),
				username: newUser.username || 'required',
				first: newUser.first || 'required',
				last: newUser.last || 'required',
				password: newUser.password || 'required',
				birthday: newUser.birthday || 'required',
				sex: newUser.sex || 'required',
				country: newUser.country || 'required',
				location: newUser.location || 'required',
				photo: newUser.photo || '',
				email: newUser.email || 'required',
				optin: newUser.optin || false,
				fbID: newUser.fbID || '',
				twitterAccount: newUser.twitterAccount || '',
				bio: newUser.bio || 'Click edit in the top right to upload a profile photo, change your bio, and change your cover photo. You will need to upload your first moment from the Globl or Me tabs to select a cover photo.'
			};

			/*
			{
				followList: followList,
			}
			*/

			// this doesn't work, but needs to be checked
			// for(var prop in userData) {
			//	if (userData[prop] == 'required');
			//	console.log('required field was missing...');
			// }
			// console.log(userData);

			Step(
				function checkUserNameAndEmail(){
					getUserByUsername(userData.username, this.parallel() );
					getUserByEmail(userData.email, this.parallel() );
				},
				function createUserObject(err, resultByUsername, resultByEmail) {
					if(!err && !resultByUsername && !resultByEmail) {
						return userData;
					} else {
						// exit and do not save by not returning?
						res.json({ status: "error", message: "Ok so you can't do that because there is already a user name." });
					}
				},
				function createNode(err, newUserObject) {
					if(newUserObject) {
						userData = newUserObject;
						userNode = db.createNode(userData);
						return userNode;
					}
				},
				function uploadImagesToCDN(err, result) {
					if(userData.photo) {
						ImagesModule.storeImagesToCDN(userData.photo, userData.guid, this);
					} else {
						return 'no photo given';
					}
				},
				function imagesSavedToCDN(err, results) {
					if(!err && results.length) {
						userNode._data.data.photo = results[results.length-1];
					} else {
						// UH...
					}

					return userNode;
				},
				function saveNode(err, createdNode){
					userNode.save(this);
				},
				function indexNode(){
					userNode.index( INDEX_NAME, 'email', newUser.email, this.parallel() );
					userNode.index( INDEX_NAME, 'username', newUser.username, this.parallel() );
					userNode.index( 'fulltext', 'username', newUser.username, this.parallel() );
					if (newUser.fbID) { userNode.index( INDEX_NAME, 'fbID', newUser.fbID, this.parallel() ); }
				},
				function relateUserRef(){
					userNode.createRelationshipTo( UserReferenceNode, 'MEMBER_OF', {}, this );
				},
				function getUserFollows(){
					if(newUser.followList.length) {
						userFollows = [];
						var group = this.group();

						newUser.followList.forEach(function(userID){
							db.getNodeById( parseInt(userID), group() );
						});
					} else {
						return undefined; // is it bad that i don't fucking get this?
					}
				},
				function relateUserFollows(err, results){
					userFollows = results;
					if(!err && newUser.followList.length && results) {
						var group = this.group();

						userFollows.forEach(function(user){
							userNode.createRelationshipTo( user , 'FOLLOWS', {}, group() );
						});
					} else {
						return undefined; // is it bad that i don't fucking get this?
					}
				},
				function userSaveComplete(err){
					if(!err) {
						userData.id = userNode.id;
						res.json(  { status: "success", data: userData } );
					} else {
						res.json( { status: "error", message: err } );
					}
				}
			);
		},
		authorizeUser: function(req,res,next){
			var credentials = JSON.parse(req.body.data), userData = {};

			db.getIndexedNode('user', 'username', credentials.username, function(err, result) {
				if(!err && result) {
					userData = result._data.data;
				}

				if(userData.password === credentials.password) {
					delete userData.password;
					userData.id = result.id;
					res.json({ status: 'success', data: userData });
				} else {
					res.json({ status: 'error', message: 'Invalid login credentials' });
				}

			});
		},
		updatePhoto: function(req,res,next){
			var requestData = JSON.parse(req.body.data),
				userNode, image;

			Step(
				function getUserNode(){
					db.getNodeById(requestData.userid, this);
				},
				function storeUserNode(err, result) {
					if (err) res.json({ status: "err", message: err });
					userNode = result;
					return 'next';
				},
				function processImageToJpg(){
					ImagesModule.convertImageToJpg( req.files.image.path, this );
				},
				function processImageSizes(err, originalImage){
					if (err) {
						res.json({ status: "err", message: err });
					} else {
						userOriginalImage = originalImage;
						ImagesModule.saveImageSizes( req.files.image.path, this );
					}
				},
				function storeImageUrls(err, resizedImages){
					if (err) {
						res.json({ status: "err", message: err });
					} else {
						resizedImages.splice(0,0,userOriginalImage);
						ImagesModule.storeImagesToCDN(resizedImages, requestData.userguid, this);
					}
				},
				function saveUserNode(err, results){
					if (err) {
						res.json({ status: "err", message: err });
					} else {
						userNode.data.photo = results[0].replace('.jpg','');
						userNode.save(this);
					}
				},
				function sendResults(err, results) {
					if (err) {
						res.json({ status: "err", message: err });
					} else {
						res.json({
							status: "success",
							data: userNode.data.photo
						});
					}
				}
			);
		},
		getInvitations: function(req,res,next){
			var requestData = JSON.parse(req.body.data);
			var userID = requestData.id;

			var query = "g.v("+userID+").inE('INVITE').transform{[it, it.outV.next(), it.outV.in('MEMBER_OF').toList(), it.outV.in('CREATED').next() ]}";

			Step(
				function getUserInvitations(){
					executeGremlin(query, this);
				},
				function sendResults(err, results) {
					// console.log(results);
					var inviteResults = formatInvites(results.body);
					res.json({ status: "success", data: inviteResults });
				}
			);
		}
	};
};

module.exports = User;