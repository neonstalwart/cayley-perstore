var Q = require('q'),
	http = require('q-io/http'),
	url = require('url');

module.exports = Client;

function Client(options) {
	options = options || {};

	if (!options.url) {
		throw new ReferenceError('A url must be provided to create a new cayley client');
	}

	if (!(this instanceof Client)) {
		return new Client(options);
	}

	this.url = options.url;
}

Client.prototype = {
	constructor: Client,

	write: function (quads) {
		return http.request({
			url: url.resolve(this.url, '/api/v1/write'),
			method: 'POST',
			body: [ JSON.stringify(quads) ]
		})
		.then(checkResponse);
	},

	query: function (mql) {
		return http.request({
			url: url.resolve(this.url, '/api/v1/query/mql'),
			method: 'POST',
			body: [ JSON.stringify(mql) ]
		})
		.then(checkResponse);
	}
};

function checkResponse(response) {
	if (response.status !== 200) {
		var error = new Error('HTTP request failed with code: ' + response.status);
		error.response = response;
		throw error;
	}

	return Q.post(response.body, 'read')
	.then(JSON.parse)
	.then(function (body) {
		if (body.error) {
			var error = new Error('Error response: ' + body.error);
			error.response = body;
			throw error;
		}

		return body.result;
	});
}
