/*
 * Stream.js is used to define functions for retrieving and saving data on the Globl.me Stream.
 * (finish desc later)
 */


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


	var FilterStream = {
		tags: function(filter, callback){
			var REL_AND_DIRECTION = '<-[:TAGGED_IN]-',
				REF_ID = TAGS_REFERENCE.id,
				USER_ID = (filter.id) ? filter.id : '';

				query.join('\n')
					.replace('REL_AND_DIRECTION', REL_AND_DIRECTION)
					.replace('REF_ID', REF_ID)
					.replace('USER_ID', USER_ID);

				console.log(query);
		},
		users: function(filter, callback){
			var REL_AND_DIRECTION = '-[:CREATED]->',
				REF_ID = USERS_REFERENCE.id,
				USER_ID = (filter.id) ? filter.id : '';

				query.join('\n')
					.replace('REL_AND_DIRECTION', REL_AND_DIRECTION)
					.replace('REF_ID', REF_ID)
					.replace('USER_ID', USER_ID);

				console.log(query);
		},
		groups: function(filter, callback){
			var REL_AND_DIRECTION = '-[:FOLLOWS]->',
				REF_ID = GROUPS_REFERENCE.id,
				USER_ID = (filter.id) ? filter.id : '';

				query.join('\n')
					.replace('REL_AND_DIRECTION', REL_AND_DIRECTION)
					.replace('REF_ID', REF_ID)
					.replace('USER_ID', USER_ID);

				console.log(query);
		},
		adventures: function(filter, callback){
			var REL_AND_DIRECTION = '<-[:MEMBER_OF]-',
				REF_ID = GROUPS_REFERENCE.id,
				USER_ID = (filter.id) ? filter.id : '';

				query.join('\n')
					.replace('REL_AND_DIRECTION', REL_AND_DIRECTION)
					.replace('REF_ID', REF_ID)
					.replace('USER_ID', USER_ID);

				console.log(query);
		},
		moments: function(filter, callback){
			var REL_AND_DIRECTION = '-[:TAGGED_IN]->',
				REF_ID = MOMENTS_REFERENCE.id;

				var query = [
					'START n=node(REF_ID)',
					'MATCH (n) <-[:MEMBER_OF]- (moment) -[:TAGGED_IN]-> (tags)',
					'RETURN moment, tags'
				].join('\n')
					.replace('REL_AND_DIRECTION', REL_AND_DIRECTION)
					.replace('REF_ID', REF_ID);

				db.query(query, function(errors, results){
					if(!errors) {
						callback(null, { type: "moments", data: results });
					} else {
						callback('could not retrieve moments from stream');
					}
				});
		}
	};

	return {
		getStream: function(req, res, next){
			var filter = JSON.parse(req.body.data);
			console.log('getting stream!');

			filter.types = ["moments"]; // lol when you don't figure out this needs removed

			Step(
				function startSearches(){
					var group = this.group();
					filter.types.forEach(function(type){
						if(FilterStream[type]) {
							FilterStream[type]( filter, group() );
						}
					});
				},
				function sendResults(err, results){
					console.log('results back: ');
					var resultsFormatted = [];
					for (var i=0, j=results[0].data.length; i<j; i++) {
						var item = results[0].data[i];
						var newResult = {
							id: item.moment.id,
							type: 'moment',
							title: item.moment._data.data.title,
							imageUrl: item.moment._data.data.imageUrl,
							tags: [item.tags._data.data.tag]
						};

						console.log(newResult);

						resultsFormatted.push(newResult);
					}
					res.json(resultsFormatted);
				}
			);

		},
		updateNode: function(req,res,next){},
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
					db.getNodeById(relID, this);
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
			// { type[string], start[nodeId], direction[in|out], data[properties], relType[string] }
			var relFilter = JSON.parse(req.body.data);

			console.log(relFilter);
			console.log(typeof relFilter.types);
			console.log(relFilter.types.length);
			console.log(relFilter.types[0]);
			console.log('/......./');

			var SearchModule = new SearchRels(relFilter.relType, db);

			Step(
				function startSearches(){
					var group = this.group();
					relFilter.types.forEach(function(type){
						if(SearchModule[type]) {
							SearchModule[type]( relFilter.relType, relFilter.direction, relFilter.startID, group() );
						}
					});
				},
				function sendResults(err, results){
					console.log('results back: ');
					console.dir(arguments);
				}
			);
		}
	};
};

module.exports = Stream;