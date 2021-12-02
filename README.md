# refute.js

Lightweight runtime assertion and contract programming tool.

# On the name

Less is more; refutation is assertion.

# Description

Refute allows to inject blocks of falsifiable conditions into runtime code.
Should one or more such conditions fail, a detailed report is generated
and a configurable action is taken.
The default is just throwing an error with stringified report.

Condition blocks can be nested and reused.
New conditions can be defined.

It's noninvasive, concise, and fast.

# Usage

```javascript
const refute = require( 'refute.js' );

/* later */
refute( ok => {
    ok.equal( total, price+taxes, 'price as expected' );
    ok.match( str, /f?o?r?m?a?t/, 'string format is fine' );
    ok.type( foo, 'object', 'no surprises' );
    ok.check( custom_condition, 'some explanation' );
    if( !ok.isPassing() )
        ok.diag( 'conditions failed on input', input );
});
```

You can try it out at the [playground](https://dallaylaen.github.io/refute-js/).

# How it works

## The Report object

The `Report` class (available via `refute.Report`) contains information
about passing and failing checks. It's used as follows:

```javascript
const ok = new Report();

// running checks
ok.equals( foo, bar, 'value as expected' );
ok.diag( "object was", some_object );
                    // some_object gets auto-serialized
ok.check( custom_evidence, 'why we care about it' );
ok.stop();
                    // no more checks can be run after this

// querying
ok.isPassing();     // whether checks pass
ok.getCount();      // how many checks
ok.getDetails(n);   // detailed info regarding n-th check
ok.getTap();        // serialized as string
```

## Contracts

A contract is a function that takes a `Report` object and runs checks
against it.

# More examples

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
