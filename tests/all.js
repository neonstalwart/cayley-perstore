define(function (require) {
	var Q = require('intern/dojo/node!q');

	Q.longStackSupport = true;

	require('./index');
	require('./lib/compileSchema');
	require('./lib/toMQL');
});
