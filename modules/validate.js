/**
 * Module dependencies.
 */

var crypto = require('crypto');

exports.defineRequestAction = function defineRequestAction(req,res,next) {
	console.log('defineRequestAction:');
	console.log('will define the request action you are trying to perform based on the route and the request data' + '\n');

	console.log(req.route);

	next();
}

exports.validateRequestData = function validateRequestData(req,res,next) {
	console.log('validateRequestData:');
	console.log('will pre-process request data for keys/types required' + '\n');
	next();
}

exports.authorizeRequest = function authorizeRequest(req,res,next){
	// 3912b4f3-c9ab-4e2f-9007-424b5b1d5de6

	console.log(req.body);
	console.log(req.params);

	var sha256 = crypto.createHash('sha256');

	// sha256.update(req.data);
	sha256.update('3912b4f3-c9ab-4e2f-9007-424b5b1d5de6');
	var something = sha256.digest('hex');
	console.log(something);

	console.log('authorizeRequest');
	console.log('will determine if the request made needs auth and if credentials are provided' + '\n');
	// next();
}