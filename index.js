module.exports = Store;

var Q = require('q'),
	uuid = require('uuid'),
	compileSchema = require('./lib/compileSchema'),
	Query = require('rql/query').Query;

function Store(options) {
	options = options || {};

	if (!options.client) {
		throw new ReferenceError('A client must be provided to create a new cayley-perstore');
	}

	if (!(this instanceof Store)) {
		return new Store(options);
	}

	this.client = options.client;
}

Store.prototype = {
	constructor: Store,

	setSchema: function (schema) {
		if (this._compiled) {
			throw new Error('cayley-perstore: schema has already been set');
		}

		this._compiled = compileSchema(schema);
	},

	get: function (id) {
		var store = this,
			query = new Query().eq('id', id),
			mql = store._compiled.mql(query);

		return this.client.query(mql)
		.then(function (result) {
			return result && result.length ? store._compiled.coerce(result[0]) : undefined;
		});
	},

	put: function (object, options) {
		options = options || {};

		var store = this,
			id = 'id' in options ? options.id :
				'id' in object ? object.id :
				uuid.v4(),
			existing = options.overwrite === false ? this.get(id) : null;

		return Q.when(existing).then(function (existing) {
			if (existing) {
				throw new Error('cayley-perstore: tried to overwrite existing object "' + id + '"');
			}

			object.id = id;

			return store.client.write(store._compiled.quads(id, object))
			.then(function () {
				return id;
			});
		});
	},

	delete: function (id) {
		var store = this;

		// cayley needs to know all the quads in order to delete an entire object so we have to query for the whole
		// object first, get the quads based on the object and then delete them.
		return this.get(id)
		.then(function (object) {
			if (!object) {
				return object;
			}

			return store.client.delete(store._compiled.quads(id, object))
			.then(function () {
				return true;
			});
		});
	},

	query: function (query) {
		var store = this,
			mql = store._compiled.mql(query);

		return this.client.query(mql)
		.then(function (results) {
			results = results || [];

			return results.map(function (result) {
				return store._compiled.coerce(result);
			});

			// TODO: use rql/js-array to do sorting (and limit?)
		});
	}
};
