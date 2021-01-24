# refute.js

Lightweight runtime assertion, testing, and contract programming tool.

# Usage

Setting up a runtime assertion:

```javascript
const refute = require( 'refute.js' );

/* later */
refute( ok => {
    ok.equal( total, price+taxes, 'price as expected' );
    ok.match( str, /f?o?r?m?a?t/, 'string format is fine' );
    if( !ok.isPassing() )
        ok.diag( 'condition failed on input', input );
});
```

Changing default action.
This _does not_ affect refute instances imported in other places.
Multiple actions may be configured in the same file.

```javascript
const refute = require( 'refute.js' )
    .config({onFail: report => console.log(report.getTap())});
```

Assertions without side effect (just check):

```javascript
const report = refute.report( ok => {
    ok.equal( answer, 42, 'life, universe, and everything' );
    // ...
});
report.isDone();       // true
report.isPassing();    // it depends
report.getDetails(1);  // get object with check #1 detailed results
```

Making custom conditions:

```javascript
refute.addCondition(
    'isPrime',
    {args:1},
    n => {
        for(let i = 2; i * i < n; i++)
            if (!(n%i)) return i+' divides '+n;
        return false;
    }
);
```



# Author

Copyright (c) Konstantin Uvarin 2021
