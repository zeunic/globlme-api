/**
 * Module dependencies.
 */

var crypto = require('crypto'),
	rc;

exports.defineRequestAction = function defineRequestAction(req,res,next) {
	console.log('defineRequestAction:');
	console.log('will define the request action you are trying to perform based on the route and the request data' + '\n');

	console.log(req.route);

	res.end('You have been authorized, now determining your requested action...');

	next();
}

exports.validateRequestData = function validateRequestData(req,res,next) {
	// this data will need flushed out as the API evolves to multiple
	if (req.body.key === "globlme" && req.hasOwnProperty('data') && req.hasOwnProperty('auth') ) {
		console.log('this is hackily valid');
	} else {
		console.log('you probably did not send me what i want');
	}

	rc = req.body;
	console.log('validateRequestData:');
	console.log('will pre-process request data for keys/types required' + '\n');
	next();
}

exports.authorizeRequest = function authorizeRequest(req,res,next){
	// 3912b4f3-c9ab-4e2f-9007-424b5b1d5de6

	var rc = req.body;
	var sha256 = crypto.createHash('sha256');
	sha256.update(rc.data + '3912b4f3-c9ab-4e2f-9007-424b5b1d5de6'); // would normally look up private key
	var something = sha256.digest('hex');

	if (something === rc.auth) {
		console.log('authorized request');
		next();
	} else {
		// res.writeHead(401, {'Content-Type': 'application/json'});
		res.end("Unauthorized API access.");
	}

	console.log('authorizeRequest');
	console.log('will determine if the request made needs auth and if credentials are provided' + '\n');
	// next();
}