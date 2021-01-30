'use strict';

/* Determine n-th caller up the stack */
/* Inspired by Perl's Carp module */
const inStack = /([^:\s]+:\d+(?::\d+)?)\W*$/;
function callerInfo(n) {
    /* a terrible rex that basically searches for file.js:nnn:nnn several times*/
    return (new Error().stack.split('\n')[n+2].match(inStack)[1] || '')
}

module.exports = { callerInfo };
