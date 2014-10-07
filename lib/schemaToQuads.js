module.exports = compileSchema;

var uuid = require('uuid');

function compileSchema(schema) {
	return compilePredicate(schema);
}

function compilePredicate(schema, predicate, key) {
	var serializeExtends,
		serializeType;

	if (typeof schema !== 'object') {
		throw new ReferenceError('invalid schema');
	}

	predicate = key || predicate || '';

	if (schema[ 'extends' ]) {
		serializeExtends = compilePredicate(schema, predicate);
	}

	serializeType = compileType(schema, predicate);

	return function serializePath(subject, object) {
		if (key) {
			object = object[ key ];
		}

		var quads = serializeType(subject, object);

		if (serializeExtends) {
			quads = quads.concat(serializeExtends(subject, object));
		}

		return quads;
	};
}

function compileType(schema, predicate) {
	var type = schema.type,
		serializeItem;

	switch (type) {
		case 'array':
			serializeItem = compilePredicate(schema.items, predicate);
			return function serializeArray(subject, array) {
				return array.reduce(function (quads, item) {
					return quads.concat(serializeItem(subject, item));
				}, []);
			};
		case 'string':
		case 'date':
			return function serializeString(subject, object) {
				return [{
					subject: subject,
					predicate: predicate,
					object: object
				}];
			};
		case 'number':
		case 'integer':
		case 'boolean':
			return function serializeToString(subject, object) {
				return [{
					subject: subject,
					predicate: predicate,
					object: '' + object
				}];
			};
		// default is an object
		default:
			return compileObj(schema.properties, predicate);
	}
}

function compileObj(properties, predicate) {
	var props = Object.keys(properties).map(function (key) {
			return compilePredicate(properties[ key ], predicate, key);
		});

	return function serializeObj(subject, object) {
		var quads = [],
			cvt;

		if (predicate) {
			cvt = '/cvt/' + uuid.v4();
			quads.push({
				subject: cvt,
				predicate: predicate + '.cvt',
				object: subject
			});
			subject = cvt;
		}

		return props.reduce(function (quads, serialize) {
			return quads.concat(serialize(subject, object));
		}, quads);
	};
}
