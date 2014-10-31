var spawn = require('child_process').spawn,
	Q = require('q');

module.exports = Server;

function Server() {
	// TODO: change the dbpath
	var dbPath = process.env.GOPATH + '/src/github.com/google/cayley/testdata.nq',
		dfd = Q.defer(),
		child = this.child = spawn('cayley', ['http', '--dbpath=' + dbPath, '--logtostderr', '--port=64211' ]);

	child.stdout.on('data', onData);

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

	child.kill.apply(this.child, arguments);

	dfd.promise.fin(function () {
		child.removeAllListeners();
	});

	return dfd.promise;
};
