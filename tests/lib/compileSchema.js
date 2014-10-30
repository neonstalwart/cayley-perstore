define(function (require) {
	var test = require('intern!object'),
		assert = require('intern/chai!assert'),
		sinon = require('intern/dojo/node!sinon'),
		compileSchema = require('intern/dojo/node!../../lib/compileSchema'),
		Query = require('intern/dojo/node!rql/query').Query,
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
						},
						inner: {
							type: 'object',
							properties: {
								nested: {
									type: 'boolean'
								}
							}
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
							},
							even: {
								type: 'boolean'
							}
						}
					}
				}
			}
		},
		value;

	test({
		name: 'cayley-perstore compileSchema',

		beforeEach: function () {
			value = {
				id: '234098-98234-239320',
				foo: 'bar',
				num: 5,
				obj: { key: 'value', inner: { nested: true } },
				arr: [
					{ str: 'str', nested: [ 'foo', 'bar', 'baz' ], even: false },
					{ str: 'str', nested: [ 'foo', 'bar', 'baz' ], even: true },
					{ str: '333', nested: [ 'one', 'two', 'three' ], even: false }
				]
			};
		},

		'is a function': function () {
			assert.isFunction(compileSchema, 'compileSchema is a function');
		},

		'requires an object as a schema': function () {
			var schema = 'not a schema';
			assert.throws(function () {
				compileSchema(schema);
			}, ReferenceError, 'invalid schema');
		},

		'returns an object with quads and mql properties': function () {
			var schema = {
					type: 'object',
					properties: {
						id: {
							type: 'string'
						}
					}
				},
				compiled = compileSchema(schema);

			assert.isFunction(compiled.quads, 'compileSchema has a quads property which is a function');
			assert.isFunction(compiled.mql, 'compileSchema has a mql property which is a function');
		},

		quads: {
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
					compiled = compileSchema(schema),
					quads = compiled.quads(value.id, value);

				assert.lengthOf(quads, 1, 'an object with 1 property should produce 1 quad');
			},

			'complex structure': function () {
				var compiled = compileSchema(schema),
					label = 'label',
					quads = compiled.quads(value.id, value, label),
					cvt1 = testCvt(),
					cvt2 = testCvt(),
					cvt3 = testCvt(),
					cvt4 = testCvt(),
					cvt5 = testCvt(),
					expected = [
						quad(value.id, 'id', value.id, label),
						quad(value.id, 'foo', value.foo, label),
						quad(value.id, 'num', '' + value.num, label),
						quad(value.id, 'obj', cvt1.set, label),
						quad(cvt1.test, 'obj.cvt', value.id, label),
						quad(cvt1.test, 'key', 'value', label),
						quad(cvt1.test, 'inner', cvt2.set, label),
						quad(cvt2.test, 'inner.cvt', cvt1.test, label),
						quad(cvt2.test, 'nested', 'true', label),
						// instance.arr[0]
						quad(value.id, 'arr', cvt3.set, label),
						quad(cvt3.test, 'arr.cvt', value.id, label),
						// instance.arr[0].str
						quad(cvt3.test, 'str', 'str', label),
						// instance.arr[0].nested[i]
						quad(cvt3.test, 'nested', 'foo', label),
						quad(cvt3.test, 'nested', 'bar', label),
						quad(cvt3.test, 'nested', 'baz', label),
						// instance.arr[0].even
						quad(cvt3.test, 'even', 'false', label),
						// instance.arr[1]
						quad(value.id, 'arr', cvt4.set, label),
						quad(cvt4.test, 'arr.cvt', value.id, label),
						// instance.arr[1].str
						quad(cvt4.test, 'str', 'str', label),
						// instance.arr[1].nested[i]
						quad(cvt4.test, 'nested', 'foo', label),
						quad(cvt4.test, 'nested', 'bar', label),
						quad(cvt4.test, 'nested', 'baz', label),
						// instance.arr[1].even
						quad(cvt4.test, 'even', 'true', label),
						// instance.arr[2]
						quad(value.id, 'arr', cvt5.set, label),
						quad(cvt5.test, 'arr.cvt', value.id, label),
						// instance.arr[2].str
						quad(cvt5.test, 'str', '333', label),
						// instance.arr[2].nested[i]
						quad(cvt5.test, 'nested', 'one', label),
						quad(cvt5.test, 'nested', 'two', label),
						quad(cvt5.test, 'nested', 'three', label),
						// instance.arr[2].even
						quad(cvt5.test, 'even', 'false', label)
					];

				assert.lengthOf(quads, expected.length, 'the right number of quads shold be generated');
				// asserting each quad individually provides a better error message when the assertion fails
				quads.forEach(function (quad, i) {
					sinon.assert.match(quad, expected[i], 'quad[' + i + '] should match expectation');
				});
			}
		},

		mql: {
			'simple object': {
				'no constraints': function () {
					var schema = {
							type: 'object',
							properties: {
								id: {
									type: 'string'
								}
							}
						},
						expected = [{ id: null }],
						mql = compileSchema(schema).mql();

					assert.deepEqual(mql, expected, 'mql should match with no constraints');
				},

				'constrained': function () {
					var schema = {
							type: 'object',
							properties: {
								id: {
									type: 'string'
								}
							}
						},
						expected = [{ id: 'foo' }],
						q = new Query().eq('id', 'foo'),
						mql = compileSchema(schema).mql(q);

					assert.deepEqual(mql, expected, 'mql should match with constraints');
				}
			},

			'complex object': function () {
				var expected = [{
						id: 'foo',
						foo: null,
						num: null,
						obj: {
							key: 'bar',
							inner: {
								nested: null
							}
						},
						arr: [{
							str: null,
							nested: [ null ],
							even: null
						}]
					}],
					q = new Query().eq('id', 'foo').eq(['obj', 'key'], 'bar'),
					mql = compileSchema(schema).mql(q);

				assert.deepEqual(mql, expected, 'mql should match complex schemas with constraints');
			}
		},

		coerce: {
			'simple object': function () {
				var schema = {
						type: 'object',
						properties: {
							id: {
								type: 'string'
							},
							num: {
								type: 'number'
							},
							date: {
								type: 'date'
							},
							int: {
								type: 'integer'
							},
							bool: {
								type: 'boolean'
							}
						}
					},
					id = '1234',
					num = 5.4,
					date = new Date(),
					int = 3,
					bool = true,
					expected = {
						id: id,
						num: num,
						date: date,
						int: int,
						bool: bool
					},
					fromGraph = deepToString(expected),
					actual = compileSchema(schema).coerce(fromGraph);

				assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected), 'coerce should coerce values based on schema');
			},

			'complex object': function () {
				var expected = value,
					fromGraph = deepToString(expected),
					actual = compileSchema(schema).coerce(fromGraph);

				assert.strictEqual(JSON.stringify(actual), JSON.stringify(expected), 'coerce should coerce values based on schema');
			}
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
			}, 'cvt setter assertion'),
			test: sinon.match(function (value) {
				return cvt === value;
			}, 'cvt test assertion')
		};
	}

	function deepToString(object) {
		if (object != null) {
			if (typeof object.toJSON === 'function') {
				object = object.toJSON();
			}

			if (typeof object === 'object') {
				if (Array.isArray(object)) {
					return object.map(deepToString);
				}
				return Object.keys(object).reduce(function (value, key) {
					value[ key ] = deepToString(object[ key ]);
					return value;
				}, {});
			}
		}

		return '' + object;
	}
});
