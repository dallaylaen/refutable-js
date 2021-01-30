const refute = require('./lib/refute.js');

// TODO normal args & timing
// use time js speed.js

for (let i = 0; i < 1000; i++) {
    refute( ok => {
        for (let j = 0; j < 1000; j++) {
            ok.match( j, /\d+/, 'j is a number' );
        };
        ok.getTap();
    });
    
};

