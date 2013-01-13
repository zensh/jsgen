var crypto = require('crypto'),
	validator = require('validator'),
	tools = {};

/**
 * Return md5 hash of the given string and optional encoding,
 * defaulting to hex.
 *
 *     utils.md5('wahoo');
 *     // => "e493298061761236c96b02ea6aa8a2ad"
 *
 * @param {String} str
 * @param {String} encoding
 * @return {String}
 * @api public
 */
tools.md5 = function(str, encoding) {
	return crypto.createHash('md5').update(str).digest(encoding || 'hex');
}

tools.sha256 = function(str, encoding) {
	return crypto.createHash('sha256').update(str).digest(encoding || 'hex');
}

tools.checkEmail = function(email) {
	try {
		validator.check(email).len(6, 64).isEmail();
	} catch(e) {
		return false;
	}
	return true;
}

tools.checkUrl = function(url) {
	try {
		validator.check(url).isUrl();
	} catch(e) {
		return false;
	}
	return true;
}

tools.checkIP = function(ip) {
	try {
		validator.check(ip).isIP();
	} catch(e) {
		return false;
	}
	return true;
}

tools.merge = function merge(a, b) {
	if(a && b) {
		for(var key in b) {
			if(typeof b[key] === 'object' && b[key] !== null) {
				a[key] = b[key];
				merge(a[key], b[key]);
			} else a[key] = b[key];
		}
	}
	return a;
}

tools.intersect = function intersect(a, b) {
	if(a && b) {
		for(var key in a) {
			if(b.hasOwnProperty(key)) {
				if(typeof b[key] === 'object' && b[key] !== null) {
					intersect(a[key], b[key]);
				} else a[key] = b[key];
			} else delete a[key];
		}
	}
	return a;
}

tools.gravatar = function(email,size) {
	var size = size || 80;
	if (typeof size !== 'number' || size < 1 || size > 2048 ) return false;

	var gravatarUrl = 'http://www.gravatar.com/avatar/$hex?s=' + size;
	if(tools.checkEmail(email)) {
		return gravatarUrl.replace('$hex', tools.md5(email.trim().toLowerCase()));
	} else return false;
}

module.exports = tools;