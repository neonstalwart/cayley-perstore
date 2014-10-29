module.exports = compileSchema;

var uuid = require('uuid'),
	toMQL = require('./toMQL');

function compileSchema(schema) {
	var compiled = compilePredicate(schema);
	return {
		quads: compiled.quads,
		mql: function schemaMql(rql) {
			return compiled.mql(toMQL(rql));
		}
	};
}

function compilePredicate(schema, predicate, key) {
	var compiledType;

	if (typeof schema !== 'object') {
		throw new ReferenceError('invalid schema');
	}

	predicate = key || predicate || '';

	// TODO: support schema.extends

	compiledType = compileType(schema, predicate);

	return {
		quads: function predicateQuads(subject, object, label) {
			if (key) {
				object = object[ key ];
			}

			return compiledType.quads(subject, object, label);
		},
		mql: function predicateMql(q, mql) {
			mql = mql || {};
			q = q || {};

			var result = compiledType.mql(q, mql);

			if (key) {
				return result;
			}

			if (predicate) {
				result = result[ predicate ];
			}

			return [ result ];
		}
	};


}

function compileType(schema, predicate) {
	var type = schema.type,
		compiledItem;

	switch (type) {
		case 'array':
			compiledItem = compilePredicate(schema.items, predicate);
			return {
				quads: function arrayQuads(subject, array, label) {
					return array.reduce(function (quads, item) {
						return quads.concat(compiledItem.quads(subject, item, label));
					}, []);
				},
				mql: function arrayMql(q, mql) {
					mql[ predicate ] = compiledItem.mql(q[ predicate ]);
					return mql;
				}
			};
		case 'string':
		case 'date':
			return {
				quads: function stringQuad(subject, object, label) {
					return [ quad(subject, predicate, object, label) ];
				},
				mql: function stringMql(q, mql) {
					mql[ predicate ] = predicate in q ? q[ predicate ] : null;
					return mql;
				}
			};
		case 'number':
		case 'integer':
		case 'boolean':
			return {
				quads: function toStringQuad(subject, object, label) {
					return [ quad(subject, predicate, '' + object, label) ];
				},
				// it's up to the consumer to coerce these values after the query
				mql: function toStringMql(q, mql) {
					var query = predicate in q ? q[ predicate ] : null;
					mql[ predicate ] = query;
					return mql;
				}
			};
		// default is an object
		default:
			return compileObject(schema.properties, predicate);
	}
}

function compileObject(properties, predicate) {
	var compiledProps = Object.keys(properties).map(function (key) {
			return compilePredicate(properties[ key ], predicate, key);
		});

	return {
		quads: function objectQuads(subject, object, label) {
			var quads = [],
				cvt;

			if (predicate) {
				cvt = '/cvt/' + uuid.v4();
				quads.push(quad(cvt, predicate, subject, label));
				subject = cvt;
			}

			return compiledProps.reduce(function (quads, compiled) {
				return quads.concat(compiled.quads(subject, object, label));
			}, quads);
		},
		mql: function objectMql(q, mql) {
			var _q = q,
				_mql = mql;

			if (predicate) {
				_q = q[ predicate ] || {};
				_mql = mql[ predicate ] || (mql[ predicate ] = {});
			}

			compiledProps.reduce(function (_mql, compiled) {
				return compiled.mql(_q, _mql);
			}, _mql);

			return mql;
		}
	};
}

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
