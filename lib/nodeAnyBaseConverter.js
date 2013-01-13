module.exports = function anyBaseConverter(original, base, string_table, callback) {

  //  anyBaseConverter(original, [base], [string_table], [callback]);
  //
  //  This function extend Number.toString() and parseInt(), you can define base number and convert string table yourself.
  //
  //      original : String or Number, when String, character must be in string_table, converter to a decimal number;
  //                 when Number converter to a string that used string_table;
  //          base : Number, optional, default value is 10, must be an integer, 2 <= base <= string_table.length; if base <=36
  //                 and string_table use default value, anyBaseConverter() call native base conversion. 
  //  string_table : String, optional, default value is "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  //                 character must be unique and not whitespace character.
  //      callback : function(err, result), optional.
  //
  var STRING = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    result;

  var callBack = function(err, re) {
      if(err) return console.log(err);
      return re;
    }

  var decToGeneric = function(o, b, c) {

      if(b <= 36 && c === STRING) {
        return o.toString(b); // Fallback to native base conversion
      }

      var re = '',
        q = 0;

      while(o != 0) {
        q = o % b;
        re = c[q] + re;
        o = (o - q) / b;
      }

      return re;
    }

  var genericToDec = function(o, b, c) {

      if(b <= 36 && c === STRING) {
        return parseInt(o, b); // Fallback to native base conversion
      }

      var cache = {},
        s = '',
        re = 0,
        pow = 1;

      for(var i = o.length - 1; i >= 0; i--) {
        s = o[i];
        if(typeof cache[s] == 'undefined') {
          cache[s] = c.indexOf(s);
        }
        re += pow * cache[s];
        pow *= b;
      }
      return re;
    }

  try {

    //Check out callback function
    callback = callback || callBack;
    if(typeof callback !== 'function') {
      return console.log('Callback must be a function! Such as:\n '+callBack.toString());
    }

    //Check out string_table
    string_table = string_table || STRING; //if undefined, set default value STRING
    if(string_table !== STRING && string_table === STRING.slice(0, string_table.length)) {
      string_table = STRING;
    } //if subset of STRING, set default value STRING
    if(typeof string_table === 'string' && string_table.length >= 2) {
      if(string_table !== STRING) { //if STRING, need not check out
        var reg = /\s+/;  //check if any Unicode whitespace character
        if(reg.test(string_table)) {
            throw new Error('"string_table" err! It must be not a unicode whitespace character!');
        }
        for(var i = string_table.length - 1; i >= 0; i--) { //check out for uniquely
          for(var k = i - 1; k >= 0; k--) {
            if(string_table[i] === string_table[k]) {
              throw new Error('"string_table" err! It must be unique! : "' + string_table[i] + '"');
            }
          };
        };
      }

    } else {
      throw new Error('"string_table" must be string, and string_table.length >=2.');
    }

    //check out base
    base = base || 10; //if undefined, set default value 10
    if(typeof base !== 'number' || !isFinite(base) || base !== Math.floor(base) || base < 2 || base > string_table.length) {
      throw new Error('Invalid "base" number! It must be an integer, and 2 <= base <= string_table.length.');
    }

    //check out original and execute
    switch(typeof original) {
    case 'number':
      if(isFinite(original) && original >= 0 && original <= Number.MAX_VALUE && original === Math.floor(original)) {
        result = decToGeneric(original, base, string_table);
      } else {
        throw new Error('Invalid "original" number! It must be an integer, and 0 <= number <= Number.MAX_VALUE.');
      }
      break;

    case 'string':
      for(var i = original.length - 1; i >= 0; i--) {
        var checkout = string_table.indexOf(original[i]);
        if(checkout === -1 || checkout >= base) {
          throw new Error('"' + original[i] + '" is invalid "original" string! Available character is "' + string_table + '".');
        }
      };
      result = genericToDec(original, base, string_table);
      break;

    default:
      throw new Error('"original" must be number or string!');
    }

    return callback(null, result);

  } catch(err) {
    return callback(err, null);
  }

}
