/*
 * Stream.js is used to define functions for retrieving and saving data on the Globl.me Stream.
 * (finish desc later)
 */


var request = require('request');

var gremlinOptions = {
	uri: 'http://10.179.106.202:7474/db/data/ext/GremlinPlugin/graphdb/execute_script',
	method: 'POST',
	json: {}
};

var executeGremlin = function(query, callback) {
	gremlinOptions.json = { script: query };
	request(gremlinOptions, callback);
};

var Search = require('search.js'),
	SearchRels = require('search-rels.js'),
	Step = require('step'),
	Neo4j = require('neo4j');

var db,
	TAGS_REFERENCE,
	USERS_REFERENCE,
	GROUPS_REFERENCE,
	ADVENTURES_REFERENCE,
	MOMENTS_REFERENCE;

var Stream =  function(config){
	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);

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
				moment = nodes[i][2][0];

			if(group && tags && moment) {
				newObj.title = group.data.title;
				newObj.node = group.data;
				newObj.id = group.self.replace('http://10.179.106.202:7474/db/data/node/','');

				newObj.tags = [];

				for (var k=0, l=tags.length; k<l; k++) {
					var el = tags[k];

					var tag = {
						id: el.self.replace('http://10.179.106.202:7474/db/data/node/',''),
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

	var FilterMeStream = {
		tags: function(userID, filter, callback){
			var query = "g.v("+userID+").out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).transform{[ it.in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList() ]}.dedup";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var tagsResults = [];
					for(var i=0, j=nodes.length; i<j; i++) {
						var tag = nodes[i][0][0],
							moment = nodes[i][1][0];

						var newObj = {
							id: tag.self.replace('http://10.179.106.202:7474/db/data/node/',''),
							title: tag.data.tag,
							imageUrl: moment.data.imageUrl,
							focusPoint: moment.data.focusPoint
						};
						tagsResults.push(newObj);
					}

					tagsResults.reverse();

					callback(undefined, { type: "tags", data: tagsResults });
				}
			);
		},
		users: function(userID, filter, callback){
			// id, node
			var query = "g.v("+userID+").out('FOLLOWS').out('MEMBER_OF').out('USERS_REFERENCE').back(2).hasNot('photo', null)";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var usersResults = [];

					for(var i=0, j=nodes.length; i<j; i++) {
						var el = nodes[i];
						var newObj = {
							id: el.self.replace('http://10.179.106.202:7474/db/data/node/',''),
							node: el.data
						};

						delete newObj.node.password;

						usersResults.push(newObj);
					}

					usersResults.reverse();

					callback(undefined, { type:"users", data: usersResults });
				}
			);
		},
		groups: function(userID, filter, callback){
			// imageUrl, tags, title, id

			var query = "g.v("+userID+").out('FOLLOWS').out('MEMBER_OF').out('GROUPS_REFERENCE').back(2).transform{[it, it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList(), it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList() ]}";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var groupsResults = formatGroups(nodes);
					callback(undefined, { type: "groups", data: groupsResults.reverse() });
				}
			);
		},
		adventures: function(filter, callback){
			// imageUrl, tags, title, id
			var query = "g.v(0).inE('COLLECTIONS_REFERENCE').outV.inE('ADVENTURES_REFERENCE').outV.inE('MEMBER_OF').outV.transform{[ it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('MEMBER_OF').out('TAGGED_IN').toList() ]}.dedup";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					nodes.shift(); // fuck me, right?
					var adventuresResults = [];

					for (var i=0, j=nodes.length; i<j; i++) {
						var newObj = {},
							adventure = nodes[i][0][0],
							moment = nodes[i][1][0],
							tags = nodes[i][2];

						newObj.id = adventure.self.replace('http://10.179.106.202:7474/db/data/node/','');
						newObj.imageUrl = moment.data.imageUrl;
						newObj.tags = [];

						for (var k=0, l=tags.length; k<l; k++){
							var tag = {
								id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
								title: tags[k].data.tag
							};

							newObj.tags.push(tag);
						}

						adventuresResults.push(newObj);

					}

					callback(undefined, { type: "adventures", data: adventuresResults });

				}
			);
		},
		moments: function(filter, callback){
			var query = "g.v(0).inE('MOMENTS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{ [it, it.out('TAGGED_IN').toList()] }";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var momentResults = [];

					if (nodes.length) {
						for (var i=0, j=nodes.length; i<j; i++) {
							var newObj = {},
								node = nodes[i][0],
								tags = nodes[i][1];

							var formattedTags =[];

							for(var k=0, l=tags.length; k<l; k++) {
								var tag = {
									id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
									title: tags[k].data.tag
								};
								formattedTags.push(tag);
							}

							newObj.node = node.data;
							newObj.tags = formattedTags;
							newObj.id = nodes[i][0].self.replace('http://10.179.106.202:7474/db/data/node/','');

							momentResults.push(newObj);
						}
					}

					callback(undefined, { type: "moments", data: momentResults.reverse() });

				}
			);
		}
	};

	var FilterStream = {
		tags: function(filter, callback){
			var query = "g.v(0).inE('TAGS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{[ it.in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList() ]}.dedup";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					nodes.shift(); // removing the first item might not actually or always work but for now...
					var tagsResults = [];

					for(var i=0, j=nodes.length; i<j; i++) {
						var tag = nodes[i][0][0],
							moment = nodes[i][1][0];

						if(tag && tag.self && tag.data && moment.data) {
							var newObj = {
								id: tag.self.replace('http://10.179.106.202:7474/db/data/node/',''),
								title: tag.data.tag,
								imageUrl: moment.data.imageUrl,
								focusPoint: moment.data.focusPoint
							};
							tagsResults.push(newObj);
						}

					}

					tagsResults.reverse();

					callback(undefined, { type: "tags", data: tagsResults });
				}
			);
		},
		users: function(filter, callback){
			// id, node
			var query = "g.v(0).inE('USERS_REFERENCE').outV.inE('MEMBER_OF').outV.hasNot('photo', null)";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var usersResults = [];

					for(var i=0, j=nodes.length; i<j; i++) {
						var el = nodes[i];
						var newObj = {
							id: el.self.replace('http://10.179.106.202:7474/db/data/node/',''),
							node: el.data
						};

						delete newObj.node.password;

						usersResults.push(newObj);
					}

					usersResults.reverse();

					callback(undefined, { type:"users", data: usersResults });
				}
			);
		},
		groups: function(filter, callback){
			// imageUrl, tags, title, id

			var query = "g.v(0).inE('COLLECTIONS_REFERENCE').outV.inE('GROUPS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{[it, it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList(), it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList() ]}";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var groupsResults = formatGroups(nodes);
					callback(undefined, { type: "groups", data: groupsResults.reverse() });
				}
			);
		},
		adventures: function(filter, callback){
			// imageUrl, tags, title, id
			var query = "g.v(0).inE('COLLECTIONS_REFERENCE').outV.inE('ADVENTURES_REFERENCE').outV.inE('MEMBER_OF').outV.transform{[ it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('MEMBER_OF').out('TAGGED_IN').toList(), it.in('CREATED') ]}.dedup";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					nodes.shift(); // fuck me, right?
					var adventuresResults = [];

					for (var i=0, j=nodes.length; i<j; i++) {
						var newObj = {},
							adventure = nodes[i][0][0],
							moment = nodes[i][1][0],
							tags = nodes[i][2],
							author = nodes[i][3][0].data;

						if(adventure && moment && tags) {

							delete author.password;

							newObj.id = adventure.self.replace('http://10.179.106.202:7474/db/data/node/','');
							newObj.imageUrl = moment.data.imageUrl;
							newObj.tags = [];
							newObj.node = adventure.data;
							newObj.author = author;

							for (var k=0, l=tags.length; k<l; k++){
								var tag = {
									id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
									title: tags[k].data.tag
								};

								newObj.tags.push(tag);
							}

							adventuresResults.push(newObj);

						}

					}
					adventuresResults.reverse();

					callback(undefined, { type: "adventures", data: adventuresResults });

				}
			);
		},
		moments: function(filter, callback){
			var query = "g.v(0).inE('MOMENTS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{ [it, it.out('TAGGED_IN').toList()] }";

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var momentResults = [];

					if (nodes.length) {
						for (var i=0, j=nodes.length; i<j; i++) {
							var newObj = {},
								node = nodes[i][0],
								tags = nodes[i][1];

							var formattedTags =[];

							for(var k=0, l=tags.length; k<l; k++) {
								var tag = {
									id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
									title: tags[k].data.tag
								};
								formattedTags.push(tag);
							}

							newObj.node = node.data;
							newObj.tags = formattedTags;
							newObj.id = nodes[i][0].self.replace('http://10.179.106.202:7474/db/data/node/','');

							momentResults.push(newObj);
						}
					}

					callback(undefined, { type: "moments", data: momentResults.reverse() });

				}
			);
		}
	};

	var FilterProfileStream = {
		moments: function(userID, callback){
			var query = "g.v().out('CREATED').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[it, it.out('TAGGED_IN').toList()]}".replace('v()','v('+userID+')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					var momentResults = [];

					if (nodes.length) {
						for (var i=0, j=nodes.length; i<j; i++) {
							var newObj = {},
								node = nodes[i][0],
								tags = nodes[i][1];

							var formattedTags =[];

							for(var k=0, l=tags.length; k<l; k++) {
								var tag = {
									id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
									title: tags[k].data.tag
								};
								formattedTags.push(tag);
							}

							newObj.node = node.data;
							newObj.tags = formattedTags;
							newObj.id = nodes[i][0].self.replace('http://10.179.106.202:7474/db/data/node/','');

							momentResults.push(newObj);
						}
					}

					momentResults.reverse();

					callback(undefined, { type: "moments", data: momentResults });

				}
			);
		},
		adventures: function(userID, callback){
			var query = "g.v().out('CREATED','MEMBER_OF').out('MEMBER_OF').out('ADVENTURES_REFERENCE').back(2).transform{[ it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('MEMBER_OF').out('TAGGED_IN').toList() ]}.dedup".replace('v()','v('+userID+')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					// nodes.pop(); // fuck me, right?
					var adventuresResults = [];

					for (var i=0, j=nodes.length; i<j; i++) {
						var newObj = {},
							adventure = nodes[i][0][0],
							moment = nodes[i][1][0],
							tags = nodes[i][2];

						if(adventure && moment && tags) {
							newObj.id = adventure.self.replace('http://10.179.106.202:7474/db/data/node/','');
							newObj.imageUrl = moment.data.imageUrl;
							newObj.tags = [];
							newObj.node = adventure.data;

							for (var k=0, l=tags.length; k<l; k++){
								var tag = {
									id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
									title: tags[k].data.tag
								};

								newObj.tags.push(tag);
							}

							adventuresResults.push(newObj);
						}

					}

					adventuresResults.reverse();

					callback(undefined, { type: "adventures", data: adventuresResults });
				}
			);
		},
		groups: function(userID, callback){
			var query = "g.v("+userID+").out('CREATED','MEMBER_OF').out('MEMBER_OF').out('GROUPS_REFERENCE').back(2).transform{[it, it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList(), it.out('FOLLOWS').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList() ]}";

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

			if (!filter.types) {
				console.log('no types, using full...');
				filter.types = ["moments", "groups", "users","tags", "adventures"];
			}

			Step(
				function startSearches(){
					var group = this.group();
					filter.types.forEach(function(type){
						if(FilterStream[type]) {
							FilterStream[type](undefined, group() );
						}
					});
				},
				function sendResults(err, results){
					res.json({ status: "success", data: results });
				}
			);
		},
		getMeStream: function(req,res,next){
			var filter = JSON.parse(req.body.data),
				userID = req.params.id;

			filter.types = ["users","tags","groups"]; // lol when you don't figure out this needs removed

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
					res.json({ status: "success", data: results });
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
			var nodeID = req.param.id,
				node;

			Step(
				function getNode() {
					db.getNodeById(nodeID, this);
				},
				function setNode(err, result){
					node = result;
					if (err) {
						res.json({ status: 'error', message: err });
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
						res.json({ status: 'error', message: err });
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
			var searchFilter = JSON.parse(req.body.data);
			// { types: ['tags','users'], query: STRING }

			var SearchModule = new Search(searchFilter.query, db);

			Step(
				function startSearches(){
					var group = this.group();
					searchFilter.types.forEach(function(type){
						if(SearchModule[type]) {
							SearchModule[type]( group() );
						}
					});
				},
				function sendResults(err, results){
					console.log(results);
					console.log('search results ^');
					res.json(results);
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
						res.json({ status: 'success', data: result._data.self.replace('http://10.179.106.202:7474/db/data/relationship/','') });
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
							id: results[i].self.replace('http://10.179.106.202:7474/db/data/node/','')
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
						id: endNode.self.replace('http://10.179.106.202:7474/db/data/node/','')
					};

					newObj.rel = {
						data: rel.data,
						id: rel.self.replace('http://10.179.106.202:7474/db/data/relationship/','')
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

			var query = "g.v().in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').toList() ]}".replace('v()','v('+advID+')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function result(err, response, nodes){
					var adventuresResults = [];

					for(var i=0, j=nodes.length; i<j; i++) {
						var newObj = {},
							moment = nodes[i][0],
							tags = nodes[i][1];

						newObj.id = moment.self.replace('http://10.179.106.202:7474/db/data/node/','');
						newObj.node = moment.data;
						newObj.tags = [];

						for(var k=0, l=tags.length; k<l; k++) {
							var tag = {
								id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
								title: tags[k].data.tag
							};

							newObj.tags.push(tag);
						}

						adventuresResults.push(newObj);
					}
					res.json({ status:"success", data: [ { type: "moments", data: adventuresResults } ]});
				}
			);
		},
		getGroup: function(req,res,next){
			var groupID = req.params.id;

			var query = "g.v().out('FOLLOWS').out('MEMBER_OF').out('USERS_REFERENCE','TAGS_REFERENCE').back(2).both('CREATED','TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList() ]}".replace('v()', 'v(' + groupID + ')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, response, nodes){
					// replace('http://10.179.106.202:7474/db/data/node/','');

					var groupResults = [];

					for(var i=0, j=nodes.length; i<j; i++) {
						var newObj = {},
							moment = nodes[i][0],
							tags = nodes[i][1]
							;

						newObj.id = moment.self.replace('http://10.179.106.202:7474/db/data/node/','');
						newObj.node = moment.data;
						newObj.tags = [];

						for(var k=0, l=tags.length; k<l; k++) {
							var tag = {
								id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
								title: tags[k].data.tag
							};

							newObj.tags.push(tag);
						}

						groupResults.push(newObj);
					}

					res.json({ status:"success", data: [ { type: "moments", data: groupResults } ]});
				}
			);
		},
		getTag: function(req,res,next){
			var tagID = req.params.id;

			var query = "g.v().in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList() ]}".replace('v()', 'v(' + tagID + ')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, response, nodes){
					var tagResults = [];

					for(var i=0, j=nodes.length; i<j; i++) {
						var newObj = {},
							moment = nodes[i][0],
							tags = nodes[i][1]
							;

						newObj.id = moment.self.replace('http://10.179.106.202:7474/db/data/node/','');
						newObj.node = moment.data;
						newObj.tags = [];

						for(var k=0, l=tags.length; k<l; k++) {
							var tag = {
								id: tags[k].self.replace('http://10.179.106.202:7474/db/data/node/',''),
								title: tags[k].data.tag
							};

							newObj.tags.push(tag);
						}

						tagResults.push(newObj);
					}
					res.json({ status:"success", data: [ { type: "moments", data: tagResults } ]});
				}
			);
		},
		getProfile: function(req,res,next){
			var userID = req.params.id;

			var query = "g.v().transform{[ it, it.out('CREATED').out('MEMBER_OF').out('MOMENTS_REFERENCE').count(), it.out('CREATED').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).in('LIKES').count(), it.outE('FOLLOWS').count(), it.inE('FOLLOWS').count() ]}".replace('v()','v('+userID+')');

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
					res.json({ status: "success", data: [moments, adventures, groups] });
				}
			);
		}
	};
};

module.exports = Stream;