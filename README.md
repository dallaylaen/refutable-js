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

# Author

Copyright (c) Konstantin Uvarin 2021
