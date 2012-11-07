/*
 * Stream.js is used to define functions for retrieving and saving data on the Globl.me Stream.
 * (finish desc later)
 */

var request = require('request'),
	log4js = require('log4js');
	
log4js.configure({
    appenders: [
        {
            type: "file",
            filename: "stream.log",
            category: [ 'stream' ]
        },
        {
            type: "console"
        }
    ],
    replaceConsole: false
});

var logger = log4js.getLogger('stream');

var Search = require('search.js'),
	SearchRels = require('search-rels.js'),
	Step = require('step'),
	Neo4j = require('neo4j'),
	Format = require('format.js');


var db,
	TAGS_REFERENCE,
	USERS_REFERENCE,
	GROUPS_REFERENCE,
	ADVENTURES_REFERENCE,
	MOMENTS_REFERENCE,
	FormatUtil = new Format();

var Stream =  function(config){
	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);

	var SearchModule = new Search(db);

	var gremlinOptions = {
		uri: config.databaseUrl + ':' + config.port + '/db/data/ext/GremlinPlugin/graphdb/execute_script',
		method: 'POST',
		json: {}
	};

	var executeGremlin = function(query, callback) {
		gremlinOptions.json = { script: query };
		request(gremlinOptions, callback);
	};

	// takes any number of objects and merges them in to one object
	// last object in will overwrite previous object keys
	// not recursive, use with caution; exectues callback and returns new object
	var objectMerge = function(objects, callback){
		var out = {};
		if(!objects.length)
			return out;
		for(var i=0; i<objects.length; i++) {
			for(var key in objects[i]){
				out[key] = objects[i][key];
			}
		}
		callback(undefined, out);
	};

	var formatGroups = function(nodes) {
		var groupsResults = [];
		for(var i=0, j=nodes.length; i<j; i++) {
			var newObj = {},
				tags = nodes[i][1],
				group = nodes[i][0],
				moment = nodes[i][2][0],
				author = nodes[i][3],
				numFollowers = nodes[i][4];

			if(group && tags && moment) {
				newObj.title = group.data.title;
				newObj.node = group.data;
				newObj.id = group.self.split('/').pop();
				newObj.author = author.data.username;
				newObj.numFollowers = numFollowers;

				newObj.tags = [];

				for (var k=0, l=tags.length; k<l; k++) {
					var el = tags[k];

					var tag = {
						id: el.self.split('/').pop(),
						title: el.data.tag
					};
					newObj.tags.push(tag);
				}

				newObj.imageUrl = moment.data.imageUrl;
				newObj.focusPoint = moment.data.focusPoint;
				groupsResults.push(newObj);

			}
		}
		return groupsResults;
	};

	var formatMoments = function(nodes) {
		var momentResults = [];
		if (nodes.length) {
			for (var i=0, j=nodes.length; i<j; i++) {
				var newObj = {},
					node = nodes[i][0],
					tags = nodes[i][1],
					author = nodes[i][2],
					likes = nodes[i][3];

				var formattedTags =[];

				if(tags.length) {
					for(var k=0, l=tags.length; k<l; k++) {
						var tag = {
							id: tags[k].self.split('/').pop(),
							title: tags[k].data.tag
						};
						formattedTags.push(tag);
					}
				}

				var totalLikes = 0;

				if(likes.length) {
					for (var m=0, n=likes.length; m<n; m++) {
						totalLikes += likes[m].data.value;
					}
				}

				newObj.node = node.data;
				newObj.totalLikes = totalLikes;
				newObj.recent = node.data.date;
				newObj.popularity = node.data.popularity;
				newObj.tags = formattedTags;
				newObj.id = node.self.split('/').pop();
				newObj.authorUserName = author.data.username;
				newObj.authorID = author.self.split('/').pop();

				momentResults.push(newObj);
			}
		}

		return momentResults;
	};

	var formatUsers = function(nodes) {
		var usersResults = [];
		if (nodes.length) {
			for(var i=0, j=nodes.length; i<j; i++) {
				var el = nodes[i][0],
					followers = nodes[i][1];
				var newObj = {
					id: el.self.split('/').pop(),
					node: el.data,
					totalFollowers: followers.length
				};

				delete newObj.node.password;

				usersResults.push(newObj);
			}
		}

		return usersResults;
	};

	var formatAdventures = function(nodes){
		var adventuresResults = [];
		if(nodes.length) {
			for (var i=0, j=nodes.length; i<j; i++) {
				var newObj = {},
					adventure = nodes[i][0][0],
					moment = nodes[i][1][0],
					tags = nodes[i][2],
					author = nodes[i][3],
					totalMoments = nodes[i][1].length,
					adventureMoments = FormatUtil.moments ( nodes[i][4] );

				if(adventure) {
					delete author.password;

					newObj.id = adventure.self.split('/').pop();
					if (moment) {
						newObj.imageUrl = moment.data.imageUrl;
					} else {
						newObj.imageUrl = '';
					}

					newObj.tags = [];
					newObj.node = adventure.data;
					newObj.author = author.data.username || null;
					newObj.totalMoments = totalMoments;
					newObj.recent = 0;
					newObj.adventureMoments = adventureMoments.data;
					newObj.totalLikes = adventureMoments.totalLikes;

					if (adventure.data.startDate) {
						newObj.recent = adventure.data.startDate;
					} else {
						newObj.recent = adventure.data.date;
					}

					newObj.node.date = newObj.recent;

					if(tags) {
						for (var k=0, l=tags.length; k<l; k++){
							var tag = {
								id: tags[k].self.split('/').pop(),
								title: tags[k].data.tag
							};

							newObj.tags.push(tag);
						}
					}

					adventuresResults.push(newObj);
				}
			}
		}

		return adventuresResults;
	};

	// takes an array of { type: "(collectionType)", data: [...] } objects and condenses and sorts them by .recent
	var sortByRecent = function(nodes) {
		// var startTime, endTime;
		// startTime = new Date().getTime();

		var joinedMomentResults = [];
		for (var i=0, j=nodes.length; i<j; i++) {
			joinedMomentResults = joinedMomentResults.concat(nodes[i].data);
		}

		// TODO: Move to a sorting file / object
		joinedMomentResults.sort(function(a,b){
			if(a.recent < b.recent)
				return 1;
			return -1;
		});

		//TODO: Move to a sorting / duplicate remover / ranking file
		var removedDuplicateResults = [];
		for (var k=0, l=joinedMomentResults.length; k<l; k++) {
			if(joinedMomentResults[k+1]) {
				if(joinedMomentResults[k+1].recent == joinedMomentResults[k].recent) {
					// console.log('found dupe');
				} else {
					removedDuplicateResults.push(joinedMomentResults[k]);
				}
			} else {
				removedDuplicateResults.push(joinedMomentResults[k]);
			}
		}

		// endTime = new Date().getTime();
		// var timeInfo = 'Nodes sorted by recent in: ' + (endTime - startTime) + ' ms';
		// logger.info(timeInfo);
		return removedDuplicateResults;
	};

	var sortByPopular = function(nodes) {
		// var startTime, endTime;
		// startTime = new Date().getTime();

		var joinedMomentResults = [];
		for (var i=0, j=nodes.length; i<j; i++) {
			joinedMomentResults = joinedMomentResults.concat(nodes[i].data);
		}

		// TODO: Move to a sorting file / object

		joinedMomentResults.sort(function(a,b){
			var aDecayLikes = a.totalLikes /  (( (new Date().getTime() - a.node.date) / 1000 / 60 / 60 / 24 ) + 1);
			var bDecayLikes = b.totalLikes / (( (new Date().getTime() - b.node.date) / 1000 / 60 / 60 / 24 ) + 1);

			if(aDecayLikes < bDecayLikes)
				return 1;
			return -1;
		});

		/*
		//TODO: Move to a sorting / duplicate remover / ranking file
		var removedDuplicateResults = [];
		for (var k=0, l=joinedMomentResults.length; k<l; k++) {
			if(joinedMomentResults[k+1]) {
				if(joinedMomentResults[k+1].recent == joinedMomentResults[k].recent) {
					// console.log('found dupe');
				} else {
					removedDuplicateResults.push(joinedMomentResults[k]);
				}
			} else {
				removedDuplicateResults.push(joinedMomentResults[k]);
			}
		} */

		// endTime = new Date().getTime();
		// var timeInfo = 'Nodes sorted by popularity in: ' + (endTime - startTime) + ' ms';
		// logger.info(timeInfo);
		// return removedDuplicateResults;

		return joinedMomentResults;
	};

	var FilterMeStream = {
		tags: function(userID, filter, callback){
			var query = "g.v("+userID+").out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList()]}";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var tagsResults = formatMoments(nodes);
					callback(undefined, { type: "moments", data: tagsResults });
				}
			);
		},
		users: function(userID, filter, callback){
			// id, node
			var query = "g.v("+userID+").out('FOLLOWS').out('MEMBER_OF').out('USERS_REFERENCE').back(2).out('CREATED').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList()]}";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var usersResults = formatMoments(nodes);
					callback(undefined, { type:"moments", data: usersResults });
				}
			);
		},
		groups: function(userID, filter, callback){
			// imageUrl, tags, title, id

			var query = "g.v("+userID+").out('FOLLOWS').out('MEMBER_OF').out('GROUPS_REFERENCE').back(2).out('FOLLOWS').out('MEMBER_OF').out('USERS_REFERENCE','TAGS_REFERENCE').back(2).both('CREATED','TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList() ]}";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var groupsResults = formatMoments(nodes);
					callback(undefined, { type: "moments", data: groupsResults });
				}
			);
		},
		adventures: function(userID, filter, callback){
			// imageUrl, tags, title, id
			var query = "g.v("+userID+").out('FOLLOWS').out('MEMBER_OF').out('ADVENTURES_REFERENCE').back(2).in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList()]}";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var adventuresResults = formatMoments(nodes);
					var adventuresByRecent = sortByRecent([ { data: adventuresResults} ]);
					callback(undefined, { type: "moments", data: adventuresByRecent });
				}
			);
		}//,
		// moments: function(userID, filter, callback){
		// 	var query = "g.v(0).inE('MOMENTS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{ [it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList()] }";

		// 	Step(
		// 		function callGremlin(){
		// 			executeGremlin(query, this);
		// 		},
		// 		function results(err, res, nodes){
		// 			var momentResults = formatMoments(nodes);
		// 			callback(undefined, { type: "moments", data: momentResults.reverse() });
		// 		}
		// 	);
		// }
	};

	var FilterStream = {
		tags: function(sortBy, callback){
			var query = "g.v(0).inE('TAGS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{[ it.in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList() ]}.dedup";

			var startTime, endTime;
			Step(
				function callGremlin(){
					executeGremlin(query, this);
					startTime = new Date().getTime();
				},
				function results(err, res, nodes){
					nodes.shift(); // removing the first item might not actually or always work but for now...
					var tagsResults = [];

					for(var i=0, j=nodes.length; i<j; i++) {
						var tag = nodes[i][0][0],
							moment = nodes[i][1][0],
							totalMoments = nodes[i][1].length;

						if(tag && tag.self && tag.data && moment.data) {
							var newObj = {
								id: tag.self.split('/').pop(),
								title: tag.data.tag,
								imageUrl: moment.data.imageUrl,
								focusPoint: moment.data.focusPoint,
								totalMoments: totalMoments
							};
							tagsResults.push(newObj);
						}

					}

					tagsResults.reverse();

					callback(undefined, { type: "tags", data: tagsResults });
					endTime = new Date().getTime();
					var timeInfo = 'Tags fetched from DB in: ' + (endTime - startTime) + ' ms';
					logger.info(timeInfo);
				}
			);
		},
		users: function(sortBy, callback){
			// id, node
			var query = "g.v(0).inE('USERS_REFERENCE').outV.inE('MEMBER_OF').outV.hasNot('photo', null).transform{[it, it.in('FOLLOWS').toList()]}";

			var startTime, endTime;
			Step(
				function callGremlin(){
					executeGremlin(query, this);
					startTime = new Date().getTime();
				},
				function results(err, res, nodes){
					var usersResults = formatUsers(nodes);
					// usersResults.reverse();
					callback(undefined, { type:"users", data: usersResults });
					endTime = new Date().getTime();
					var timeInfo = 'Users fetched from DB in: ' + (endTime - startTime) + ' ms';
					logger.info(timeInfo);
				}
			);
		},
		groups: function(sortBy, callback){
			var query = "g.v(0).inE('COLLECTIONS_REFERENCE').outV.inE('GROUPS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{[it, it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList(), it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('CREATED').next(), it.in('FOLLOWS').count() ]}";

			var startTime, endTime;
			Step(
				function callGremlin(){
					executeGremlin(query, this);
					startTime = new Date().getTime();
				},
				function results(err, res, nodes){
					var groupsResults = formatGroups(nodes);
					callback(undefined, { type: "groups", data: groupsResults.reverse() });
					endTime = new Date().getTime();
					var timeInfo = 'Groups fetched from DB in: ' + (endTime - startTime) + ' ms';
					logger.info(timeInfo);
				}
			);
		},
		adventures: function(sortBy, callback){
			// imageUrl, tags, title, id
			var query = "g.v(0).inE('COLLECTIONS_REFERENCE').outV.inE('ADVENTURES_REFERENCE').outV.inE('MEMBER_OF').outV.transform{[ it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('MEMBER_OF').out('TAGGED_IN').toList(), it.in('CREATED').next(), it.adv_moments.toList() ]}.dedup";

			query = _Global.gremlinStep.advMoments + query;

			var startTime, endTime;
			Step(
				function callGremlin(){
					executeGremlin(query, this);
					startTime = new Date().getTime();
				},
				function results(err, res, nodes){
					endTime = new Date().getTime();
					var timeInfo = 'Adventures fetched from DB in: ' + (endTime - startTime) + ' ms';
					logger.info(timeInfo);
					startTime = new Date().getTime();

					var adventuresResults = formatAdventures(nodes);

					console.log("adventures: " + adventuresResults.length);
					// we will regret this later:
					var adventuresByRecent = sortByRecent([{ data: adventuresResults }]).slice(0,40);
					var adventuresByPopular = sortByPopular([{ data: adventuresResults }]).slice(0,40);

					callback(undefined, { type: "adventures", data: { recent: adventuresByRecent, popular: adventuresByPopular } });
					endTime = new Date().getTime();
					timeInfo = 'Adventures formatted & sorted in: ' + (endTime - startTime) + ' ms';
					logger.info(timeInfo);
				}
			);
		},
		moments: function(sortBy, callback){
			var query = "g.v(0).inE('MOMENTS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{ [it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList() ] }";

			var startTime, endTime;

			Step(
				function callGremlin(){
					startTime = new Date().getTime();
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					endTime = new Date().getTime();
					var timeInfo = 'Moments fetched from DB in: ' + (endTime - startTime) + ' ms';
					logger.info(timeInfo);
					startTime = new Date().getTime();

					var momentResults = formatMoments(nodes),
						momentsByRecent, momentsByPopular;

					console.log("moments total: " + momentResults.length);

					// we will regret this later:
					momentsByRecent = sortByRecent([{ type: 'moments', data: momentResults}]).slice(0,200);
					momentsByPopular = sortByPopular([{ type: 'moments', data: momentResults}]).slice(0,200);

					callback(undefined, { type: "moments", data: { recent: momentsByRecent, popular: momentsByPopular } });
					endTime = new Date().getTime();
					timeInfo = 'Moments sorted in: ' + (endTime - startTime) + ' ms';
					logger.info(timeInfo);
				}
			);
		}
	};

	var FilterProfileStream = {
		moments: function(userID, callback){
			var query = "g.v().out('CREATED').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList() ]}".replace('v()','v('+userID+')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var momentResults = formatMoments(nodes);
					var momentsByRecent = sortByRecent([{ data: momentResults }]);
					callback(undefined, { type: "moments", data: momentResults });
				}
			);
		},
		adventures: function(userID, callback){
			var query = "g.v().out('CREATED','MEMBER_OF').out('MEMBER_OF').out('ADVENTURES_REFERENCE').back(2).transform{[ [it], it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('MEMBER_OF').out('TAGGED_IN').toList(), it.in('CREATED').next(), it.adv_moments.toList() ]}.dedup".replace('v()','v('+userID+')');

			query = _Global.gremlinStep.advMoments + _Global.gremlinStep.usersIn + _Global.gremlinStep.likes + _Global.gremlinStep.comments + _Global.gremlinStep.tags + _Global.gremlinStep.creator + query;

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var adventuresResults = formatAdventures(nodes);
					var adventuresByRecent = sortByRecent([{ data: adventuresResults}]);
					callback(undefined, { type: "adventures", data: adventuresByRecent });
				}
			);
		},
		groups: function(userID, callback){
			var query = "g.v("+userID+").out('CREATED','MEMBER_OF').out('MEMBER_OF').out('GROUPS_REFERENCE').back(2).transform{[it, it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList(), it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('CREATED').next(), it.in('FOLLOWS').count() ]}";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var groupsResults = formatGroups(nodes);
					callback(undefined, { type: "groups", data: groupsResults.reverse() });
				}
			);
		}
	};

	return {
		getStream: function(req, res, next){
			var filter = JSON.parse(req.body.data);

			var startTime = new Date().getTime(),
				endTime;

			if (!filter.types) {
				filter.types = ["moments", "groups", "users","tags", "adventures"];
			}

			if (!filter.sortBy) {
				filter.sortBy = 'popular';
			}

			Step(
				function startSearches(){
					var group = this.group();
					filter.types.forEach(function(type){
						if(FilterStream[type]) {
							FilterStream[type](filter.sortBy, group() );
						}
					});
				},
				function sendResults(err, results){
					endTime = new Date().getTime();
					var timeInfo = 'Stream request fulfilled in: ' + (endTime - startTime) + ' ms';
					logger.info(timeInfo);
					res.json({ status: "success", data: results });
				}
			);
		},
		getMeStream: function(req,res,next){
			var filter = JSON.parse(req.body.data),
				userID = req.params.id;

			if (!filter.types) {
				filter.types = ["groups","users","tags","adventures"];
			}

			Step(
				function startSearches(){
					var group = this.group();
					filter.types.forEach(function(type){
						if(FilterMeStream[type]) {
							FilterMeStream[type]( userID, undefined, group() );
						}
					});
				},
				function sendResults(err, results){
					var resultsByRecent = sortByRecent(results);
					res.json({ status: "success", data: [{ type: "moments", data: resultsByRecent }] });
				}
			);
		},
		updateNode: function(req,res,next){
			var node = JSON.parse(req.body.data),
				nodeObj;

			Step(
				function getObject(){
					db.getNodeById(req.params.id, this);
				},
				function updateObjectData(err, result) {
					nodeObj = result;
					objectMerge([result._data.data, node.properties], this);
				},
				function saveNode(err, result) {
					nodeObj._data.data = result;
					nodeObj.save(this);
				},
				function sendResults(err, result) {
					delete nodeObj.data.password;
					res.json({status: "success", data: nodeObj.data });
				}
			);
		},
		updateRelationship: function(req,res,next){
			var node = JSON.parse(req.body.data),
				relObj;

			Step(
				function getObject(){
					db.getRelationshipById(req.params.id, this);
				},
				function updateObjectData(err, result) {
					relObj = result;
					objectMerge([result._data.data, node.properties], this);
				},
				function saveNode(err, result) {
					relObj._data.data = result;
					relObj.save(this);
				},
				function sendResults(err, result) {
					res.json({status: "success", data: relObj._data.data });
				}
			);
		},
		deleteNode: function(req,res,next){
			var nodeID = req.params.id,
				node;

			Step(
				function getNode() {
					db.getNodeById(nodeID, this);
				},
				function setNode(err, result){
					node = result;
					if (err) {
						res.json({ status: 'error', message: "Error: Unable to delete currently." });
					} else {
						node.del(this, true);
					}
				},
				function sendResults() {
					res.json({ status: "success", message: "The node got deleted, yo." });
				}
			);
		},
		deleteRelationship: function(req,res,next) {
			var relID = req.params.id,
				rel;

			Step(
				function getNode() {
					db.getRelationshipById(relID, this);
				},
				function setNode(err, result){
					rel = result;
					if (err) {
						res.json({ status: 'error', message: "Whoops! There was an error performing that action. (Error: Remove Relationship)" });
					} else {
						rel.del(this, true);
					}
				},
				function sendResults() {
					res.json({ status: "success", message: "The node got deleted, yo." });
				}
			);
		},
		search: function(req,res,next){
			var searchFilter = JSON.parse(req.body.data),
				types= searchFilter.types,
				query = searchFilter.query,
				users, tags, adventures;

			console.log(query);

			Step(
				function searchUsers(){
					if(types.users) {
						console.log('search users...');
						SearchModule.searchAll(query, 'username', this);
					} else {
						this(undefined, []);
					}
				},
				function searchTags(err, userResults){
					console.log(err, userResults);
					users = FormatUtil.users( userResults );
					if(types.tags) {
						console.log('search tags...');
						SearchModule.searchAll(query, 'tag', this);
					} else {
						this(undefined, []);
					}
				},
				function searchAdventures(err, tagResults){
					tags = FormatUtil.tags( tagResults );
					if(types.adventures) {
						console.log('search adventures...');
						SearchModule.searchAll(query, 'title', this);
					} else {
						this(undefined, []);
					}
				},
				function sendResults(err, advResults){
					adventures = FormatUtil.adventures( advResults );
					res.json({ status: "success", data: { users: users, tags: tags, adventures: adventures } });
				}
			);
		},
		oldSearch: function(req,res,next) {
			var filter = JSON.parse(req.body.data);

			Step(
				function startSearches(){
					var group = this.group();
					filter.types.forEach(function(type){
						if(SearchModule[type]) {
							SearchModule[type](filter.query, group() );
						}
					});
				},
				function sendResults(err, results){
					if(!err) {
						res.json(results);
					}
				}
			);
		},
		createRelationship: function(req,res,next){
			var relData = JSON.parse(req.body.data),
				fromId = req.params.start,
				relProperties = relData.data || {};

			Step(
				function getNodes(){
					db.getNodeById(fromId, this.parallel() );
					db.getNodeById(relData.end, this.parallel() );
				},
				function createRel(err, fromNode, toNode) {
					fromNode.createRelationshipTo(toNode, relData.type, relProperties, this);
				},
				function sendResults(err, result){
					if(result._data && result._data.self) {
						res.json({ status: 'success', data: result._data.self.split('/').pop() });
					} else {
						res.json({status: 'error', message: 'go away' });
					}
				}
			);
		},
		searchRelationships: function(req,res,next) {
			var relFilter = JSON.parse(req.body.data),
				domain,
				oppositeDir = (relFilter.direction == 'out') ? 'in' : 'out';

			switch(relFilter.type) {
				case "tags":
					domain = "TAGS_REFERENCE";
					break;
				case "moments":
					domain = "MOMENTS_REFERENCE";
					break;
				case "adventures":
					domain = "ADVENTURES_REFERENCE";
					break;
				case "groups":
					domain = "GROUPS_REFERENCE";
					break;
				case "users":
					domain = "USERS_REFERENCE";
					break;
				default:
					domain = '';
			}

			var query;

			if (relFilter.returnRels === true) {
				query = "g.v("+relFilter.start+")."+relFilter.direction+"E('"+relFilter.relType+"').transform{[it, it."+oppositeDir+"V.next()]}";
			} else {
				query = "g.v("+relFilter.start+")." +
					relFilter.direction + "E('"+relFilter.relType+"')" +
					"."+oppositeDir+"V.outE('MEMBER_OF').inV.outE('"+domain+"')" +
					".back(3).dedup"
					;
			}

			var sendResults = function(results) {
				var nodes = [];
				for(var i=0, j=results.length; i<j; i++) {
						newObj = {
							node: results[i].data,
							id: results[i].self.split('/').pop()
						};

						delete newObj.node.password;

						nodes.push(newObj);
					}
				res.json({ status: "success", data: [ { type: relFilter.type, data: nodes } ] });
			};

			var sendResultsWithRels = function(results) {
				var nodes = [];
				for(var i=0, j=results.length; i<j; i++) {
					var newObj = {},
						rel = results[i][0],
						endNode = results[i][1];

					delete endNode.data.password;

					newObj.node = {
						data: endNode.data,
						id: endNode.self.split('/').pop()
					};

					newObj.rel = {
						data: rel.data,
						id: rel.self.split('/').pop()
					};

					nodes.push(newObj);
				}
				res.json({ status: "success", data: nodes.reverse() });
			};

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, response, result){
					if (relFilter.returnRels === true) {
						sendResultsWithRels(result);
					} else {
						sendResults(result);
					}
				}
			);
		},
		getAdventure: function(req, res, next){
			var advID = req.params.id;

			var query = "g.v().in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList() ]}".replace('v()','v('+advID+')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function result(err, response, nodes){
					var adventuresResults = formatMoments(nodes);
					res.json({ status:"success", data: [ { type: "moments", data: adventuresResults } ]});
				}
			);
		},
		getGroup: function(req,res,next){
			var groupID = req.params.id;

			var query = "g.v().out('FOLLOWS').out('MEMBER_OF').out('USERS_REFERENCE','TAGS_REFERENCE').back(2).both('CREATED','TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList() ]}".replace('v()', 'v(' + groupID + ')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, response, nodes){
					// replace('http://10.179.106.202:7474/db/data/node/','');

					var groupResults = formatMoments(nodes);

					res.json({ status:"success", data: [ { type: "moments", data: groupResults } ]});
				}
			);
		},
		getTag: function(req,res,next){
			var tagID = req.params.id;

			var query = "g.v().in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').toList(), it.in('CREATED').next(), it.inE('LIKES').toList() ]}".replace('v()', 'v(' + tagID + ')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, response, nodes){
					var tagResults = formatMoments(nodes);
					res.json({ status:"success", data: [ { type: "moments", data: tagResults } ]});
				}
			);
		},
		getProfile: function(req,res,next){
			var userID = req.params.id;

			var query = "g.v().transform{[ it, it.out('CREATED').out('MEMBER_OF').out('MOMENTS_REFERENCE').count(), it.out('CREATED').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).inE('LIKES').count(), it.outE('FOLLOWS').count(), it.inE('FOLLOWS').count() ]}".replace('v()','v('+userID+')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, response, node){
					if(node[0]) {
						var newObj = {
							node: node[0][0].data,
							moments: node[0][1],
							likes: node[0][2],
							following: node[0][3],
							followers: node[0][4]
						};

						delete newObj.node.password;
						res.json({ status: "success", data: { type: "profile", data: newObj } });
					} else {
						res.json({status: "error", message: "unable to fetch profile" });
					}
				}
			);
		},
		getUserStream: function(req,res,next){
			var userID = req.params.id;

			Step(
				function getUserStreams(){
					FilterProfileStream.moments(userID, this.parallel() );
					FilterProfileStream.adventures(userID, this.parallel() );
					FilterProfileStream.groups(userID, this.parallel() );
				},
				function results(err, moments, adventures, groups) {
					var momentsByRecent = sortByRecent([moments]);
					res.json({ status: "success", data: [{type: "moments", data: momentsByRecent}, adventures, groups] });
				}
			);
		},
		getCollection: function(req,res,next) {

			var collectionID = req.params.id,
				reqBody = JSON.parse(req.body.data),
				collectionType = reqBody.type,
				includeMoments = reqBody.moments,
				collectionNode;

			var defineSteps = _Global.gremlinStep.creator +
				_Global.gremlinStep.memberOf +
				_Global.gremlinStep.followers +
				_Global.gremlinStep.comments +
				_Global.gremlinStep.likes +
				_Global.gremlinStep.tags +
				_Global.gremlinStep.usersIn;

			var script = "g.v(" + collectionID + ")";

			switch (collectionType) {
				case 'adventure' :
					script = script + _Global.gremlinStep.advCollectionScript;
					break;
				case 'user' :
					script = script + _Global.gremlinStep.usrCollectionScript;
					break;
				case 'tag' :
					script = script + _Global.gremlinStep.tagCollectionScript;
					break;
			}

			Step(
				function getCollectionNode(){
					db.getNodeById(collectionID, this);
					// may not need to verify this as the next one should fail just as quick?
				},
				function getCollectionData(err, results){
					collectionNode = results;

					if(includeMoments) {
						switch (collectionType) {
							case 'adventure' :
								defineSteps = defineSteps + _Global.gremlinStep.advMoments;
								script = script.replace(']}', ', it.adv_moments.toList() ]}');
								break;
							case 'user' :
								defineSteps = defineSteps + _Global.gremlinStep.usrMoments;
								script = script.replace(']}', ', it.user_moments.toList() ]}');
								break;
							case 'tag' :
								defineSteps = defineSteps + _Global.gremlinStep.tagMoments;
								script = script.replace(']}', ', it.tag_moments.toList() ]}');
								break;
						}
					}

					// res.json({ status: 'success', data: script });
					executeGremlin(defineSteps + script, this);
				},
				function sendResults(err, response, results) {
					var collection = results[0],
						creator, members, followers, moments, node;

					var collectionObject = {};

					switch (collectionType) {
						case 'adventure' :
							node = FormatUtil.adventureNode(collection[0]);
							collectionObject.date = node.date;
							collectionObject.creator = FormatUtil.user(collection[1]);
							collectionObject.members = FormatUtil.users(collection[2]);
							collectionObject.followers = FormatUtil.users(collection[3]);
							moments = collection[4];
							break;
						case 'user' :
							node = FormatUtil.userNode(collection[0]);
							collectionObject.followers = FormatUtil.users(collection[1]);
							moments = collection[2];
							break;
						case 'tag' :
							node = FormatUtil.tagNode(collection[0]);
							collectionObject.followers = FormatUtil.users(collection[1]);
							moments = collection[2];
							break;
					}

					collectionObject.id = node.id,
					collectionObject.title = node.title;

					if(includeMoments) {
						collectionObject.moments = FormatUtil.moments( moments );
					}

					// console.log(collectionObject.moments);

					// console.log(FormatUtil.graphID( adventure.self ), FormatUtil.graphID( creator.self ), users_in.length, followers.length, moments.length);
					res.json({status: "success", data: collectionObject });
				}
			);
		},
		getFeatureHeader: function(req, res, next) {

			var globlStreamFeatures = [
					{width: 132, height: 91, image: 'http://www.globl.me/images/halloween.jpg', onClick: function () { G.streamManager.openCollection({ type: 'tag', id: 1398, title: 'Halloween'}); } },
					{width: 132, height: 91, image: 'http://www.globl.me/images/vintage.jpg', onClick: function () { showShareWindow(); } },
					{width: 132, height: 91, image: 'http://www.globl.me/images/share.jpg', onClick: function () { showShareWindow(); } },
					{width: 132, height: 91, image: 'http://www.globl.me/images/feedback.jpg', onClick: function () { showEmailDialog(); } }
				],
				meStreamFeatures = [
					{width: 132, height: 91, image: 'http://www.globl.me/images/feedback.jpg', onClick: function () { showEmailDialog(); } },
					{width: 132, height: 91, image: 'http://www.globl.me/images/share.jpg', onClick: function () { showShareWindow(); } }
				],
				registerFeatures = [
					{width: 132, height: 91, image: 'http://www.globl.me/images/halloween.jpg', onClick: function () { G.streamManager.openCollection({ type: 'tag', id: 1398, title: 'Halloween'}); } },
					{width: 132, height: 91, image: 'http://www.globl.me/images/register.jpg', onClick: function () { showRegisterTab(); } },
					{width: 132, height: 91, image: 'http://www.globl.me/images/vintage.jpg', onClick: function () { showRegisterTab(); } },
					{width: 132, height: 91, image: 'http://www.globl.me/images/feedback.jpg', onClick: function () { showEmailDialog(); } }
				];

			res.json({ status: "success", data: { globl: globlStreamFeatures, register: registerFeatures, me: meStreamFeatures } });

		}
	};
};

module.exports = Stream;