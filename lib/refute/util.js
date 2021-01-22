'use strict';

/* Determine n-th caller up the stack */
/* Inspired by Perl's Carp module */
const inStack = /([^:\s]+:\d+(?::\d+)?)\W*(\n|$)/g;
function callerInfo(n) {
    /* a terrible rex that basically searches for file.js:nnn:nnn several times*/
    return (new Error().stack.match(inStack)[n+1] || '')
        .replace(/[^/\w]*/, '').replace(/\D*$/,'');
}

module.exports = { callerInfo };
