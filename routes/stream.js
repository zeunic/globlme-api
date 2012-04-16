/*
 * Stream.js is used to define functions for retrieving and saving data on the Globl.me Stream.
 * (finish desc later)
 */

 exports.getStream = function getStream(req,res){
	console.log('no id OR relationship was passed');
};

exports.getNodeById = function getNodeById(req,res,next) {
	var id = req.params.id;
	if(id) {
		console.log('should get node: ');
		console.log(req.params);
	} else {
		next();
	}
};

exports.getNodesByRelationship = function getNodesByRelationship(req,res,next) {
	var id = req.params.id,
		relationship = req.params.relationship;
	if(id && relationship) {
		console.log('should get both: ');
		console.log(req.params);
	} else {
		next();
	}
};

exports.updateNode = function updateNode(req,res) {
	console.log('updating...');
	console.log(req.body);
};

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

exports.deleteNode = function deleteNode(req,res) {
	console.log('should delete: ');
	console.log(req.body);
};