/*
 * Stream.js is used to define functions for retrieving and saving data on the Globl.me Stream.
 * (finish desc later)
 */


var Search = require('search.js'),
	SearchRels = require('search-rels.js'),
	Step = require('step'),
	Neo4j = require('neo4j');

var db;

var Stream =  function(config){

	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);
	console.log('Stream Module connected: '+config.databaseUrl + ':' + config.port);

	return {
		getStream: function(req, res, next){},
		getNodeById: function(req,res,next){},
		getNodesByRelationship: function(req,res,next){},
		updateNode: function(req,res,next){},
		deleteNode: function(req,res,next){},
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
			var relData = JSON.parse(req.body.data),
				fromId = req.param.start,
				relProperties = relData.data || {};

			Step(
				function getFromNode(){
					db.getNodeById(fromId, this.parallel() );
					db.getNodeById(relData.end, this.parallel() );
				},
				function createRel(err, fromNode, toNode) {
					fromNode.createRelationshipTo(toNode, relData.type, relProperties, this);
				},
				function sendResults(err, result){
					console.log(result);
					res.json({ status: 'success', data: 'not sure what to put here yet'});
				}
			);
		},
		seachRelationships: function(req,res,next) {
			// { type[string], start[nodeId], direction[in|out], data[properties] }
			var relFilter = JSON.parse(req.body.data);

			var SearchModule = new SearchRels(relFilter.relType, db);

			Step(
				function startSearches(){
					var group = this.group();
					relFilter.types.forEach(function(type){
						if(SearchModule[type]) {
							SearchModule[type]( group() );
						}
					});
				},
				function sendResults(err, results){
					console.log(err);
					console.log(results);
				}
			);


		}
	};
};

module.exports = Stream;