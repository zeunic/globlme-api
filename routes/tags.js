// util objects & libs
var Neo4j = require('neo4j'),
	Step = require('step'),
	db,
	TagReferenceNode;

var Tag = function(config) {
	// TODO
	// gracefully set up default config values if none are passed in
	// or throw appropriate errors

	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);
	console.log(config.databaseUrl + ':' + config.port);

	db.query("START n = node(0) MATCH (n) <-[:TAGS_REFERENCE]- (tag_ref) RETURN tag_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
			console.log('Unable to locate a valid reference node for tags');
			console.log(errors);
		} else {
			TagReferenceNode = nodes[0]['tag_ref'];
			console.log(TagReferenceNode);
		}
	});

	return {
		createTag: function(req,res,next){},
		getTags: function(req,res,next){}
	};
};

module.exports = User;