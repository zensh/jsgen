/**
 * Make sure the charset of the page using this script is
 * set to utf-8 or you will not get the correct results.
 * https://github.com/arahaya/utf8.js
 */
var utf8 = (function () {
    var highSurrogateMin = 0xd800,
        highSurrogateMax = 0xdbff,
        lowSurrogateMin  = 0xdc00,
        lowSurrogateMax  = 0xdfff,
        surrogateBase    = 0x10000;

    function isHighSurrogate(charCode) {
        return highSurrogateMin <= charCode && charCode <= highSurrogateMax;
    }

    function isLowSurrogate(charCode) {
        return lowSurrogateMin <= charCode && charCode <= lowSurrogateMax;
    }

    function combineSurrogate(high, low) {
        return ((high - highSurrogateMin) << 10) + (low - lowSurrogateMin) + surrogateBase;
    }

    /**
     * Convert charCode to JavaScript String
     * handling UTF16 surrogate pair
     */
    function chr(charCode) {
        var high, low;

        if (charCode < surrogateBase) {
            return String.fromCharCode(charCode);
        }

        // convert to UTF16 surrogate pair
        high = ((charCode - surrogateBase) >> 10) + highSurrogateMin,
        low  = (charCode & 0x3ff) + lowSurrogateMin;

        return String.fromCharCode(high, low);
    }

    /**
     * Convert JavaScript String to an Array of
     * UTF8 bytes
     * @export
     */
    function stringToBytes(str) {
        var bytes = [],
            strLength = str.length,
            strIndex = 0,
            charCode, charCode2;

        while (strIndex < strLength) {
            charCode = str.charCodeAt(strIndex++);

            // handle surrogate pair
            if (isHighSurrogate(charCode)) {
                if (strIndex === strLength) {
                    throw new Error('Invalid format');
                }

                charCode2 = str.charCodeAt(strIndex++);

                if (!isLowSurrogate(charCode2)) {
                    throw new Error('Invalid format');
                }

                charCode = combineSurrogate(charCode, charCode2);
            }

            // convert charCode to UTF8 bytes
            if (charCode < 0x80) {
                // one byte
                bytes.push(charCode);
            }
            else if (charCode < 0x800) {
                // two bytes
                bytes.push(0xc0 | (charCode >> 6));
                bytes.push(0x80 | (charCode & 0x3f));
            }
            else if (charCode < 0x10000) {
                // three bytes
                bytes.push(0xe0 | (charCode >> 12));
                bytes.push(0x80 | ((charCode >> 6) & 0x3f));
                bytes.push(0x80 | (charCode & 0x3f));
            }
            else {
                // four bytes
                bytes.push(0xf0 | (charCode >> 18));
                bytes.push(0x80 | ((charCode >> 12) & 0x3f));
                bytes.push(0x80 | ((charCode >> 6) & 0x3f));
                bytes.push(0x80 | (charCode & 0x3f));
            }
        }

        return bytes;
    }

    /**
     * Convert an Array of UTF8 bytes to
     * a JavaScript String
     * @export
     */
    function bytesToString(bytes) {
        var str = '',
            length = bytes.length,
            index = 0,
            byte,
            charCode;

        while (index < length) {
            // first byte
            byte = bytes[index++];

            if (byte < 0x80) {
                // one byte
                charCode = byte;
            }
            else if ((byte >> 5) === 0x06) {
                // two bytes
                charCode = ((byte & 0x1f) << 6) | (bytes[index++] & 0x3f);
            }
            else if ((byte >> 4) === 0x0e) {
                // three bytes
                charCode = ((byte & 0x0f) << 12) | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
            }
            else {
                // four bytes
                charCode = ((byte & 0x07) << 18) | ((bytes[index++] & 0x3f) << 12) | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
            }

            str += chr(charCode);
        }

        return str;
    }

    return {
        stringToBytes: stringToBytes,
        bytesToString: bytesToString
    };
}());
