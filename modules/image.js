
var Cloudfiles = require('cloudfiles'),
	Easyimage = require('easyimage'),
	Step = require('step');

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
	convertImageToJpg: function(originalSourcePath, callback) {
		Step(
			function(){
				Easyimage.convert({
					src: originalSourcePath,
					dst: originalSourcePath +'.jpg',
					quality: 80
				}, this);
			},
			function(){
				console.log('getting info...');
				Easyimage.info(originalSourcePath +'.jpg', function(err, imageInfo, errInfo){
					return callback(err, errInfo, imageInfo, originalSourcePath);
				});
			}
		);
	},
	cropSquare: function(imageInfo, originalSourcePath, offSetX, offSetY, callback){
		if(imageInfo.width > imageInfo.height) {
			imageInfo.width = imageInfo.height;
		} else if (imageInfo.height > imageInfo.width) {
			imageInfo.height = imageInfo.width;
		}

		Easyimage.thumbnail(
			{
				src: imageInfo.name, dst:originalSourcePath + '_square.jpg',
				width: imageInfo.width, height: imageInfo.height,
				x:offSetX, y:offSetY
			},
			function(err, stdout, stderr) {
				if (err) throw err;
				console.log('easy image info from thumb: ');
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
		Easyimage.resize({
			src: originalSourcePath,
			dst: '640.jpg',
			width: 640
		}, function(err, stdout, stderr){
			if(!err) {
				console.log(stdout);
			}
		});
		Easyimage.resize({
			src: originalSourcePath,
			dst: '480.jpg',
			width: 480
		}, function(err, stdout, stderr){
			if(!err) {
				console.log(stdout);
			}
		});
		Easyimage.resize({
			src: originalSourcePath,
			dst: '320.jpg',
			width: 320
		}, function(err, stdout, stderr){
			if(!err) {
				console.log(stdout);
			}
		});
		Easyimage.resize({
			src: originalSourcePath,
			dst: '200.jpg',
			width: 200
		}, function(err, stdout, stderr){
			if(!err) {
				console.log(stdout);
			}
		});
		Easyimage.resize({
			src: originalSourcePath,
			dst: '80.jpg',
			width: 80
		}, function(err, stdout, stderr){
			if(!err) {
				console.log(stdout);
			}
		});
	}
};