
/**
 * Module dependencies.
 */

var express = require('express'),
  api = module.exports = express.createServer();

// Configuration

api.configure(function(){
  api.set('views', __dirname + '/views');
  api.set('view engine', 'jade');
  api.use(express.bodyParser());
  api.use(express.methodOverride());
  api.use(api.router);
  api.use(express.static(__dirname + '/public'));
});

api.configure('development', function(){
  api.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

api.configure('production', function(){
  api.use(express.errorHandler());
});


// Route Preconditions

function auth(req, res, next) {
  console.log('authorize please');
  console.log(req.headers);
  next();
}

var preconditions = [auth];

// Param Preconditions

function getNodeById(req, res, next, id) {
  console.log(id);
  next();
}

function getKey(req, res, next, key) {
  console.log(key);
  next();
}

// api.param(':id', getNodeById);
// api.param(':key', getKey);

// Routes

api.get('/', function(req, res){
  res.render('index', {
    title: 'Express'
  });
});

api.get('/stream/:id?/:key?', preconditions, function(req, res){
  console.log( req.params.id );
  console.log( req.params.key );
  res.render('index', { title: 'allo' });
});

api.listen(3000);
console.log("Express server listening on port %d in %s mode", api.address().port, api.settings.env);
