
var Cloudfiles = require('cloudfiles'),
	Easyimage = require('easyimage');

var config = { auth: { username: 'zeunicllc', apiKey: 'e4e2973174da5aeb4e63fbdd51f39527' } };
var cloudfilesClient = Cloudfiles.createClient(config);
cloudfilesClient.setAuth(function(){
	cloudfilesClient.getContainer('globl.me', true, function(test, container){
		// console.log(container);
	});
});

exports.storeImage = function storeImage(sourcePath) {

};

exports.formatImage = {
	cropSquare: function(originalSourcePath, offSetX, offSetY){
		Easyimage.info(originalSourcePath, function(err,stdout,stderr){
			if(stdout.width > stdout.height) {
				stdout.width = stdout.height;
			} else if (stdout.height > stdout.width) {
				stdout.height = stdout.width;
			}

			Easyimage.thumbnail(
				{
					src:originalSourcePath, dst:originalSourcePath + '_square.jpg',
					width: stdout.width, height: stdout.height,
					x:offSetX, y:offSetY
				},
				function(err, stdout, stderr) {
					if (err) throw err;
					console.log('Thumbnail created');
					console.log(stdout);
				}
			);
		});

	},
	saveImageSizes: function(){
		// Easyimage.rescrop(
		// 	{},
		// 	function(err,stdout, stderr){

		// 	}
		// );
	},
	convertJPG: function(){

	}
};