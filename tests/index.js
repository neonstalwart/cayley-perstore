define(function (require) {
	var test = require('intern!object'),
		assert = require('intern/chai!assert'),
		Store = require('intern/dojo/node!../index'),
		cayleyURL = 'http://localhost:64210',
		Q = require('intern/dojo/node!q'),
		schema = {
			type: 'object',
			properties: {
				id: {
					type: 'string'
				},
				foo: {
					type: 'string'
				},
				num: {
					type: 'number'
				},
				obj: {
					type: 'object',
					properties: {
						key: {
							type: 'string'
						}
					}
				},
				arr: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							str: {
								type: 'string'
							},
							nested: {
								type: 'array',
								items: {
									type: 'string'
								}
							}
						}
					}
				}
			}
		},
		value,
		store;

	test({
		name: 'cayley-perstore Store API',

		beforeEach: function () {
			store = new Store({
				url: cayleyURL
			});

			store.setSchema(schema);

			value = {
				id: '234098-98234-239320',
				foo: 'bar',
				num: '5',
				obj: { key: 'value' },
				arr: [
					{ str: 'str', nested: [ 'foo', 'bar', 'baz' ] },
					{ str: 'str', nested: [ 'foo', 'bar', 'baz' ] },
					{ str: '333', nested: [ 'one', 'two', 'three' ] }
				]
			};
		},

		constructor: {
			'is a function': function () {
				assert.isFunction(Store, 'Store is a function');
			},

			'a url must be provided': function () {
				assert.throws(function () {
					return new Store();
				}, ReferenceError, 'A url must be provided to create a new cayley-perstore');
			},

			'returns Store instances': function () {
				/* jshint newcap:false */
				var store = Store({
						url: cayleyURL
					});

				assert.instanceOf(store, Store, 'store is an instance of cayley-perstore');
			}
		},

		put: {
			'returns a promise': function () {
				var result = store.put(value);

				assert.isFunction(result.then, 'store.put returns a promise');
				return result;
			},

			'inserts new values': function () {
				var key = 'foo';

				value.id = key;

				return store.put(value).then(function () {
					return store.get(key);
				})
				.then(function (actual) {
					assert.deepEqual(actual, value, 'store.put should insert values into the db');
				});
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
			}
		}
	});
});
