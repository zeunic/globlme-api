/*
 * Stream.js is used to define functions for retrieving and saving data on the Globl.me Stream.
 * (finish desc later)
 */


 var Search = require('search.js'),
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
					for (var i = -1, j = searchFilter.types.length, queryType; queryType = searchFilter.types[++i], i < j;) {
						if(SearchModule[queryType]) {
							SearchModule[queryType]( this.parallel() );
						} else {
							console.log('property thingy not working...');
						}
					};
				},
				function sendResults(){
					console.dir(arguments);

					var results = [];

					for (var i=0, j=arguments.length; i<j; i++) {
						results.push(arguments[i]);
					}

					res.json(results);

				}
			);

		}
	};
};

module.exports = Stream;

exports.createNode = function createNode(req,res) {
	console.log('should post: ');

	console.log(req.params);
	console.log(req.body);
	console.log(req.files);

	// cloudfilesClient.setAuth(function(){
	// 	cloudfilesClient.addFile('globl.me', {
	// 		remote: 'userGuid/file_cdn2.png',
	// 		local: 'stream.png'
	// 	}, function(err, uploaded){
	// 		if(err) { console.log(err) }
	// 		else { console.log(uploaded); console.log('now can i get that url back some how?'); }
	// 	});
	// });
};