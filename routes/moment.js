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
			console.log('Unable to locate a valid reference node for moments');
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
			console.log('//////////////////////////');
			console.log(newMoment);
			console.log('//////////////////////////');

			var momentData = {
				title: newMoment.title,
				date: newMoment.date,
				focusPoint: newMoment.focusPoint
			}, momentNode, momentTags, momentUsers, momentImages, momentOwner;

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
				function getMomentOwner(){
					db.getNodeById( newMoment.userid, this);
				},
				function saveMomentOwner(err, result){
					momentOwner = result;
					console.log('owner: ' + momentOwner.id);
					return 'moment owner saved';
				},
				function getUsers(){
					console.log('getting users...');
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
					var userGuid = "000-30234-FA"; // need to get from newMoment.userguid

					// momentNode.imageUrl = images;
					resizedImages.splice(0,0,originalImage);
					ImagesModule.storeImagesToCDN(resizedImages, userGuid, this);
				},
				function saveMomentNode(err, results){
					console.log('save moment node...');
					console.log(results);
					momentData.imageUrl = results[0].replace('.jpg','');
					momentNode = db.createNode(momentData);
					momentNode.save(this);
				},/*
				function indexNode(err, result){
					// not using indexes for moments currently
					console.log('indexes?');
					console.dir(arguments);
					return 'next';
				},*/
				function relateNodeOwner(){
					console.log('owner');
					console.log(momentOwner);
					momentOwner.createRelationshipTo(momentNode, 'CREATED', {}, this );
				},
				function relateNodeMember(err, result){
					console.log('member of');
					console.dir(arguments);
					momentNode.createRelationshipTo( MomentReferenceNode, 'MEMBER_OF', {}, this );
				},
				function relateNodeUsers(){
					var group = this.group();
					if(momentUsers.length) {
						momentUsers.forEach(function(user){
							user.createRelationshipTo(momentNode, 'TAGGED_IN', {}, group() );
						});
					}
				},
				function relateNodeTags(){
					var group = this.group();

					if(momentTags.length) {
						momentTags.forEach(function(tag){
							momentNode.createRelationshipTo(tag, 'TAGGED_IN', {}, group() );
						});
					}
				},
				function sendResults(err, results) {
					// console.log(results);
					console.log(momentNode.id);
					momentData.id = momentNode.id;

					res.json({ status: 'success', data: momentData });
				}
			);

		}
	};
};


module.exports = Moment;