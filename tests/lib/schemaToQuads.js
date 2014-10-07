define(function (require) {
	var test = require('intern!object'),
		assert = require('intern/chai!assert'),
		sinon = require('intern/dojo/node!sinon'),
		schemaToQuads = require('intern/dojo/node!../../lib/schemaToQuads'),
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
				arr: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							str: {
								type: 'string'
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
									type: 'string'
								}
							}
						}
					}
				}
			}
		},
		value;

	test({
		name: 'cayley-perstore schemaToQuads',

		beforeEach: function () {
			value = {
				id: '234098-98234-239320',
				foo: 'bar',
				num: 5,
				arr: [
					{ str: 'str', obj: { key: 'value' }, arr: [ 'foo', 'bar', 'baz' ] },
					{ str: 'str', obj: { key: 'value' }, arr: [ 'foo', 'bar', 'baz' ] },
					{ str: '333', obj: { key: 'vvv' }, arr: [ 'one', 'two', 'three' ] }
				]
			};
		},

		'is a function': function () {
			assert.isFunction(schemaToQuads, 'schemaToQuads is a function');
		},

		'requires an object as a schema': function () {
			var schema = 'not a schema';
			assert.throws(function () {
				schemaToQuads(schema);
			}, ReferenceError, 'invalid schema');
		},

		'returns a function to process instances of that schema': function () {
			var schema = {
					type: 'object',
					properties: {
						id: {
							type: 'string'
						}
					}
				},
				toGraph;

			toGraph = schemaToQuads(schema);

			assert.isFunction(toGraph, 'schemaToQuads returns a function');
		},

		'object test': function () {
			var schema = {
					type: 'object',
					properties: {
						id: {
							type: 'string'
						}
					}
				},
				value = { id: 'foo' },
				toGraph,
				quads;

			toGraph = schemaToQuads(schema);
			quads = toGraph(value.id, value);

			assert.lengthOf(quads, 1, 'an object with 1 property should produce 1 quad');
		},

		'complex structure': function () {
			var toGraph = schemaToQuads(schema),
				quads = toGraph(value.id, value),
				cvt1 = testCvt(),
				cvt2 = testCvt(),
				cvt3 = testCvt(),
				cvt4 = testCvt(),
				cvt5 = testCvt(),
				cvt6 = testCvt(),
				expected = [
					quad(value.id, 'id', value.id),
					quad(value.id, 'foo', value.foo),
					quad(value.id, 'num', '' + value.num),
					// instance.arr[0]
					quad(cvt1.set, 'arr.cvt', value.id),
					// instance.arr[0].str
					quad(cvt1.test, 'str', 'str'),
					// instance.arr[0].obj
					quad(cvt2.set, 'obj.cvt', cvt1.test),
					// instance.arr[0].obj.key
					quad(cvt2.test, 'key', 'value'),
					// instance.arr[0].arr[i]
					quad(cvt1.test, 'arr', 'foo'),
					quad(cvt1.test, 'arr', 'bar'),
					quad(cvt1.test, 'arr', 'baz'),
					// instance.arr[1]
					quad(cvt3.set, 'arr.cvt', value.id),
					// instance.arr[1].str
					quad(cvt3.test, 'str', 'str'),
					// instance.arr[1].obj
					quad(cvt4.set, 'obj.cvt', cvt3.test),
					// instance.arr[1].obj.key
					quad(cvt4.test, 'key', 'value'),
					// instance.arr[1].arr[i]
					quad(cvt3.test, 'arr', 'foo'),
					quad(cvt3.test, 'arr', 'bar'),
					quad(cvt3.test, 'arr', 'baz'),
					// instance.arr[2]
					quad(cvt5.set, 'arr.cvt', value.id),
					// instance.arr[2].str
					quad(cvt5.test, 'str', '333'),
					// instance.arr[2].obj
					quad(cvt6.set, 'obj.cvt', cvt5.test),
					// instance.arr[2].obj.key
					quad(cvt6.test, 'key', 'vvv'),
					// instance.arr[2].arr[i]
					quad(cvt5.test, 'arr', 'one'),
					quad(cvt5.test, 'arr', 'two'),
					quad(cvt5.test, 'arr', 'three'),
				];

			assert.ok(sinon.deepEqual(expected, quads), 'value should be serialized to quads');
		}
	});

	function quad(subject, predicate, object, label) {
		var quad_ = {
				subject: subject,
				predicate: predicate,
				object: object
			};

		if (label != null) {
			quad_.label = label;
		}

		return quad_;
	}

	function testCvt() {
		var cvt;

		return {
			set: sinon.match(function (value) {
				if (cvt) {
					return false;
				}
				cvt = value;
				return /^\/cvt\/.+/.test(value);
			}),
			test: sinon.match(function (value) {
				return cvt === value;
			})
		};
	}
});
