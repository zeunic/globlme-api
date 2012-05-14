// Module for route handling Moment Creation

var Neo4j = require('neo4j'),
	Step = require('step');

var MomentReferenceNode;

var Moment = function(config){

	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);
	console.log('Moment Module connected: '+config.databaseUrl + ':' + config.port);

	db.query("START n = node(0) MATCH (n) <-[:MOMENTS_REFERENCE]- (moment_ref) RETURN moment_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
			console.log('Unable to locate a valid reference node for users');
			console.log(errors);
		} else {
			MomentReferenceNode = nodes[0]['moment_ref'];
			// console.log(MomentReferenceNode);
		}
	});

	return {
		createMoment: function(req,res,next){
			console.log(req.body, req.files);
		}
	};
};


module.exports = Moment;