/*
 * Stream.js is used to define functions for retrieving and saving data on the Globl.me Stream.
 * (finish desc later)
 */


var Stream =  function(configOptions){

	return {
		getStream: function(req, res, next){},
		getNodeById: function(req,res,next){},
		getNodesByRelationship: function(req,res,next){},
		updateNode: function(req,res,next){},
		deleteNode: function(req,res,next){},
		search: function(req,res,next){
			var searchFilter = JSON.parse(req.body.data);
			// { types: ['tags','users'], query: STRING }

			var search = {
				tag: function(){
					console.log('search tags');
				},
				user: function(){
					console.log('search users');
				}
			};
			for (var i = -1, j = searchFilter.types.length, type; type = searchFilter.types[++i], i < j;) {
				console.log(type);
				if(search.type) {
					search[type]();
				}
			};

		}
	};
};

module.exports = Stream;

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