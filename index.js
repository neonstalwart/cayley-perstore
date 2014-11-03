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
			overwrite = options.overwrite !== false;

		return Q.when(this.get(id)).then(function (existing) {
			if (existing && !overwrite) {
				throw new Error('cayley-perstore: tried to overwrite existing object "' + id + '"');
			}

			object.id = id;

			var quads = store._compiled.quads(id, object),
				diff,
				promise;

			if (existing) {
				quads = quads.sort(sortQuads);
				diff = store._compiled.quads(id, existing).sort(sortQuads).reduce(function (diff, existing) {
					var hashExisting = hashQuad(existing),
						hashNew = hashQuad(quads[0]);

					// any new quads need to be added
					while (hashNew < hashExisting) {
						diff.add.push(quads.shift());
						hashNew = hashQuad(quads[0]);
					}

					// any existing quads not in the new object need to be removed
					if (hashExisting < hashNew) {
						diff.remove.push(existing);
					}
					// any equal quads can be ignored
					else {
						quads.shift();
					}

					return diff;
				}, {
					add: [],
					remove: []
				});

				if (diff.remove.length) {
					promise = store.client.delete(diff.remove);
				}

				quads = diff.add.concat(quads);
			}

			return Q.when(promise)
			.then(writeQuads);

			function writeQuads () {
				return store.client.write(quads)
				.then(function () {
					return id;
				});
			}
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

function sortQuads (a, b) {
	return hashQuad(a) > hashQuad(b) ? 1 : -1;
}

function hashQuad(quad) {
	return [ quad.subject, quad.predicate, quad.object, quad.label || '' ].join('\x00');
}
