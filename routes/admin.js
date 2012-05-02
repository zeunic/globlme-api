// admin.js

var Neo4j = require('neo4j'),
	db;

module.exports = function(config){
	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);

	return {
		query: function(req,res,next){
			console.log(req.query.cypherQuery);
			db.query(req.query.cypherQuery, function(error, nodes){
				console.log( nodes );
				res.json( nodes );
			});
		},
		createNode: function(req,res,next){

			console.log(req.query);

			node = db.createNode(req.query.node);
			node.save(function(){
				console.dir(arguments);
			});
			console.log(req.params);
			res.end('what');
		},
		createRel: function(req,res,next){
			console.log(req.query);

		}
	};
};