# refute.js

Lightweight runtime assertion, testing, and contract programming tool.

# Usage

`refute` function allows to insert contract blocks somewhere in the code.
Contracts consist of falsifiable statements.
If any of those fail, an exception is thrown including a complete report.

    refute( ok => {
        ok.equals( foo, bar, 'foo and bar are equal' );
        ok.matches( str, /f?o?r?m?a?t?/, 'string as expected' );
        if (!ok.isPassing())
            ok.diag( 'Input was', input );
    });

# Author

Copyright (c) Konstantin Uvarin 2021
