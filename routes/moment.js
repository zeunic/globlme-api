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
				date: new Date().getTime(),
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
					console.log(newMoment.userid);
					console.log('getting that user...');
					db.getNodeById( newMoment.userid, this);
				},
				function saveMomentOwner(err, result){
					console.log('got the user...');
					console.log(result);
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
				function uploadImagesToCDN(err, result) {
					if(newMoment.photo) {
						console.log('moment owner is...');
						console.log(momentOwner);
						console.log('token is...', newMoment.photo);
						ImagesModule.storeImagesToCDN(newMoment.photo, momentOwner._data.data.guid, this);
					} else {
						return 'no photo given';
					}
				},
				function saveMomentNode(err, results){
					console.log('moment images stored to CDN...');
					if(results.length) {
						momentData.imageUrl = results[results.length-1];
					}
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
					console.log(momentData, "created new moment");
					res.json({ status: 'success', data: momentData });
				}
			);

		}
	};
};


module.exports = Moment;