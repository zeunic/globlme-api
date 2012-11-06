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
	apn = require('apn'),
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
				bio: newUser.bio || 'Click edit in the top right to change your bio and profile photo. You will need to upload 5 moments to fill your Top 5 photos above. You can upload moments from the Globl, Me, and Settings tabs.'
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
			console.log('create this user: ');
			console.log(userData);

			Step(
				function checkUserNameAndEmail(){
					getUserByUsername(userData.username, this.parallel() );
					getUserByEmail(userData.email, this.parallel() );
				},
				function createUserObject(err, resultByUsername, resultByEmail) {
					console.log('get by email and username back...');
					console.dir(arguments);
					if(!err && !resultByUsername && !resultByEmail) {
						return userData;
					} else {
						// exit and do not save by not returning?
						res.json({ status: "error", message: "Ok so you can't do that because there is already a user name." });
					}
				},
				function createNode(err, newUserObject) {
					console.log('there didnt seem to be an error, make a node');
					if(newUserObject) {
						userData = newUserObject;
						userNode = db.createNode(userData);
						return userNode;
					}
				},
				function uploadImagesToCDN(err, result) {
					console.log('node made, now upload photo...');
					if(userData.photo) {
						ImagesModule.storeImagesToCDN(userData.photo, userData.guid, this);
					} else {
						this();
					}
				},
				function imagesSavedToCDN(err, results) {
					console.log('images uploaded?');
					if(!err && results.length) {
						userNode._data.data.photo = results[results.length-1];
					} else {
						// UH...
					}

					return userNode;
				},
				function saveNode(err, createdNode){
					console.log('images uploaded');
					userNode.save(this);
				},
				function indexNode(){
					console.log('node saved...');

					userNode.index( INDEX_NAME, 'email', newUser.email, this.parallel() );
					userNode.index( INDEX_NAME, 'username', newUser.username, this.parallel() );
					userNode.index( 'fulltext', 'username', newUser.username, this.parallel() );
					if (newUser.fbID) { userNode.index( INDEX_NAME, 'fbID', newUser.fbID, this.parallel() ); }
				},
				function relateUserRef(){
					console.log('node was indexed');

					userNode.createRelationshipTo( UserReferenceNode, 'MEMBER_OF', {}, this );
				},
				function getUserFollows(){
					console.log('node made a user');

					if(newUser.followList.length) {
						userFollows = [];
						var group = this.group();

						newUser.followList.forEach(function(userID){
							db.getNodeById( parseInt(userID), group() );
						});
					} else {
						console.log('no follows...');
						this(true, false); // is it bad that i don't fucking get this?
					}
				},
				function relateUserFollows(err, results){
					console.log('got the user follows');
					console.dir(arguments);
					userFollows = results;
					if(!err && newUser.followList.length && results) {
						var group = this.group();

						userFollows.forEach(function(user){
							userNode.createRelationshipTo( user , 'FOLLOWS', {}, group() );
						});
					} else {
						this(); // is it bad that i don't fucking get this?
					}
				},
				function userSaveComplete(err){
					console.log('user save complete!');
					if(!err) {
						userData.id = userNode.id;
						res.json(  { status: "success", data: userData } );
						console.log('sent!');
					} else {
						res.json( { status: "error", message: err } );
						console.log('error!');
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
		},
		pushNotification: function(req,res,next) {
			var notifyData = JSON.parse(req.body.data),
				pushToken;

			console.log(notifyData);

			Step(function getUser(){
				db.getNodeById(notifyData.id, this);
			}, function checkPushToken(err, user){
				if(!err && user._data && user._data.data) {
					pushToken = user._data.data.pushToken;
					if(pushToken) {
						this(undefined, user);
					}
				}
			}, function sendNotification(){
				var options = {
					cert: 'cert/cert.pem',                 /* Certificate file path */
					certData: null,                   /* String or Buffer containing certificate data, if supplied uses this instead of cert file path */
					key:  'cert/key.pem',                  /* Key file path */
					keyData: null,                    /* String or Buffer containing key data, as certData */
					passphrase: null,                 /* A passphrase for the Key file */
					ca: null,                         /* String or Buffer of CA data to use for the TLS connection */
					gateway: 'gateway.push.apple.com',/* gateway address */
					port: 2195,                       /* gateway port */
					enhanced: true,                   /* enable enhanced format */
					errorCallback: function(err, notification){
						console.log('apn error');
						console.dir(arguments);
					},         /* Callback when error occurs function(err,notification) */
					cacheLength: 100                  /* Number of notifications to cache for error purposes */
				};

				var apnsConnection = new apn.Connection(options);

				var userDevice = new apn.Device(pushToken);

				var badgeValueBugFucker = parseInt(notifyData.badge, 10);

				var note = new apn.Notification();
				// note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
				note.badge = badgeValueBugFucker;
				note.sound = notifyData.sound;
				note.alert = notifyData.alert;
				note.payload = notifyData.payload;
				note.device = userDevice;

				apnsConnection.sendNotification(note);

				console.log('send notification to: ' + pushToken);
			});
		}
	};
};

module.exports = User;