// Module for route handling Moment Creation

var Neo4j = require('neo4j'),
	Step = require('step'),
	Images = require('image');

var MomentReferenceNode, ImagesModule;

var Moment = function(config){

	db = new Neo4j.GraphDatabase(config.databaseUrl + ':' + config.port);

	db.query("START n = node(0) MATCH (n) <-[:MOMENTS_REFERENCE]- (moment_ref) RETURN moment_ref", function(errors, nodes) {
		if (errors) {
			// TODO: throw errors
		} else {
			MomentReferenceNode = nodes[0]['moment_ref'];
		}
	});

	ImagesModule = new Images();

	return {
		createMoment: function(req,res,next){
			var newMoment = JSON.parse(req.body.data);

			var momentData = {
				date: newMoment.date,
				focusPoint: newMoment.focusPoint
			}, momentNode, momentTags, momentUsers, momentImages, momentOwner,
				momentOriginalImage;

			if(newMoment.title) {
				momentData.title = newMoment.title;
			}

			Step(
				function getTags(){
					if(newMoment.tags.length) {
						var group = this.group();
						for (var i=0, j=newMoment.tags.length; i<j; i++) {
							db.getNodeById( newMoment.tags[i].id, group() );
						}
					} else {
						return [];
					}
				},
				function storeTags(err, results){
					momentTags = results;
					return 'tags achieved'; // lol?
				},
				function getMomentOwner(){
					db.getNodeById( newMoment.userid, this);
				},
				function saveMomentOwner(err, result){
					momentOwner = result;
					return 'moment owner saved';
				},
				function getUsers(){
					var group = this.group();

					if(newMoment.users.length) {
						for (var i=0, j=newMoment.users.length; i<j; i++) {
							db.getNodeById( newMoment.users[i].id, group() );
						}
					} else {
						return [];
					}
				},
				function storeUsers(err, results){
					momentUsers = results;
					return 'users achieved'; // lol?
				},
				function processImageToJpg(){
					ImagesModule.convertImageToJpg( req.files.image.path, this );
				},
				function processImageSizes(err, originalImage){
					momentOriginalImage = originalImage;
					ImagesModule.saveImageSizes( req.files.image.path, this );
				},
				function storeImageUrls(err, resizedImages){
					var userGuid = newMoment.userguid;
					resizedImages.splice(0,0,momentOriginalImage);
					ImagesModule.storeImagesToCDN(resizedImages, userGuid, this);
				},
				function saveMomentNode(err, results){
					console.log('images stored to CDN...');
					momentData.imageUrl = results[0].replace('.jpg','');
					momentNode = db.createNode(momentData);
					momentNode.save(this);
				},
				function relateNodeOwner(){
					momentOwner.createRelationshipTo(momentNode, 'CREATED', {}, this );
				},
				function relateNodeMember(err, result){
					momentNode.createRelationshipTo( MomentReferenceNode, 'MEMBER_OF', {}, this );
				},
				function relateNodeUsers(){
					if(momentUsers.length) {
						var group = this.group();
						momentUsers.forEach(function(user){
							user.createRelationshipTo(momentNode, 'TAGGED_IN', {}, group() );
						});
					} else {
						return 'this';
					}
				},
				function relateNodeTags(){
					if(momentTags.length) {
						var group = this.group();
						momentTags.forEach(function(tag){
							momentNode.createRelationshipTo(tag, 'TAGGED_IN', {}, group() );
						});
					} else {
						return 'i dont know';
					}
				},
				function getNodeAdventure(){
					if(newMoment.adventureId) {
						db.getNodeById(newMoment.adventureId, this);
					} else {
						return 'i dont know';
					}
				},
				function relateNodeAdventure(err, result){
					if(result) {
						momentNode.createRelationshipTo(result, 'MEMBER_OF', {}, this);
					} else {
						return 'i dont know';
					}
				},
				function sendResults(err, results) {
					momentData.id = momentNode.id;

					res.json({ status: 'success', data: momentData });
				}
			);

		}
	};
};


module.exports = Moment;