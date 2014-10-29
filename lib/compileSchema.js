module.exports = compileSchema;

var uuid = require('uuid'),
	toMQL = require('./toMQL');

function compileSchema(schema) {
	var compiled = compilePredicate(schema);
	return {
		toGraph: compiled.toGraph,
		fromGraph: function (rql) {
			return [ compiled.fromGraph(toMQL(rql)) ];
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
		toGraph: serializePredicate,
		fromGraph: queryPredicate
	};

	function serializePredicate(subject, object, label) {
		if (key) {
			object = object[ key ];
		}

		var quads = compiledType.toGraph(subject, object, label);

		return quads;
	}

	function queryPredicate(q, mql) {
		mql = mql || {};
		// TODO: what does key mean for us here?

		if (key) {
			//q = q[ key ] || {};
		}

		return compiledType.fromGraph(q, mql);
	}
}

function compileType(schema, predicate) {
	var type = schema.type,
		compiledItem;

	switch (type) {
		case 'array':
			compiledItem = compilePredicate(schema.items, predicate);
			return {
				toGraph: function serializeArray(subject, array, label) {
					return array.reduce(function (quads, item) {
						return quads.concat(compiledItem.toGraph(subject, item, label));
					}, []);
				},
				fromGraph: function queryArray(q, mql) {
					compiledItem.fromGraph(q[ predicate ] || {}, mql);
					var query = mql[ predicate ];
					// TODO: what does { arr: [ null ] } mean?
					mql[ predicate ] = query != null ? [ query ] : [];
					return mql;
				}
			};
		case 'string':
		case 'date':
			return {
				toGraph: function serializeString(subject, object, label) {
					return [ quad(subject, predicate, object, label) ];
				},
				fromGraph: function queryString(q, mql) {
					mql[ predicate ] = predicate in q ? q[ predicate ] : null;
					return mql;
				}
			};
		case 'number':
		case 'integer':
		case 'boolean':
			return {
				toGraph: function serializeToString(subject, object, label) {
					return [ quad(subject, predicate, '' + object, label) ];
				},
				// it's up to the consumer to coerce these values after the query
				fromGraph: function queryToString(q, mql) {
					var query = predicate in q ? q[ predicate ] : null;
					mql[ predicate ] = query;
					return mql;
				}
			};
		// default is an object
		default:
			return compileObj(schema.properties, predicate);
	}
}

function compileObj(properties, predicate) {
	var compiledProps = Object.keys(properties).map(function (key) {
			return compilePredicate(properties[ key ], predicate, key);
		});

	return {
		toGraph: serializeObj,
		fromGraph: queryObj
	};

	function serializeObj(subject, object, label) {
		var quads = [],
			cvt;

		if (predicate) {
			cvt = '/cvt/' + uuid.v4();
			quads.push(quad(cvt, predicate, subject, label));
			subject = cvt;
		}

		return compiledProps.reduce(function (quads, compiled) {
			return quads.concat(compiled.toGraph(subject, object, label));
		}, quads);
	}

	function queryObj(q, mql) {
		var _q = q,
			_mql = mql;

		if (predicate) {
			_q = q[ predicate ] || {};
			_mql = mql[ predicate ] || (mql[ predicate ] = {});
		}

		compiledProps.reduce(function (_mql, compiled) {
			return compiled.fromGraph(_q, _mql);
		}, _mql);

		return mql;
	}
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
