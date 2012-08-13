/**
 * Module dependencies.
 */

var crypto = require('crypto'),
	rc;


var validateAuthorization = function(data, auth){
	var sha256 = crypto.createHash('sha256');
	sha256.update(data + '3912b4f3-c9ab-4e2f-9007-424b5b1d5de6');
	var authConfirm = sha256.digest('hex');

	return (authConfirm === auth);
};

exports.defineRequestAction = function defineRequestAction(req,res,next) {
	// not using this at the moment
	next();
};

exports.validateRequestData = function validateRequestData(req,res,next) {
	// this data will need flushed out as the API evolves to multiple
	if (req.body.key === "globlme" && req.body.data && req.body.auth) {
		next();
	} else {
		// idk...
	}

	rc = req.body;
};

exports.checkAuthorization = function checkAuthorization(data, auth) {
	return validateAuthorization(data, auth);
};

exports.authorizeRequest = function authorizeRequest(req,res,next){
	// 3912b4f3-c9ab-4e2f-9007-424b5b1d5de6
	var rc = req.body;
	var isAuthorized = validateAuthorization(rc.data, rc.auth);

	if (isAuthorized) {
		next();
	} else {
		// res.writeHead(401, {'Content-Type': 'application/json'});
		res.end("Unauthorized API access.");
	}
};