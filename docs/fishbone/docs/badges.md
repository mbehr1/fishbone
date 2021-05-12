---
id: badges
title: Badges
sidebar_label: Badges
---
import ImageSwitcher from './ImageSwitcher';
import useBaseUrl from '@docusaurus/useBaseUrl';
import BrowserOnly from '@docusaurus/BrowserOnly';
import UriEnDecode from './UriEnDecode';

## Overview

Badges are little indicators (similar like number of messages on mobile phone icons) providing a quick way to show data and capture your attention.

<ImageSwitcher 
lightImageSrc={useBaseUrl("/img/badge1_light.png")}
darkImageSrc={useBaseUrl("/img/badge1_dark.png")}/>

Example picture with root cause 1 with upper badge and root cause 2 with both upper and lower badge.

Each root-cause supports two badges:
- upper left badge. Shown in red color.
- lower left badge, shown in secondary color.

Badges receive their info from currently two sources:
- DLT-Logs extension
- https rest-queries.

:::note
The badges are only shown if the checkbox is unchecked or marked as error.
:::

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
The upper badge is configured to not show if the returned value is the number 0 and is limited to 999. The lower badge will show the 0 and is limited to 99.
If you want to show it anyhow or show higher numbers see [examples](#javascript-function-examples) on how to convert to the string '0'.
:::

### Data returned from a DLT-Logs rest query:

The returned data from a rest query is in general a JSON object. 

For a query with DLT-filters it's typically in the form of an object with a key `data` that is an array of messages like:
```jsonc {2,5,6,11,17,18,23}
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

### Maximum number of DLT query messages returned: maxNrMsgs

By default a DLT-logs query returns a maximum of 1000 messages. In general this should be sufficient for the intended use-cases by using filters restricting the results. If you have use-cases where this is not sufficient you can increase the limit or even disable the limit by adding the `maxNrMsgs`attribute to any filter of the query. E.g.

```jsonc {4}
/get/docs/0/filters?
query=[
  {
    "maxNrMsgs": 0, // 0 = unlimited, 1000 default
    "type": 0,
    "payload": "foo.*",
    "ctid": "FOOD"
  }
]
```

:::note
If multiple filters specify `maxNrMsgs` the maximum value is used (0 counted as highest number).
:::

:::note
Please consider that this might impact heavily the processing time to calculate/update all badges. So please use sparingly where needed only.
:::

### Adding lifecycle info to the DLT query results: addLifecycles

By default a DLT-logs query returns an array of DLT logs as shown in [Data returned](#data-returned-from-a-dlt-logs-rest-query). Each log info contains a `lifecycle` identifier as well that helps e.g. doing calculations like avg/min/max,... per lifecycle.

To support more complex use-cases e.g. to calculate the time distance from a certain message towards the end of the lifecycle "occurred xx sec before end of LC" you can request the lifecycle details as well.
To do so simply add `addLifecycles` to any filter of your query. E.g.

```jsonc {4}
/get/docs/0/filters?
query=[
  {
    "addLifecycles": true, // defaults to false
    "type": 0,
    "payload": "foo.*",
    "ctid": "FOOD"
  }
]
```

The example data returned will then consist of both type `lifecycles` and type `msg` objects:
```jsonc {3,17,35}
  "data": [
    {
      "type": "lifecycles",
      "id": 1585240865939.6,
      "attributes": {
        "index": 1,
        "id": 1585240865939.6,
        "ecu": "ECU1",
        "label": "3/26/2020, 5:41:05 PM-5:42:57 PM #10277",
        "startTimeUtc": "Thu, 26 Mar 2020 16:41:05 GMT",
        "endTimeUtc": "Thu, 26 Mar 2020 16:42:57 GMT",
        "sws": [], // list of sw versions detected
        "msgs": 10277 // nr of messages in this lifecycle (unfiltered)
      }
    },
    {
      "type": "lifecycles",
      "id": 1585240984260.5,
      "attributes": {
        "index": 2,
        "id": 1585240984260.5,
        "ecu": "ECU1",
        "label": "3/26/2020, 5:43:04 PM-5:46:25 PM #41519",
        "startTimeUtc": "Thu, 26 Mar 2020 16:43:04 GMT",
        "endTimeUtc": "Thu, 26 Mar 2020 16:46:25 GMT",
        "sws": [
          "ECU1 21w..." // sw version received.
        ],
        "msgs": 41519 // nr of messages in this lifecycles (unfiltered)
      }
    },
    // ... more lifecycle infos
    {
      "id": 10485,
      "type": "msg",
      "attributes": {
        "timeStamp": 63279, // relative timestamp in 0.1ms granularity to the lifecycle startTimeUtc. You can use Date(lifecycle.startTimeUtc).valueOf()+msg.timeStamp/10 to calculate the abs starttime in ms from UTC.
        "ecu": "ECU1",
        "apid": "DEAD",
        "ctid": "FOOD",
        "payloadString": "foo happened",
        "lifecycle": 1585240984260.5 // this can be used as an identifier/lookup to the returned lifecycles.id
      }
    },
    // ... more messages fitting to the filters.
  ]
```
:::note
The lifecycle infos are always the first objects in the results list and you can rely on the lifecycles being sorted by ecus first (if multiple ecus are present in the logs) then by time.
:::

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
:::warning
Dont use this with the [addLifecycles](#adding-lifecycle-info-to-the-dlt-query-results-addlifecycles) feature. You'll loose the type info!
:::

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

<BrowserOnly fallback={<UriEnDecode />}>
  {() => <UriEnDecode searchParams={(new URL(document.location)).searchParams}/>}
</BrowserOnly>
## Badges using https rest-queries
