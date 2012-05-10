/**
 * Module dependencies.
 */

var crypto = require('crypto'),
	rc;

exports.defineRequestAction = function defineRequestAction(req,res,next) {
	console.log(req.route);
	next();
};

exports.validateRequestData = function validateRequestData(req,res,next) {
	// this data will need flushed out as the API evolves to multiple

	console.dir(req.body);
	console.dir(req.files);

	if (req.body.key === "globlme" && req.body.data && req.body.auth) {
		console.log('this is hackily valid');
		next();
	} else {
		console.log('you probably did not send me what i want');
	}

	rc = req.body;
};

exports.authorizeRequest = function authorizeRequest(req,res,next){
	// 3912b4f3-c9ab-4e2f-9007-424b5b1d5de6

	var rc = req.body;
	var sha256 = crypto.createHash('sha256');

	sha256.update(rc.data + '3912b4f3-c9ab-4e2f-9007-424b5b1d5de6');
	var authConfirm = sha256.digest('hex');

	if (authConfirm === rc.auth) {
		console.log('authorized request');
		next();
	} else {
		// res.writeHead(401, {'Content-Type': 'application/json'});
		res.end("Unauthorized API access.");
	}
};