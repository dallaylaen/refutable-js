# Overview

refute-contract is a lightweight and flexible runtime assertion / contract
programming tool.
It performs blocks of condition checks and notifies the user should
some of the checks fail.

Unlike similar solutions, including the stock
[assert](https://nodejs.org/api/assert.html) module,
it won't short-circuit on the first failing condition.
Instead, a detailed report is generated and a configurable callback is executed,
which may throw an exception (the default), print to console,
or even send a report back home if the application is being run in a browser.

## Example

```javascript
const refute = require( 'refute-contract' );
const order = {
    version: 1.3,
    total: 10.28,
    price: 9,
    tax: 1.27,
    nmae: 'q. e. 2',
    cart: [
        { id: 7, qty: 1, price: 5 },
        { id: 13, qty: 0, price: 2 },
        { id: 22, qty: 2, price: 2 },
    ],
};
refute (r=>{
    r.type( order.version, 'number', 'a numeric version is included' );
    r.equal( order.total, order.price + order.tax, 'money adds up' );
    r.matches( name, /\w/, 'the only assumption to be made about a name' );
    r.forEach( 'check items in the cart', order.cart, (inner, item) => {
        inner.type( item.id, 'integer', 'items should have ids' );
        inner.type( item.qty, 'integer', 'number of items is whole' );
        inner.numCmp( item.qty, '>', 0, 'at least one item bought' );
    });
});
```

_Note that while we use data validation in this example, nothing prevents
us from accessing other data or even executing functions inside contracts._

## Naming

Less is more, and runtime assertions are really refutations.

## Contracts

A [contract](https://dallaylaen.github.io/refute-js/man/global.html#Contract)
is a block of code containing one or more condition checks.

The first argument is a [report](https://dallaylaen.github.io/refute-js/man/Report.html)
object that keeps track of condition checks and their results.

Additional arguments may follow, if needed
(e.g. we want a saved code block for data validation).

## Conditions

Each condition is a falsifyable statement about some data and/or code:
(deep) equality, inequalities, data type, regexp matching, etc.

In particular, conditions may include nested contracts.

Conditions are implemented as methods of the report object.
The basic arsenal of checks is described
[here](https://dallaylaen.github.io/refute-js/man/conditions.html).

## Evidence

A condition is assumed to pass _unless_ there is an _evidence_ that something
is not right. For `equal`, it is a simple diff between expected/actual values.
For `deepEqual` it's a list of nodes that do not match. And so on.

The evidence is stringified and stored in the report object.

A generic condition named `check` may be used to pass custom data as evidence,
should the user need to evaluate a sophisticated condition once or twice.

## Reports

After running the checks, the report object may be stringified
into a text format inspired by Perl's TAP and the diff utility.
It is terse and intended to be read by humans,
yet can be parsed back into the original report object.

```
r(
    1. a passing test - nothing to see here
    ; comment added by report.info() method
    !2. a failing test - see evidence below!
        ^ condition `equal` failed at foo.js:42
        - 22
        + 4
    ...3. pending check (e.g. waiting for a promise to resolve)
    4. a nested check
    r(
        1. ok let's keep it simple for now
        2. but we go deeper if we need to
    )
)
```

## Playground

One can test try out varyous contracts
at the [playground](https://dallaylaen.github.io/refute-js/).

# Customizing refute 

`refute.config` function may be used to create an isolated instance of refute
with different parameters, in particular, the onFail action.

This is done so to allow changing refute's setup in one package
without affecting the others. 

## Throwing

This is the default one as exceptions are hard to forget about.

Be careful about throwing exceptions in async code, though.

```javascript
const refute = require( 'refute-contract' ).config( onFail: r => { throw new Error(r.toString) } );
```

## Logging

```javascript
const refute = require( 'refute-contract' ).config({ onFail: r => console.log(r.toString) });
```

## Calling home (don't forget a session!)


# Using report outside runtime assertions

```javascript
const report = new refute.Report();
report.run( r => {
    r.equal ( ... );
});
report.getPass(); // true|false
report.getDone(); // true|false
report.getCount(); // number of checks run
report.toString(); // stringified version described above
```

# Custom conditions

New conditions may be added via
[refute.addCondition(name, options, implementation)](https://dallaylaen.github.io/refute-js/man/refute.html#.addCondition)
static function.

This creates a function named `name` in `Report.prototype` (and thus all
report objects) which accepts `options.args` arguments
plus an optional description and passes them (without description)
to the implementation.

The implementation function must return _evidence_. If evidence is a false value
(null, undefined, 0, false, or ''), the check is assumed to pass. Otherwise
it fails, and the details are appended to the report object.

Multiple lines of evidence may be returned as [ ... ].
Lines prefixed with `+ ` and `- ` are assumed to be expected and actual
values, respectively.

Note that implementation does _not_ have access to the report object.

## addCondition/isPrime

```jabascript
addCondition(
    'isPrime',
    { args: 1 },
    n => {
        // Not the most efficient way but it will do as an example
        for (let i = 2; i*i < n; i++)
            n % i || return i + ' divides ' + n;
        return 0;
    }
);
```

# Author

Copyright (c) Konstantin Uvarin 2021

