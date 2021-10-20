'use strict';
const { expect } = require( 'chai' );

const { Report } = require ( '../lib/refute.js' );

describe( 'Report(async)', () => {
    it ('can handle async contracts', done => {
        const contract = async ok => {
            ok.equal( await Promise.resolve(42), 42, 'life is fine' );
            ok.equal( await Promise.resolve('war'), 'peace', '1984' );
            ok.done();
        }

        const pending = new Report().async( 20000, contract );
        expect( pending ).to.be.instanceof(Promise);

        pending.then( report => {
            expect( report ).to.be.instanceof(Report);
            expect( report.getGhost() ).to.equal( 'r(1,N)' );
            done();
        });
    });


    if (0) {
    it( 'can handle Promise as evidence', done => {
        new Report().async(2000, ok => {
            ok.check( Promise.resolve(0), 'pass' );
            ok.check( Promise.resolve(1), 'fail' );
            ok.done();
        }).then( report => {
            expect( report ).to.be.instanceof(Report);
            expect( report.getGhost() ).to.equal( 'r(1,N)' );
            done();
        });

    });
    }
});
