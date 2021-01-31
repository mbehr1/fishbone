---
id: badges
title: Badges
sidebar_label: Badges
---
import UriEnDecode from './UriEnDecode';

## Overview

Badges are little indicators (similar like number of messages on mobile phone icons) providing a quick way to show data and capture your attention.

todo: add picture

Each root-cause supports two badges:
- upper left badge. Shown in red color.
- lower left badge, shown in secondary color.

Badges receive their info from currently two sources:
- DLT-Logs extension
- https rest-queries.

## Badges using DLT-Logs extensions

With DLT-Logs extension the following use-cases are supported:

Show information in any of the badges: 
- based on number of messages matching a set of DLT-filters on the currently opened DLT-file
- based on message attributes usually from the first message filtered
- based on applying a user-defined Javascript on the messages returned from a query of a set of DLT-filters.

To use a badge perform the following steps:
1. **edit** a root-cause (press the small pen icon on a root cause in the fishbone)
2. press the **edit upper left badge** or *lower right badge** button
3. select the **extension dlt-logs rest query** button
4. press the **OPEN DLT FILTER ASSISTANT...** button
5. select the filters you want to use on the right hand side **All available filters:**.
:::note
If the list is empty you do need to open a DLT log file and configure your filters there first.
:::
6. press the `<`button to move those filters to the **Selected filters:** list.
7. press **SAVE CHANGES**
8. specify the "jsonPath" expression to extract results. For the "number of messages" use-case the jsonPath expression is already prefilled. See (todo) for details.
9. select whether you want to use 
    - number of array elements or
    - data from first element or 
    - a javascript function

    to get the data out of the returned DLT-filter results.

:::info
The upper badge is configured to not show if the returned value is the number 0.
If you want to show it anyhow see [examples](#javascript-function-examples) on how to convert to the string '0'.
:::

### Data returned from a DLT-Logs rest query:

The returned data from a rest query is in general a JSON object. 

For a query with DLT-filters it's typically in the form of an object with a key `data` that is an array of messages like:
```jsonc
{
  "data": [
    {
        "id": 10,
        "type": "msg",
        "attributes": {
            "timeStamp": 18283269,
            "ecu": "ECU1",
            "apid": "SYS",
            "ctid": "CTI1",
            "payloadString": "Example SYS CTI1 message payload...",
            "lifecycle": 1585216860833.6
        }
    },
    {
        "id": 68,
        "type": "msg",
        "attributes": {
            "timeStamp": 18304306,
            "ecu": "ECU1",
            "apid": "SYS",
            "ctid": "CTI1",
            "payloadString": "Another example SYS CTI1 message payload...",
            "lifecycle": 1585216860833.6
        },
    }
    // more msgs to follow
    ]
}
```

### Json path details

As a first step of processing the returned object can be processed with a [json path](https://goessner.net/articles/JsonPath/index.html) pre-processor.

E.g. to get the `data` array elements simply use:
```json
$.data[*]
```

or if you're only interested in the attributes:
```json
$.data[*].attributes
````

or for the `payloadString`:
```json
$.data[*].attributes.payloadString
```

:::tip
If you're not used to json path expressions there is a online evaluator available here [jsonpath](https://jsonpath.com).
:::

### Javascript function details

If the the number of messages or the first element from the json path expression is not sufficient e.g. for use-cases like:
- calculate an average/min/max value
- calculate the distinct set of values e.g. different SW versions
- extract/shorten the result
- find lifecycles where messages matching exactly one of multiple filters
- ...

a user-provided javascript function body can be entered.

The function prototype is in the form of:
```typescript
function (result: object|any[] ):string|number|object {
    <body text>
}
```

It's actually created, called and evalued internally with:
```javascript
    const fn = new Function("result", '<entered body text>');
    const fnRes = fn(result); // call the function
    switch (typeof fnRes) { // which type was returned:
        case 'string': answer.convResult = fnRes; break;
        case 'number': answer.convResult = fnRes; break;
        case 'object': answer.convResult = JSON.stringify(fnRes); break;
    ...
```
The result from the rest query or if provided from the json path processor is passed to the javascript function as `result` parameter.

### Javascript function examples

See here a few examples:

1. provide from the first 3 results the substring from index 10 to 15 separated by ',':
```javascript
   return result.slice(0,3).map(r=>r.slice(10,15)).join(',');
```
2. show 0 for number of message, i.e. convert to string as result:
```javascript
    return result.length.toString();
```

todo ... add more examples.

### URI-De-/Encoder

As the communication from fishbone extension to DLT-Logs extension is via a rest-api alike "restQuery" the query gets transmitted and stored in a URI encoded format.

To ease decoding and fast manual edits you can enter/modify the query below:

<UriEnDecode />

## Badges using https rest-queries
