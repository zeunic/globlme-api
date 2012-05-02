// Module for route handling Moment Creation

module.exports = function (configOptions){
	return {
		createMoment: function(req,res,next){
			console.log(req.body, req.files);
		}
	}
};