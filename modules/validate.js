/**
 * Module dependencies.
 */

var crypto = require('crypto'),
	rc;


var validateAuthorization = function(data, auth){
	var sha256 = crypto.createHash('sha256');

	if(typeof data == 'object') {
		sha256.update(JSON.stringify(data) + '3912b4f3-c9ab-4e2f-9007-424b5b1d5de6');
	} else {
		sha256.update(data + '3912b4f3-c9ab-4e2f-9007-424b5b1d5de6');
	}

	var authConfirm = sha256.digest('hex');

	return (authConfirm === auth);
};

var validateNewAuthorization = function(data, auth){
	var sha256 = crypto.createHash('sha256');

	if(typeof data == 'object') {
		sha256.update(JSON.stringify(data) + 'bf159320-1380-11e2-892e-0800200c9a66');
	} else {
		sha256.update(data + 'bf159320-1380-11e2-892e-0800200c9a66');
	}

	var authConfirm = sha256.digest('hex');

	return (authConfirm === auth);
};

exports.defineRequestAction = function defineRequestAction(req,res,next) {
	if(typeof req.body.data == 'object') {
		req.body.data = JSON.stringify(req.body.data);
	}

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
	// bf159320-1380-11e2-892e-0800200c9a66
	var rc = req.body;
	var isAuthorized = validateAuthorization(rc.data, rc.auth);
	var isNewAuthorized = validateNewAuthorization(rc.data, rc.auth);

	if (isAuthorized || isNewAuthorized) {
		next();
	} else {
		res.end("Unauthorized API access.");
	}
};