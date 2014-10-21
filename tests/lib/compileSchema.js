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
		name: 'cayley-perstore compileSchema',

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
			assert.isFunction(compileSchema, 'compileSchema is a function');
		},

		'requires an object as a schema': function () {
			var schema = 'not a schema';
			assert.throws(function () {
				compileSchema(schema);
			}, ReferenceError, 'invalid schema');
		},

		'returns an object with toGraph and fromGraph properties': function () {
			var schema = {
					type: 'object',
					properties: {
						id: {
							type: 'string'
						}
					}
				},
				compiled;

			compiled = compileSchema(schema);

			assert.isFunction(compiled.toGraph, 'compileSchema has a toGraph property which is a function');
			assert.isFunction(compiled.fromGraph, 'compileSchema has a fromGraph property which is a function');
		},

		toGraph: {
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

				toGraph = compileSchema(schema).toGraph;
				quads = toGraph(value.id, value);

				assert.lengthOf(quads, 1, 'an object with 1 property should produce 1 quad');
			},

			'complex structure': function () {
				var toGraph = compileSchema(schema).toGraph,
					label = 'label',
					quads = toGraph(value.id, value, label),
					cvt1 = testCvt(),
					cvt2 = testCvt(),
					cvt3 = testCvt(),
					cvt4 = testCvt(),
					cvt5 = testCvt(),
					cvt6 = testCvt(),
					expected = [
						quad(value.id, 'id', value.id, label),
						quad(value.id, 'foo', value.foo, label),
						quad(value.id, 'num', '' + value.num, label),
						// instance.arr[0]
						quad(cvt1.set, 'arr.cvt', value.id, label),
						// instance.arr[0].str
						quad(cvt1.test, 'str', 'str', label),
						// instance.arr[0].obj
						quad(cvt2.set, 'obj.cvt', cvt1.test, label),
						// instance.arr[0].obj.key
						quad(cvt2.test, 'key', 'value', label),
						// instance.arr[0].arr[i]
						quad(cvt1.test, 'arr', 'foo', label),
						quad(cvt1.test, 'arr', 'bar', label),
						quad(cvt1.test, 'arr', 'baz', label),
						// instance.arr[1]
						quad(cvt3.set, 'arr.cvt', value.id, label),
						// instance.arr[1].str
						quad(cvt3.test, 'str', 'str', label),
						// instance.arr[1].obj
						quad(cvt4.set, 'obj.cvt', cvt3.test, label),
						// instance.arr[1].obj.key
						quad(cvt4.test, 'key', 'value', label),
						// instance.arr[1].arr[i]
						quad(cvt3.test, 'arr', 'foo', label),
						quad(cvt3.test, 'arr', 'bar', label),
						quad(cvt3.test, 'arr', 'baz', label),
						// instance.arr[2]
						quad(cvt5.set, 'arr.cvt', value.id, label),
						// instance.arr[2].str
						quad(cvt5.test, 'str', '333', label),
						// instance.arr[2].obj
						quad(cvt6.set, 'obj.cvt', cvt5.test, label),
						// instance.arr[2].obj.key
						quad(cvt6.test, 'key', 'vvv', label),
						// instance.arr[2].arr[i]
						quad(cvt5.test, 'arr', 'one', label),
						quad(cvt5.test, 'arr', 'two', label),
						quad(cvt5.test, 'arr', 'three', label),
					];

				assert.lengthOf(quads, expected.length, 'the right number of quads shold be generated');
				// asserting each quad individually provides a better error message when the assertion fails
				quads.forEach(function (quad, i) {
					sinon.assert.match(quad, expected[i], 'quad[' + i + '] should match expectation');
				});
			}
		},

		fromGraph: {
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
						mql = compileSchema(schema).fromGraph();

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
						mql;

					mql = compileSchema(schema).fromGraph(q);

					assert.deepEqual(mql, expected, 'mql should match with constraints');
				}
			},

			'complex object': function () {
				return this.skip();
				var schema = {
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
					};
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
});
