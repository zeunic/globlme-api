// util objects & libs
var Neo4j = require('neo4j'),
	Step = require('step'),
	db,
	TagReferenceNode;

var INDEX_NAME = 'tag';

var Tag = function(config) {
	// TODO
	// gracefully set up default config values if none are passed in
	// or throw appropriate errors

	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);

	db.query("START n = node(0) MATCH (n) <-[:TAGS_REFERENCE]- (tag_ref) RETURN tag_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
		} else {
			TagReferenceNode = nodes[0]['tag_ref'];
		}
	});

	return {
		createTag: function(req,res,next){
			var requestData = JSON.parse(req.body.data);
			var tag = db.createNode({ tag: requestData.tag });

			Step(
				function saveTag(){
					tag.save(this);
				},
				function indexTag(){
					tag.index( INDEX_NAME, 'tag', requestData.tag, this.parallel() );
					tag.index( 'fulltext', 'tag', requestData.tag, this.parallel() );
				},
				function relateTagRef(){
					tag.createRelationshipTo( TagReferenceNode, 'MEMBER_OF', {}, this );
				},
				function tagSaveComplete(err){
					if(!err) {
						res.json( { status: "success", data: { id: tag.id } } );
					} else {
						res.json( { status: "error", message: 'Tag not created' } );
					}
				}
			);
		}
	};
};

module.exports = Tag;