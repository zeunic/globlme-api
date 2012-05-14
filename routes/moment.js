// Module for route handling Moment Creation

var Neo4j = require('neo4j'),
	Step = require('step'),
	Images = require('image');

var MomentReferenceNode, ImagesModule;

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

	ImagesModule = new Images();

	return {
		createMoment: function(req,res,next){
			console.log(req.body, req.files);

			// process images and save to CDN, store URLs
			// once complete create node
			// once saved, create relationships to moment

			var momentNode = db.createNode();

			Step(
				function saveNode(){
					momentNode.save(this);
				},
				function relateNode(){

				}
			);

		}
	};
};


module.exports = Moment;