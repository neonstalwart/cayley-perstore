define(function (require) {
	var test = require('intern!object'),
		assert = require('intern/chai!assert'),
		toMQL = require('intern/dojo/node!../../lib/toMQL'),
		Query = require('intern/dojo/node!rql/query').Query;

	test({
		name: 'cayley-perstore toMQL',

		beforeEach: function () {
		},

		'is a function': function () {
			assert.isFunction(toMQL, 'toMQL is a function');
		},

		'simple key/value query': function () {
			var query = new Query().eq('foo', 'bar'),
				expected = { foo: 'bar' },
				actual = toMQL(query);

			assert.deepEqual(actual, expected, 'convert key/value query to MQL');
		},

		'special values': {
			'null values (match any)': function () {
				var query = new Query().eq('foo', null),
					expected = { foo: null },
					actual = toMQL(query);

				assert.deepEqual(actual, expected, 'handle null values');
			},

			'array values (match all)': function () {
				var query = new Query().eq('foo', []),
					expected = { foo: [] },
					actual = toMQL(query);

				assert.deepEqual(actual, expected, 'handle array values');
			}
		},

		'nested property paths': function () {
			var query = new Query().eq([ 'name', 'first' ], 'bob').eq([ 'name', 'last' ], 'smith'),
				expected = { name: { first: 'bob', last: 'smith' } },
				actual = toMQL(query);

			assert.deepEqual(actual, expected, 'handle deep property paths');
		}
	});
});
