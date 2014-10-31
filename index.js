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
	}
};
