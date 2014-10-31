define(function (require) {
	var test = require('intern!object'),
		assert = require('intern/chai!assert'),
		Store = require('intern/dojo/node!../index'),
		Server = require('intern/dojo/node!./util/Server'),
		uuid = require('intern/dojo/node!uuid'),
		Q = require('intern/dojo/node!q'),
		Client = require('intern/dojo/node!../lib/Client'),
		cayleyURL = 'http://localhost:64210',
		client = new Client({ url: cayleyURL }),
		schema = {
			type: 'object',
			properties: {
				id: { type: 'string' },
				name: { type: 'string' }
			}
		},
		store = new Store({
			client: client
		}),
		value,
		server;

	store.setSchema(schema);

	test({
		name: 'cayley-perstore Store API',

		beforeEach: function () {
			value = {
				id: '234098-98234-239320',
				name: 'name'
			};

			return new Server().then(function (cayley) {
				server = cayley;
			});
		},

		afterEach: function () {
			return server.kill();
		},

		constructor: {
			'is a function': function () {
				assert.isFunction(Store, 'Store is a function');
			},

			'a client must be provided': function () {
				assert.throws(function () {
					return new Store();
				}, ReferenceError, 'A client must be provided to create a new cayley-perstore');
			},

			'returns Store instances': function () {
				/* jshint newcap:false */
				var store = Store({
						client: client
					});

				assert.instanceOf(store, Store, 'store is an instance of cayley-perstore');
			}
		},

		setSchema: {
			'throws if schema has already been set': function () {
				this.skip('implement setSchema throws when already set');
			}
		},

		put: {
			'returns a promise': function () {
				var result = store.put(value).catch(logError);

				assert.isFunction(result.then, 'store.put returns a promise');
				return result;
			},

			'inserts new values': function () {
				var key = 'foo';

				value.id = key;

				return store.put(value).then(function () {
					return store.get(key);
				}, logError)
				.then(function (actual) {
					assert.deepEqual(actual, value, 'store.put should insert values into the db');
				});
			},

			'resolves to identifier of object': function () {
				var value = {
						name: 'bar'
					};

				return store.put(value).then(function (key) {
					return store.get(key)
					.then(function (actual) {
						assert.strictEqual(actual.id,  key, 'key should be generated when not provided');
						assert.strictEqual(actual.name, value.name, 'store.put should resolve to the key');
					}, logError);
				}, logError);
			},

			options: {
				'overwrite: false fails if value already exists for key': function () {
					var options = {
							overwrite: false
						},
						key = 'alice',
						value = {
							id: key,
							name: 'bar'
						};

					return store.put(value).then(function () {
						return store.put(value, options);
					})
					.then(function () {
						assert.fail('overwrite: false should not overwrite an existing value');
					})
					.catch(function (err) {
						assert.strictEqual(err.message, 'cayley-perstore: tried to overwrite existing object "' + value.id + '"',
							'store should reject attempt to overwrite existing id');
					});
				},

				'can add values in a tight loop': function () {
					var store = new Store({ client: client }),
						schema = {
							type: 'object',
							properties: {
								id: { type: 'string' }
							}
						},
						keys = [],
						numValues = 200,
						options = {
							overwrite: false
						};

					store.setSchema(schema);

					while (numValues--) {
						keys.push(uuid.v4());
					}

					return Q.all(keys.map(function (key) {
						return store.put({
							id: key
						}, options);
					}))
					.then(function (actual) {
						assert.deepEqual(actual, keys, 'parallel adds should be possible');
					}, logError);
				},

				'id indicates key for object': function () {
					var key = 'foo',
						options = {
							id: key
						},
						value = {
							id: 'baz',
							name: 'bar'
						},
						expected = {
							id: key,
							name: 'bar'
						};

					return store.put(value, options).then(function (key) {
						return store.get(key);
					})
					.then(function (actual) {
						assert.deepEqual(actual, expected, 'options.id should specify id of value');
					});
				}
			}
		},

		get: {
			'returns a promise': function () {
				var id = 'alice',
					result = store.get(id);

				assert.isFunction(result.then, 'store.get returns a promise');
				return result;
			},

			'handles non-existent id': function () {
				var id = 'does not exist';

				return store.get(id).then(function (obj) {
					assert.isUndefined(obj, 'non-matching id should return undefined');
				});
			},

			'returns value found at the requested key': function () {
				var key = 'foo',
					value = {
						id: key,
						name: 'bar'
					};

				return store.put(value)
					.then(function (id) {
						return store.get(key);
					})
					.then(function (actual) {
						assert.deepEqual(actual, value, 'store.get should retrieve values stored at key');
					});
			},

			'should always return new objects': function () {
				var key = 'foo',
					value = {
						id: key,
						name: 'bar'
					};

				return store.put(value)
				.then(function () {
					return Q.all([
						store.get(key),
						store.get(key)
					]);
				})
				.then(function (gets) {
					gets.reduce(function (one, another) {
						assert.notEqual(one, another, 'store.get should return new instances');
						return another;
					}, value);
				});
			}
		},

		delete: {
			'should remove an object from the db': function () {
				return this.skip('not implemented');
				var key = 'foo',
					value = {
						id: key,
						name: 'bar'
					};

				return store.put(value)
					.then(function () {
						return store.delete(key);
					})
					.then(function () {
						return store.get(key);
					})
					.then(function (obj) {
						assert.isUndefined(obj, 'delete should remove objects from the db');
					});
			}
		},

		query: {
			'returns a promise for a forEachable stream': function () {
				return this.skip('not implemented');
				var key = data[0].id,
					query = new Query().eq('id', key),
					results = store.query(query);

				assert.isFunction(results.then, 'query results should be a promise');

				return results.then(function (stream) {
					assert.isFunction(stream.forEach, 'results should resolve to a forEachable');
					return stream.forEach(function (item) {
						assert.propertyVal(item, 'id', key, 'items should match query');
					});
				});
			},

			'limits results based on query': function () {
				return this.skip('not implemented');
				var query = new Query().gt('id', 0).limit(2);

				return store.query(query).then(function (stream) {
					var length = 0;
					return stream.forEach(function (item) {
						assert.ok(item.id > 0, 'items should match query');
						length++;
					})
					.then(function () {
						assert.strictEqual(length, 2, 'query limit should be applied');
					});
				});
			},

			'includes a forEach convenience method': function () {
				return this.skip('not implemented');
				var key = data[0].id,
					query = new Query().eq('id', key),
					results = store.query(query),
					count = 0;

				assert.isFunction(results.forEach, 'results should have a forEach convenience method');
				return results.forEach(function (item) {
					assert.propertyVal(item, 'id', key, 'items should match query');
					count++;
				})
				.then(function () {
					assert.strictEqual(count, 1);
				});
			}

			// TODO: sort(?!)
		}
	});

	function logError(err) {
		if (err && err.response) {
			return Q.post(err.response.body, 'read')
			.then(function (body) {
				console.log(err.message);
				console.log(String(body));
				throw err;
			});
		}
		console.log('Error:', err);
		throw err;
	}
});
