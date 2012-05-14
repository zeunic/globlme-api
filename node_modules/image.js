// var Image = require('./modules/image');
// var imageModule = new Image()

module.exports = function(configOptions){
	console.log('initialize new Image Class');

	// local dependancies?
	var Cloudfiles = require('cloudfiles'),
		Easyimage = require('easyimage'),
		Step = require('step');

	var config = { auth: { username: 'zeunicllc', apiKey: 'e4e2973174da5aeb4e63fbdd51f39527' } };
	var cloudfilesClient = Cloudfiles.createClient(config);
	cloudfilesClient.setAuth(function(){
		cloudfilesClient.getContainer('globl.me', true, function(test, container){
			console.log('connected to CDN container successfully');
		});
	});

	// private functions
	var storeImage = function storeImage(sourcePath) {

	};

	return {
		convertImageToJpg: function(originalSourcePath, callback) {
			Step(
				function(){
					Easyimage.info(originalSourcePath, this);
				},
				function(err, imageInfo, errInfo){
					if(imageInfo.type == 'JPEG'){
						console.log('already a jpg, so firing the callback');
						return callback(null,imageInfo,null);
					} else {
						Easyimage.convert({
							src: originalSourcePath,
							dst: originalSourcePath +'.jpg',
							quality: 80
						}, callback);
					}
				}
			);
		},
		cropSquare: function(imageInfo, offSetX, offSetY, callback){
			if(imageInfo.width > imageInfo.height) {
				imageInfo.width = imageInfo.height;
			} else if (imageInfo.height > imageInfo.width) {
				imageInfo.height = imageInfo.width;
			}

			console.log('is this even running?');

			Easyimage.thumbnail(
				{
					src: imageInfo.name, dst:originalSourcePath + '_square.jpg',
					width: imageInfo.width, height: imageInfo.height,
					x:offSetX, y:offSetY
				},
				function(err, stdout, stderr) {
					if (err) throw err;
					console.log('easy image info from thumb: ');
					console.dir(arguments);
					return callback(arguments);
				}
			);
		},
		saveImageSizes: function(originalSourcePath){
			console.log('run after the crop returned?');
			Easyimage.resize({
				src: originalSourcePath,
				dst: '800.jpg',
				width: 800
			}, function(err, stdout, stderr){
				if(!err) {
					console.log(stdout);
				}
			});
			// add others
		}
	};
};