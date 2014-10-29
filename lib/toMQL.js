module.exports = toMQL;

var parse = require('rql/parser').parseQuery;

function toMQL(value) {
	var operators = toMQL.operators,
		query = parse(value);

	function _toMQL(value, mql) {
		mql = mql || {};

		var operator;

		if (value && typeof value === 'object' && !(value instanceof RegExp)) {
			if (Array.isArray(value)) {
				return value.map(function (v) {
					return _toMQL(v, mql);
				});
			}
			else {
				operator = operators[ value.name ];
				if (operator) {
					return operator.apply(mql, _toMQL(value.args));
				}
				else {
					throw new Error('unsupported operator: ' + value.name);
				}
			}
		}
		else {
			return value;
		}
	}

	return _toMQL(query);
}

toMQL.operators = {
	and: reducer(merge),

	eq: path(function (prop, value) {
		this[ prop ] = value;
	})
};

function reducer(reduce) {
	return function () {
		var terms = Array.prototype.slice.call(arguments);

		return terms.reduce(reduce, this);
	};
}

function path(operator) {
	return function (predicate, value) {
		var mql = this,
			path;

		if (Array.isArray(predicate)) {
			path = predicate;
			predicate = predicate.pop();
			mql = path.reduce(function (parent, segment) {
				return parent[ segment ] || (parent[ segment ] = {});
			}, mql);
		}

		operator.call(mql, predicate, value);
		return this;
	};
}

function merge(a, b) {
	return Object.keys(b).reduce(function (a, key) {
		var source = b[ key ],
			dest = a[ key ];

		if (source && typeof source === 'object') {
			if (Array.isArray(source)) {
				// shallow copy arrays
				source = (dest || []).concat(source);
			}
			else {
				source = merge(dest || {}, source);
			}
		}

		a[ key ] = source;

		return a;
	}, a);
}
