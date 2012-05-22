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
	console.log('Stream Module connected: '+config.databaseUrl + ':' + config.port);
	/* I don't think we need these since we switched to Gremlin
	db.query("START n = node(0) MATCH (n) <-[:USERS_REFERENCE]- (user_ref) RETURN user_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
			console.log('Unable to locate a valid reference node for users');
			console.log(errors);
		} else {
			USERS_REFERENCE = nodes[0]['user_ref'];
			// console.log(UserReferenceNode);
		}
	});

	db.query("START n = node(0) MATCH (n) <-[:TAGS_REFERENCE]- (tag_ref) RETURN tag_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
			console.log('Unable to locate a valid reference node for tags');
			console.log(errors);
		} else {
			TAGS_REFERENCE = nodes[0]['tag_ref'];
			// console.log(UserReferenceNode);
		}
	});

	db.query("START n = node(0) MATCH (n) <-[:COLLECTIONS_REFERENCE]- () <-[:GROUPS_REFERENCE]- (group_ref) RETURN group_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
			console.log('Unable to locate a valid reference node for groups');
			console.log(errors);
		} else {
			GROUPS_REFERENCE = nodes[0]['group_ref'];
			// console.log(UserReferenceNode);
		}
	});

	db.query("START n = node(0) MATCH (n) <-[:COLLECTIONS_REFERENCE]- () <-[:ADVENTURES_REFERENCE]- (adv_ref) RETURN adv_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
			console.log('Unable to locate a valid reference node for adventures');
			console.log(errors);
		} else {
			ADVENTURES_REFERENCE = nodes[0]['adv_ref'];
			// console.log(UserReferenceNode);
		}
	});

	db.query("START n = node(0) MATCH (n) <-[:MOMENTS_REFERENCE]- (moment_ref) RETURN moment_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
			console.log('Unable to locate a valid reference node for moments');
			console.log(errors);
		} else {
			MOMENTS_REFERENCE = nodes[0]['moment_ref'];
			// console.log(UserReferenceNode);
		}
	});
	*/


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

						var newObj = {
							id: tag.self.replace('http://10.179.106.202:7474/db/data/node/',''),
							title: tag.data.tag,
							imageUrl: moment.data.imageUrl,
							focusPoint: moment.data.focusPoint
						};
						tagsResults.push(newObj);
					}

					callback(undefined, { type: "tags", data: tagsResults });
				}
			);
		},
		users: function(filter, callback){
			// id, node
			var query = "g.v(0).inE('USERS_REFERENCE').outV.inE('MEMBER_OF').outV";

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
					var groupsResults = [];

					for(var i=0, j=nodes.length; i<j; i++) {
						var newObj = {},
							tags = nodes[i][1];

						newObj.title = nodes[i][0].data.title;
						newObj.node = nodes[i][0].data;
						newObj.id = nodes[i][0].self.replace('http://10.179.106.202:7474/db/data/node/','');
						newObj.tags = [];

						for (var k=0, l=tags.length; k<l; k++) {
							var el = tags[k];

							var tag = {
								id: el.self.replace('http://10.179.106.202:7474/db/data/node/',''),
								title: el.data.tag
							};
							newObj.tags.push(tag);
						}

						newObj.imageUrl = nodes[i][2][0].data.imageUrl;
						newObj.focusPoint = nodes[i][2][0].data.focusPoint;
						groupsResults.push(newObj);
					}

					callback(undefined, { type: "groups", data: groupsResults });
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
					// console.log('///////////////////////////////////////// Adventures');
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
			var query = "g.v(0).inE('MOMENTS_REFERENCE').outV.inE('MEMBER_OF').outV.transform{ [it, it.out('TAGGED_IN').toList()] } ";

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

					callback(undefined, { type: "moments", data: momentResults });

				}
			);
		}
	};

	var FilterUserStream = {
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

					callback(undefined, { type: "moments", data: momentResults });

				}
			);
		},
		adventures: function(userID, callback){
			// var query2 = "g.v(0).inE('COLLECTIONS_REFERENCE').outV.inE('ADVENTURES_REFERENCE').outV.inE('MEMBER_OF').outV.transform{[ it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('MEMBER_OF').out('TAGGED_IN').toList() ]}.dedup";

			var query = "g.v().out('CREATED','MEMBER_OF').out('MEMBER_OF').out('ADVENTURES_REFERENCE').back(2).transform{[ it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(3).toList(), it.in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).toList(), it.in('MEMBER_OF').out('TAGGED_IN').toList() ]}.dedup".replace('v()','v('+userID+')');

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function results(err, res, nodes){
					// console.log('///////////////////////////////////////// Adventures');
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
		groups: function(userID, callback){
		}
	};

	return {
		getStream: function(req, res, next){
			var filter = JSON.parse(req.body.data);
			filter.types = ["moments", "groups", "users","tags", "adventures"]; // lol when you don't figure out this needs removed

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
					// console.log('results back');
					// console.dir(results);
					console.log('stream fetch done');
					res.json({ status: "success", data: results });
				}
			);
		},
		updateNode: function(req,res,next){
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
					console.dir(arguments);
					res.json({ status: "success", message: "The node got deleted, yo." });
				}
			);
		},
		deleteRelationship: function(req,res,next) {
			var relID = req.param.id,
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
					console.dir(arguments);
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
					res.json(results);
				}
			);
		},
		createRelationship: function(req,res,next){
			console.log('create rel');
			var relData = JSON.parse(req.body.data),
				fromId = req.params.start,
				relProperties = relData.data || {};

			console.log('request param: ' + fromId);

			console.log(relData);

			Step(
				function getNodes(){
					db.getNodeById(fromId, this.parallel() );
					db.getNodeById(relData.end, this.parallel() );
				},
				function createRel(err, fromNode, toNode) {
					console.dir(arguments);
					fromNode.createRelationshipTo(toNode, relData.type, relProperties, this);
				},
				function sendResults(err, result){
					console.log(result);
					res.json({ status: 'success', data: 'not sure what to put here yet, do you want the rel id?'});
				}
			);
		},
		editRelationship: function(req,res,next){
			var rel = JSON.parse(req.body.data),
				id = req.params.id;

			var relNode;

			Step(
				function getNode(){
					db.getRelationshipById(id, this);
				},
				function updateRel(err, result) {
					if(err) {
						res.json({ status: "error", message: err });
					}

					console.log(result._data.data);

					for (var prop in rel.data) {  // MIGHT be .data.data
						result[prop] = rel.data[prop];
					}

					console.log(result._data.data);

					relNode = result;
					relNode.save(this);

				},
				function sendSavedResults(err, res){
					console.log(relNode);
					res.json({ status: "success", data: {
						id: relNode.id,
						edit: "url",
						data: relNode._data.data
					} });
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

			var query = "g.v("+relFilter.start+")." +
				relFilter.direction + "E('"+relFilter.relType+"')" +
				"."+oppositeDir+"V.outE('MEMBER_OF').inV.outE('"+domain+"')" +
				".back(3)"
				;

			Step(
				function callGremlin(){
					executeGremlin(query, this);
				},
				function sendResults(err, response, results){
					var nodes = [];
					for(var i=0, j=results.length; i<j; i++) {
						newObj = {
							node: results[i].data,
							id: results[i].self.replace('http://10.179.106.202:7474/db/data/node/','')
						};

						nodes.push(newObj);
					}
					res.json({ status: "success", data: [ { type: relFilter.type, data: nodes } ] });
				}
			);
		},
		getAdventure: function(req, res, next){
			var advID = req.params.id;

			console.log(req.body);

			var query = "g.v().in('MEMBER_OF').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').toList() ]}".replace('v()','v('+advID+')');

			console.log(query);

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

			console.log(req.body);

			var query = "g.v().out('FOLLOWS').out('MEMBER_OF').out('USERS_REFERENCE','TAGS_REFERENCE').back(2).both('CREATED','TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList() ]}".replace('v()', 'v(' + groupID + ')');

			console.log(query);

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

			console.log(req.body);

			var query = "g.v().in('TAGGED_IN').out('MEMBER_OF').out('MOMENTS_REFERENCE').back(2).transform{[ it, it.out('TAGGED_IN').out('MEMBER_OF').out('TAGS_REFERENCE').back(2).toList() ]}".replace('v()', 'v(' + tagID + ')');

			console.log(query);

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
					console.log(node);
					var newObj = {
						node: node[0][0].data,
						moments: node[0][1],
						likes: node[0][2],
						following: node[0][3],
						followers: node[0][4]
					};

					delete newObj.node.password;

					res.json({ status: "success", data: { type: "profile", data: newObj } });
				}
			);
		},
		getUserStream: function(req,res,next){
			var userID = req.params.id;

			Step(
				function getUserStreams(){
					FilterUserStream.moments(userID, this.parallel() );
					FilterUserStream.adventures(userID, this.parallel() );
				},
				function results(err, moments, adventures) {
					console.log('user stream: ');
					res.json({ status: "success", data: [moments, adventures] });
				}
			);
		}
	};
};

module.exports = Stream;