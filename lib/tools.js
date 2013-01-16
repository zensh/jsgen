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

function MD5(str, encoding) {
	return crypto.createHash('md5').update(str).digest(encoding || 'hex');
}

function SHA256(str, encoding) {
	return crypto.createHash('sha256').update(str).digest(encoding || 'hex');
}

function HmacSHA256(str, pwd, encoding) {
	return crypto.createHmac('sha256', pwd).update(str).digest(encoding || 'hex');
}

function checkClass(o) {
	if (o === null) return 'Null';
	if (o === undefined) return 'Undefined';
	return Object.prototype.toString.call(o).slice(8, -1);
}

function checkEmail(email) {
	try {
		validator.check(email).len(6, 64).isEmail();
	} catch(e) {
		return false;
	}
	return true;
}

function checkUrl(url) {
	try {
		validator.check(url).isUrl();
	} catch(e) {
		return false;
	}
	return true;
}

function checkIP(ip) {
	try {
		validator.check(ip).isIP();
	} catch(e) {
		return false;
	}
	return true;
}

function merge(a, b) {
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

function intersect(a, b) {
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

function gravatar(email, size) {
	var size = size || 80;
	if(typeof size !== 'number' || size < 1 || size > 2048) return false;

	var gravatarUrl = 'http://www.gravatar.com/avatar/$hex?s=' + size;
	if(checkEmail(email)) {
		return gravatarUrl.replace('$hex', md5(email.trim().toLowerCase()));
	} else return false;
}

module.exports = {
	MD5: MD5,
	SHA256: SHA256,
	HmacSHA256: HmacSHA256,
	checkClass: checkClass,
	checkEmail: checkEmail,
	checkUrl: checkUrl,
	checkIP: checkIP,
	merge: merge,
	intersect: intersect,
	gravatar: gravatar
};