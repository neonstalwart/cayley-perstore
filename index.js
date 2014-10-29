module.exports = Store;

var Q = require('q'),
	uuid = require('uuid'),
	compileSchema = require('./lib/compileSchema'),
	http = require('q-io/http'),
	url = require('url'),
	Query = require('rql/query').Query;

function Store(options) {
	options = options || {};

	if (!options.url) {
		throw new ReferenceError('A url must be provided to create a new cayley-perstore');
	}

	if (!(this instanceof Store)) {
		return new Store(options);
	}

	this.url = options.url;
}

Store.prototype = {
	constructor: Store,

	setSchema: function (schema) {
		this._compiled = compileSchema(schema);
	},

	get: function (id) {
		var store = this,
			query = new Query().eq('id', id),
			mql = store._compiled.mql(query);

		return http.request({
			url: url.resolve(store.url, '/api/v1/query/mql'),
			method: 'POST',
			body: [ JSON.stringify(mql) ]
		})
		.then(function (response) {
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

				var result = body && body.result,
					item = result && result.length ? result[0] : undefined;

				return item;
			});
		});
	},

	put: function (object, options) {
		options = options || {};

		var store = this,
			id = 'id' in object ? object.id :
				'id' in options ? options.id :
				uuid.v4(),
			existing = options.overwrite === false ? this.get(id) : null;

		return Q.when(existing).then(function (existing) {
			if (existing) {
				throw new Error('cayley-perstore: tried to overwrite existing object "' + object.id + '"');
			}

			var quads = store._compiled.quads(id, object);

			// TODO: should this be in a client module?
			return http.request({
				url: url.resolve(store.url, '/api/v1/write'),
				method: 'POST',
				body: [ JSON.stringify(quads) ]
			})
			.then(function (response) {
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

					return id;
				});
			});
		});
	}
};
