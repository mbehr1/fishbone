---
id: sequences
title: Sequences (DLT logs based)
sidebar_label: Sequences
---

# Sequence detection (DLT logs based)

## Introduction

In software engineering [sequence diagrams](https://en.wikipedia.org/wiki/Sequence_diagram) are often used to describe events occurring for a specific use-case. For those events the order of occurrence from start of the use-case to the end or error cases are defined.

In the context of log analysis, a sequence typically refers to a series of related log entries that represent a specific event coming from the flow of code executed. 

Sequences are often used in log analysis to:

1. Track the execution flow: By following a sequence of log entries, you can understand how a particular process or operation is executed within the system.
2. Identify patterns: Sequences can help identify common patterns or behaviors in the system, which can be useful for performance optimization or troubleshooting.
3. Detect anomalies: By comparing sequences, you can detect deviations from the expected behavior, which may indicate potential issues or errors in the system.
4. Correlate events: Sequences can help correlate events across different components or services, providing a holistic view of the system's behavior.

## Target

The target of sequence detection is to identify sequences for use-cases from the event logs.

This eases the log based analysis for

1. faster understanding where a specific use-case failed,
2. confirming that the use-cases executed properly.

## Sequence definition

The [dlt-logs](https://mbehr1.github.io/dlt-logs/), [fba-cli](https://github.com/mbehr1/fba-cli) and fishbone extensions support [REST query](/docs/badges#manual-edit-of-dlt-query) based sequence definition.

### sequence attributes
A `sequence` is defined via the following attributes:

attribute | description
--------- | -----------
`name` | Name of the sequence. Should be well defined as all sequences share the same namespace and the DLT-logs extension shows the results in the tree view under Events/Sequences/name.
`steps` | Array with objects defining the events aka steps. Those steps are checked for being executed in order. See [step definition](#step-definition)
`failures` |  Object/map with filters defining a possible failure for the sequence. The object key defines the name of the failure and the key value defines the filter used to detect that. See [failures definition](#failures-definition)

An example with one failure but without step details :

```jsonc {4,5,7}
/get/docs/0/filters?
sequences=[
  {
    "name": "SW Update",
    "steps":[ // array with one object per step...
    ],
    "failures":{
      "crash":{ // a dlt filter definition like:
        "type":3, // event
        "apid":"SYS",
        "ctid":"JOUR",
        "payloadRegex":"^process '.*?' crashed"
      }
    }
  }
]
```

### `step` definition

A `step` has the following attributes:

attribute | description
--------- | -----------
`name` | Optional: Name of this step. If not provided name of the filter or name of the contained sequence will be used.
`card` | Optional: Cardinality of this step. Defaults to "exactly once/mandatory step" if not provided. Can be any of:<br/>`?`:zero or once, so an optional step,<br/>`*`:any number of times = 0.., so an optional step that can occur not at all or any number of times<br/>`+`:once or multiple times, so a mandatory step that can occur multiple times but at least once
`canCreateNew`| Optional: Determines whether this step can create a new sequence occurrence. Defaults to `true`. Must not be `false` for the first step in a sequence. Set to `false` if this step shall only be checked for a created occurrence from an earlier step. So the `filter`,`sequence` or `alt` will be ignored then.
`filter` | [DLT filter](https://mbehr1.github.io/dlt-logs/docs/filterReference#details) definition. If this filter matches a msg the step is seen as "matching". Either `filter`,`sequence` or `alt` must be provided.
`sequence` | A definition of a `sub-sequence`. For this step a full sequence is used. This is useful to either break down a bigger sequence into smaller parts of if this step can be executed multiple times (e.g. with `card:*`) but consists of multiple events/steps. See [example](#example).
`alt`| A definition for a list of alternative steps. The `alt` attribute is an array/list of step definitions. Any `card` or `canCreateNew` attribute will automatically be applied to the alternative steps. For this step to be `ok` exactly one step needs to be `ok`. See [example alt](#example-alternative-steps).

:::important
A step must contain either a filter or a sub-sequence or an alt-list but not more than one!
:::

:::caution
Optional steps are not allowed at the end of the sequence \/ end of the steps list.

The sequence will be detected with the last mandatory step as `done` so the optional steps at the end would never be matched.
:::

### `failures` definition

The failures attribute consists of a name/filter mapping like:

```jsonc {2,6}
{
  "error1": { // DLT filter definition for 'error1'
    "type":3,
    // more dlt filter attributes like apid, ctid, payloadRegex
  },
  "error2": { // DLT filter definition for 'error2' 
    "type":3,
    // more dlt filter attributes...
  }
}
```

Each failures object members is a [DLT filter](https://mbehr1.github.io/dlt-logs/docs/filterReference#details) object.
If this filter matches a log message the sequences is aborted with the failure name from the object key.

E.g. for
```jsonc {7,8}
/get/docs/0/filters?
sequences=[
  {
    "name": "SW Update",
    "steps":[ // one object per step...
    ],
    "failures":{
      "crash":{ // a dlt filter definition like:
        "type":3, // event
        "apid":"SYS",
        "ctid":"JOUR",
        "payloadRegex":"^process '.*?' crashed"
      }
    }
  }
]
```
the sequence `SW Update` will fail with error `crash` if a log message from `SYS/JOUR` starting with payload "process '...' crashed" occurs.

:::note
Only a started sequence gets aborted with any of the defined failures. If the failures occur without a started sequence they are ignored.
:::

### example

See here an example for a very basic flash sequence consisting of:

```mermaid
sequenceDiagram
    autoNumber
    actor tester
    participant flash
    tester->>+flash: start of flash

    loop flash of a single image
      tester->>flash: start image transfer
      Note over tester, flash: transfer image data and persist
      flash->>tester: end image transfer
    end
    
    flash->>-tester: end of flash
```

Filters/failures are ommited.

Here `sub-sequences` are used to ensure that if image x is flashed it's mandatory to have a start and end of the transfer.

```jsonc {7,11,12,13,16,20,28}
/get/docs/0/filters?
sequences=[
  {
    "name": "SW Update",
    "steps":[
      { // step 1 mandatory:
        "name":"start of flash",
        "filter":// filter to detect flash sequence start
      },
      { // step 2 multiple times 
        "card":"+", // multiple but at least 1 image needs to be flashed
        "sequence":[
          "name": "flash of image",
          "steps":[
            { // sub-step 2.1
              "name":"transfer start",
              "filter":// filter to detect start of transfer
            },
            { // sub-step 2.2 = 3
              "name":"transfer end",
              "filter":// filter to detect start of transfer
            }
          ],
          "failures":{}
        ]
      },
      { // step 3 (=4 in seq chart)
        "name":"end of flash",
        "filter":// filter to detect end of flash sequence
      },
    ],
    "failures:{} // ommitted here
    ,
  }
]
```

### example alt(ernative) steps

See here an example for the `alt` attribute of a step:

```mermaid
sequenceDiagram
    autoNumber
    actor tester
    participant flash
    alt
    tester->>+flash: flash new SW if new SW is newer
    else
    tester->>+flash: skip flash if new SW is the same
    else
    tester->>+flash: reject flash if new SW is older
    end
```

```jsonc {8,10,14,18,21}
/get/docs/0/filters?
sequences=[
  {
    "name": "SW Update",
    "steps":[
      { // this step is an alternative step with 3 alternatives:
        "name":"flash",
        "alt":[
            { // alt step 1
              "name":"flash new SW if new SW is newer",
              "sequence":// e.g. sub-sequence to detect if flash was started with newer SW
            },
            { // alt-step 2
              "name":"skip flash if new SW is the same",
              "filter":// filter to detect skip of SW
            },
            { // alt-step 3
              "name":"reject flash if new SW is older",
              "filter":// filter to detect rejection...
            }
          ]
      }
    ],
    "failures:{} // ommitted here
    },
  }
]
```

### context

Any filter payload regex can capture `context` via capture group names.

This will be added as info to the report details.

This can e.g. be used to capture file names transferred or similar dynamic data.

Context values collected are stored as per detected sequence in a key/value storage.
The capture group name is used as the key of the key/value storage.
If multiple values are capture with the same name only the last value is stored.

:::info
Capture group names starting with '_' are treated in a special way:

If they are captured multiple times they need to match the first captured value otherwise the sequence is aborted with an error.
:::

TODO add examples showing how this can be used to enfores that e.g. returned handles are the same for a request.

## REST query sequence return values

todo describe `seqSummary`

## Using sequences

The intended way to use sequences with fishbones is to define them as part of the upper or lower badge for a root cause.
As soon as the root cause is visible the sequence detection will be executed automatically and the summary shown as part of the [badge](/docs/badges)

To do so use a badge with
- extension dlt-logs rest query
- edit the sequence manually or via `EDIT IN NOTEBOOK`
- use json path: `$.data[*]`
- use javascript function:
```javascript
const summaries=result.filter((t)=>t.type==='seqSummary').map((d)=>d.attributes)
return ''+summaries.map((s)=>`${s.name}:${s.summary}`).join(',')
```
This will show the sequence execution summaries as part of the badge label.

### full report via dlt-logs extension
The full report for a sequence execution is available in the tree-view under `Events`\/`Sequences`\/name and can be browsed there or exported in markdown format.

TODO: picture or link to dlt-logs docs.

### full report via fba-cli tool
The `fba-cli` tool executes the full fishbone including the sequences and will contain a report in markdown format for the sequence.

TODO: ... more details, links, examples

## Testing sequence definitions

It's easiest to test the definition of the sequence and the execution by opening it in the fishbone/edit badges/notebooks. There you can execute it in real time.

TODO ... add example picture.
