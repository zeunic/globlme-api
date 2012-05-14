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
			console.log(req.body);
			console.log(req.files);

			var newMoment = JSON.parse(req.body.data);

			var momentData = {
				title: newMoment.title,
				date: newMoment.date,
				focusPoint: newMoment.focusPoint
			}, momentNode, momentTags, momentUsers, momentImages;

			// get all tag nodes so you can create relationships to them
			// get all user nodes so you can create relationships to them
			// process images and save to CDN, store URLs
			// once complete create node
			// once saved, create relationships to moment

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
					console.log('storing tags...');
					momentTags = results;
					// console.log(momentTags);
					return 'tags achieved'; // lol?
				},
				function getUsers(){
					console.log('getting users...');
					if(newMoment.users.length) {
						var group = this.group();
						for (var i=0, j=newMoment.users.length; i<j; i++) {
							db.getNodeById( newMoment.users[i].id, group() );
						}
					} else {
						return [];
					}
				},
				function storeUsers(err, results){
					console.log('storing users...');
					momentUsers = results;
					// console.log(momentUsers);
					return 'users achieved'; // lol?
				},
				function processImage(){
					console.log('processing image...');
					console.log(req.files.image.path);
					console.log(req.files.image.type);

					ImagesModule.convertImageToJpg( req.files.image.path, this.parallel() );
					ImagesModule.saveImageSizes( req.files.image.path, this.parallel() );
				},
				function storeImageUrls(err, originalImage, resizedImages){
					var userGuid = "000-30234-FA";

					// momentNode.imageUrl = images;
					resizedImages.splice(0,0,originalImage);
					ImagesModule.storeImagesToCDN(resizedImages, userGuid, this);
				},
				function saveMomentNode(err, results){
					console.log('save moment node...');
					momentData.imageUrl = results[0].replace('.jpg','');
					momentNode = db.createNode(momentData);
					momentNode.save(this);
				},
				function indexNode(){
					// not using indexes for moments currently
					return 'next';
				},
				function relateNode(){
					var group = this.group();

					momentNode.createRelationshipTo( MomentReferenceNode, 'MEMBER_OF', {}, group() );

					if(momentUsers.length) {
						momentUsers.forEach(function(user){
							user.createRelationshipTo(momentNode, 'TAGGED_IN', {}, group() );
						});
					}

					if(momentTags.length) {
						momentTags.forEach(function(tag){
							momentNode.createRelationshipTo(tag, 'TAGGED_IN', {}, group() );
						});
					}
				},
				function sendResults(err, results) {
					console.log(results);
					res.end('I think we just made a baby.');
				}
			);

			// Step(
			// 	function saveNode(){
			// 		momentNode.save(this);
			// 	},
			// 	function relateNode(){

			// 	}
			// );

		}
	};
};


module.exports = Moment;