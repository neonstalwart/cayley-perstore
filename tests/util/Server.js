var spawn = require('child_process').spawn,
	Q = require('q');

module.exports = Server;

function Server(options) {
	options = options || {};

	var dfd = Q.defer(),
		args = Object.keys(options).reduce(function (args, key) {
			var value = options[ key ];

			key = '--' + key;

			// boleans just need a flag
			if (value === true) {
				args.push(key);
			}
			// ignore false values but allow values like empty strings
			else if (value !== false) {
				args.push(key + '=' + value);
			}

			return args;
		}, [ 'http' ]),
		child = this.child = spawn('cayley', args);

	child.stdout.on('data', onData);

	if (options.logtostderr) {
		child.stderr.on('data', function (data) {
			console.log(String(data));
		});
	}

	dfd.promise.then(function () {
		child.stdout.removeListener('data', onData);
	});

	return dfd.promise;

	function onData(data) {
		if (/^Cayley now listening on/.test(data)) {
			dfd.resolve(child);
		}
	}
}

Server.prototype.kill = function () {
	var dfd = Q.defer(),
		child = this.child;

	child.once('exit', function () {
		dfd.resolve();
	});
	child.once('error', function () {
		dfd.reject();
	});

	child.kill.apply(child, arguments);

	dfd.promise.fin(function () {
		child.removeAllListeners();
	});

	return dfd.promise;
};
