"use strict";(self.webpackChunkfishbone=self.webpackChunkfishbone||[]).push([[6333],{6724:(e,s,n)=>{n.r(s),n.d(s,{assets:()=>v,contentTitle:()=>b,default:()=>q,frontMatter:()=>y,metadata:()=>t,toc:()=>w});const t=JSON.parse('{"id":"badges","title":"Badges","description":"Overview","source":"@site/docs/badges.md","sourceDirName":".","slug":"/badges","permalink":"/fishbone/docs/badges","draft":false,"unlisted":false,"editUrl":"https://github.com/mbehr1/fishbone/edit/master/docs/fishbone/docs/badges.md","tags":[],"version":"current","frontMatter":{"id":"badges","title":"Badges","sidebar_label":"Badges"},"sidebar":"fishboneSideBar","previous":{"title":"Interactive diagrams","permalink":"/fishbone/docs/interactive"},"next":{"title":"Nested fishbones","permalink":"/fishbone/docs/nestedFishbones"}}');var r=n(4848),i=n(8453),a=n(6540),l=n(5293);const o=e=>{let{lightImageSrc:s,darkImageSrc:n}=e;const t="dark"===(0,l.G)().colorMode;return(0,r.jsx)("img",{src:t?n:s})};var d=n(6025),c=n(8478),h=n(1219),u=n.n(h),f=n(1606),p=n.n(f);function x(e){try{const n=p().tokenize(e);let t="",r=!1,i="",a=0,l=0,o=0;for(const e of n){const s=0===i.length;switch(r&&"whitespace"!==e.type&&(r=!1),e.type){case"separator":switch(e.raw){case"{":case"}":s&&(i+="  ".repeat(e.stack.length)),i+=e.raw;break;case":":i+=e.raw,i+=" ",r=!0;break;default:i+=e.raw}break;case"newline":t+=i.trimEnd(),i="",t+="\n",a++;break;case"literal":case"key":s&&(i+="  ".repeat(e.stack.length)),i+=e.raw;break;case"whitespace":s||r||(i+=e.raw),l++;break;case"comment":i+=e.raw,o++;break;default:console.error(`formatJson5: unknown token '${e.type}'`,e)}}if(i.length>0&&(t+=i),!a&&!l&&!o)try{t=JSON.stringify(JSON.parse(t),void 0,2)}catch(s){console.warn(`formatJson5: special legacy rule check failed to apply due to '${s}'`)}return t}catch(s){return console.error(`formatJson5: got error='${s}'`),e}}const m=e=>{if(!e||0===e.length)return"";let s="";const n=e?.indexOf("?");if(n>0){s+=e.slice(0,n+1)+"\n";const t=e.slice(n+1).split("&");let r=0;for(const e of t){const n=e.indexOf("="),t=e.slice(0,n),i=decodeURIComponent(e.slice(n+1));r&&(s+=" &\n"),r++;try{u().parse(i),s+=t+"="+x(i)+"\n"}catch{i.includes("{")||i.includes("[")||i.includes('"')?s+=`\n<cannot parse: \n'${t}=${i}'\n as JSON5>`:s+=`${t}=${i}`}}}else s=e;return s},g=e=>{let s=!0,n="";const t=e?.indexOf("?");if(t>0){n+=e.slice(0,t+1);const i=e.slice(t+1).split("&\n");let a=0;for(let e of i){e=e.replace(/^\s+|\s+$/g,"");const t=e.indexOf("=");if(a&&(n+="&"),a++,t>=0){const i=e.slice(0,t),a=e.slice(t+1);try{u().parse(a);n+=`${i}=${encodeURIComponent(x(a))}`}catch(r){if(a.includes("{")||a.includes("[")||a.includes('"')){const e=/at (\d+):(\d+)$/.exec(r);if(e){const s=e[1],t=e[2];n+=`&\n<${r}:\n${a.split(/\r?\n/)[s-1]}\n${t>0?"-".repeat(t-1)+"^":"^"}\n parsing JSON5 at \n'${i}=${a}'\n>`}else n+=`&\n<cannot parse: \n'${i}=${a}'\n as JSON5 due to '${r}'>`;s=!1}else n+=`${i}=${a}`}}else n+=`${e}`}}else n=e;return[s,n]};function j(e){const[s,n]=(0,a.useState)(e?.searchParams?.get("q")?decodeURIComponent(e?.searchParams?.get("q")):"/get/docs/0/filters?query=%5B%5D"),[t,i]=(0,a.useState)(m("")),[l,o]=(0,a.useState)("");return(0,a.useEffect)((()=>{const e=m(s);e!==t&&i(e)}),[s]),(0,a.useEffect)((()=>{try{const[e,s]=g(t);s!==l&&o(s)}catch{}}),[t]),(0,r.jsxs)("form",{children:[(0,r.jsxs)("label",{children:["DLT-Logs rest query (URI encoded):",(0,r.jsx)("br",{}),(0,r.jsx)("textarea",{cols:80,rows:20,value:s,placeholder:"enter your dlt-logs rest query expression here",type:"text",name:"payloadRegex",onChange:e=>n(e.target.value)})]}),(0,r.jsx)("div",{}),(0,r.jsxs)("label",{children:["DLT-Logs rest query (URI decoded, after & as command sep. a new line has to follow):",(0,r.jsx)("br",{}),(0,r.jsx)("textarea",{cols:80,rows:30,type:"text",value:t,onChange:e=>i(e.target.value)})]}),(0,r.jsx)("div",{}),(0,r.jsxs)("label",{children:["DLT-Logs rest query (URI re-encoded):",s!==l?" modified!":"",(0,r.jsx)("br",{}),(0,r.jsx)("textarea",{readOnly:!0,cols:80,rows:20,type:"text",value:l})]})]})}const y={id:"badges",title:"Badges",sidebar_label:"Badges"},b=void 0,v={},w=[{value:"Overview",id:"overview",level:2},{value:"Badges using DLT-Logs extensions",id:"badges-using-dlt-logs-extensions",level:2},{value:"Manual edit of DLT query",id:"manual-edit-of-dlt-query",level:3},{value:"Data returned from a DLT-Logs rest query:",id:"data-returned-from-a-dlt-logs-rest-query",level:3},{value:"Maximum number of DLT query messages returned: maxNrMsgs",id:"maximum-number-of-dlt-query-messages-returned-maxnrmsgs",level:3},{value:"Adding lifecycle info to the DLT query results: addLifecycles",id:"adding-lifecycle-info-to-the-dlt-query-results-addlifecycles",level:3},{value:"Json path details",id:"json-path-details",level:3},{value:"Javascript function details",id:"javascript-function-details",level:3},{value:"Javascript function examples",id:"javascript-function-examples",level:3},{value:"URI-De-/Encoder",id:"uri-de-encoder",level:3},{value:"Badges using https rest-queries",id:"badges-using-https-rest-queries",level:2}];function T(e){const s={a:"a",admonition:"admonition",code:"code",em:"em",h2:"h2",h3:"h3",li:"li",ol:"ol",p:"p",pre:"pre",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,i.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(s.h2,{id:"overview",children:"Overview"}),"\n",(0,r.jsx)(s.p,{children:"Badges are little indicators (similar like number of messages on mobile phone icons) providing a quick way to show data and capture your attention."}),"\n",(0,r.jsx)(o,{lightImageSrc:(0,d.Ay)("/img/badge1_light.png"),darkImageSrc:(0,d.Ay)("/img/badge1_dark.png")}),"\n",(0,r.jsx)(s.p,{children:"Example picture with root cause 1 with upper badge and root cause 2 with both upper and lower badge."}),"\n",(0,r.jsx)(s.p,{children:"Each root-cause supports two badges:"}),"\n",(0,r.jsxs)(s.ul,{children:["\n",(0,r.jsx)(s.li,{children:"upper left badge. Shown in red color."}),"\n",(0,r.jsx)(s.li,{children:"lower left badge. Shown in secondary color."}),"\n"]}),"\n",(0,r.jsx)(s.p,{children:"Badges receive their info from currently two sources:"}),"\n",(0,r.jsxs)(s.ul,{children:["\n",(0,r.jsx)(s.li,{children:"DLT-Logs extension"}),"\n",(0,r.jsx)(s.li,{children:"https rest-queries."}),"\n"]}),"\n",(0,r.jsx)(s.admonition,{type:"note",children:(0,r.jsx)(s.p,{children:"The badges are only shown if the checkbox is unchecked or marked as error."})}),"\n",(0,r.jsx)(s.admonition,{type:"info",children:(0,r.jsxs)(s.p,{children:["The upper badge is configured to not show if the returned value is the number 0 and is limited to 999. The lower badge will show the 0 and is limited to 99.\nIf you want to show it anyhow or show higher numbers see ",(0,r.jsx)(s.a,{href:"#javascript-function-examples",children:"examples"})," on how to convert to the string '0'."]})}),"\n",(0,r.jsx)(s.admonition,{type:"note",children:(0,r.jsx)(s.p,{children:"The text from badges is truncated to max 40 chars. A tooltip is available showing the full text."})}),"\n",(0,r.jsx)(s.h2,{id:"badges-using-dlt-logs-extensions",children:"Badges using DLT-Logs extensions"}),"\n",(0,r.jsx)(s.p,{children:"With DLT-Logs extension the following use-cases are supported:"}),"\n",(0,r.jsx)(s.p,{children:"Show information in any of the badges:"}),"\n",(0,r.jsxs)(s.ul,{children:["\n",(0,r.jsx)(s.li,{children:"based on number of messages matching a set of DLT-filters on the currently opened DLT-file"}),"\n",(0,r.jsx)(s.li,{children:"based on message attributes usually from the first message filtered"}),"\n",(0,r.jsx)(s.li,{children:"based on applying a user-defined Javascript on the messages returned from a query of a set of DLT-filters."}),"\n"]}),"\n",(0,r.jsx)(s.p,{children:"To use a badge perform the following steps:"}),"\n",(0,r.jsxs)(s.ol,{children:["\n",(0,r.jsxs)(s.li,{children:[(0,r.jsx)(s.strong,{children:"edit"})," a root-cause (press the small pen icon on a root cause in the fishbone or click on the text of the root cause)"]}),"\n",(0,r.jsxs)(s.li,{children:["press the ",(0,r.jsx)(s.strong,{children:"edit upper left badge"})," or ",(0,r.jsx)(s.em,{children:"lower right badge"}),"* button"]}),"\n",(0,r.jsxs)(s.li,{children:["select the ",(0,r.jsx)(s.strong,{children:"extension dlt-logs rest query"})," button"]}),"\n",(0,r.jsxs)(s.li,{children:["press the ",(0,r.jsx)(s.strong,{children:"OPEN DLT FILTER ASSISTANT..."})," button"]}),"\n",(0,r.jsxs)(s.li,{children:["select the filters you want to use on the right hand side ",(0,r.jsx)(s.strong,{children:"All available filters:"}),"."]}),"\n"]}),"\n",(0,r.jsx)(s.admonition,{type:"note",children:(0,r.jsx)(s.p,{children:"If the list is empty you do need to open a DLT log file and configure your filters there first."})}),"\n",(0,r.jsxs)(s.ol,{start:"6",children:["\n",(0,r.jsxs)(s.li,{children:["\n",(0,r.jsxs)(s.p,{children:["press the ",(0,r.jsx)(s.code,{children:"<"}),"button to move those filters to the ",(0,r.jsx)(s.strong,{children:"Selected filters:"})," list."]}),"\n"]}),"\n",(0,r.jsxs)(s.li,{children:["\n",(0,r.jsxs)(s.p,{children:["press ",(0,r.jsx)(s.strong,{children:"SAVE CHANGES"})]}),"\n"]}),"\n",(0,r.jsxs)(s.li,{children:["\n",(0,r.jsx)(s.p,{children:'specify the "jsonPath" expression to extract results. For the "number of messages" use-case the jsonPath expression is already prefilled. See (todo) for details.'}),"\n"]}),"\n",(0,r.jsxs)(s.li,{children:["\n",(0,r.jsx)(s.p,{children:"select whether you want to use"}),"\n",(0,r.jsxs)(s.ul,{children:["\n",(0,r.jsx)(s.li,{children:"number of array elements or"}),"\n",(0,r.jsx)(s.li,{children:"data from first element or"}),"\n",(0,r.jsx)(s.li,{children:"a javascript function"}),"\n"]}),"\n",(0,r.jsx)(s.p,{children:"to get the data out of the returned DLT-filter results."}),"\n"]}),"\n"]}),"\n",(0,r.jsx)(s.h3,{id:"manual-edit-of-dlt-query",children:"Manual edit of DLT query"}),"\n",(0,r.jsxs)(s.p,{children:["You can as well use the ",(0,r.jsx)(s.strong,{children:"EDIT MANUALLY"})," button to directly change the rest query performed.\nThe DLT-Logs rest query api supports the following commands:"]}),"\n",(0,r.jsxs)(s.table,{children:[(0,r.jsx)(s.thead,{children:(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.th,{children:"command name"}),(0,r.jsx)(s.th,{children:"description"})]})}),(0,r.jsxs)(s.tbody,{children:[(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"query"})}),(0,r.jsxs)(s.td,{children:["Used to apply a query for dlt messages. The expected parameter is an array of filter objects. For a filter object attributes see ",(0,r.jsx)(s.a,{href:"https://mbehr1.github.io/dlt-logs/docs/filterReference#filter-match-attributes",children:"filter reference"}),". Query should be used for all badges. If multiple filters are queried the ",(0,r.jsx)(s.a,{href:"https://mbehr1.github.io/dlt-logs/docs/filterReference/#when-is-a-dlt-message-shown-in-a-view",children:"usual rules"})," apply (e.g. positive filters are ",(0,r.jsx)(s.code,{children:"or"}),"'d) except that for no filter no messages are returned."]})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"sequences"})}),(0,r.jsxs)(s.td,{children:["Used to define and execute sequence detection. The expected parameter is an array of sequence objects. For Details see ",(0,r.jsx)(s.a,{href:"/docs/sequences",children:"sequences"}),"."]})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsxs)(s.td,{children:[(0,r.jsx)(s.code,{children:"disableAll"}),", ",(0,r.jsx)(s.code,{children:"enableAll"})]}),(0,r.jsxs)(s.td,{children:["Used to disable/enable all filters of a certain type. The expected parameter is any of ",(0,r.jsx)(s.code,{children:"view"})," (pos or neg), ",(0,r.jsx)(s.code,{children:"pos"})," (positive filters), ",(0,r.jsx)(s.code,{children:"neg"})," (neg. filters), ",(0,r.jsx)(s.code,{children:"marker"}),"(marker). Used only for ",(0,r.jsx)(s.a,{href:"/docs/interactive",children:"apply filter"})," button."]})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"report"})}),(0,r.jsxs)(s.td,{children:["Used to generate a report. The expected parameter is an array of filter objects. Used only for ",(0,r.jsx)(s.a,{href:"/docs/interactive",children:"apply filter"})," button."]})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"add"})}),(0,r.jsxs)(s.td,{children:['Used to add a filter. The expected parameter is a filter object. Those filters are not persisted. Hint: use e.g. an attribute like "tmpFb":1 to identify those filters easily for a later ',(0,r.jsx)(s.code,{children:"delete"}),"(see below). Used only for ",(0,r.jsx)(s.a,{href:"/docs/interactive",children:"apply filter"})," button."]})]}),(0,r.jsxs)(s.tr,{children:[(0,r.jsx)(s.td,{children:(0,r.jsx)(s.code,{children:"delete"})}),(0,r.jsxs)(s.td,{children:["Used to delete a filter. The expected parameter is an object with filter attributes. All matching filter will be deleted. The main use-case is to delete temporary filters that are added via ",(0,r.jsx)(s.code,{children:"add"}),". Used only for ",(0,r.jsx)(s.a,{href:"/docs/interactive",children:"apply filter"})," button."]})]})]})]}),"\n",(0,r.jsx)(s.h3,{id:"data-returned-from-a-dlt-logs-rest-query",children:"Data returned from a DLT-Logs rest query:"}),"\n",(0,r.jsx)(s.p,{children:"The returned data from a rest query is in general a JSON object."}),"\n",(0,r.jsxs)(s.p,{children:["For a query with DLT-filters it's typically in the form of an object with a key ",(0,r.jsx)(s.code,{children:"data"})," that is an array of messages like:"]}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-jsonc",metastring:"{2,5,6,11,17,18,23}",children:'{\n  "data": [\n    {\n        "id": 10,\n        "type": "msg",\n        "attributes": {\n            "timeStamp": 18283269,\n            "ecu": "ECU1",\n            "apid": "SYS",\n            "ctid": "CTI1",\n            "payloadString": "Example SYS CTI1 message payload...",\n            "lifecycle": 1585216860833.6\n        }\n    },\n    {\n        "id": 68,\n        "type": "msg",\n        "attributes": {\n            "timeStamp": 18304306,\n            "ecu": "ECU1",\n            "apid": "SYS",\n            "ctid": "CTI1",\n            "payloadString": "Another example SYS CTI1 message payload...",\n            "lifecycle": 1585216860833.6\n        },\n    }\n    // more msgs to follow\n    ]\n}\n'})}),"\n",(0,r.jsx)(s.h3,{id:"maximum-number-of-dlt-query-messages-returned-maxnrmsgs",children:"Maximum number of DLT query messages returned: maxNrMsgs"}),"\n",(0,r.jsxs)(s.p,{children:["By default a DLT-logs query returns a maximum of 1000 messages. In general this should be sufficient for the intended use-cases by using filters restricting the results. If you have use-cases where this is not sufficient you can increase the limit or even disable the limit by adding the ",(0,r.jsx)(s.code,{children:"maxNrMsgs"}),"attribute to any filter of the query. E.g."]}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-jsonc",metastring:"{4}",children:'/get/docs/0/filters?\nquery=[\n  {\n    "maxNrMsgs": 0, // 0 = unlimited, 1000 default\n    "type": 0,\n    "payload": "foo.*",\n    "ctid": "FOOD"\n  }\n]\n'})}),"\n",(0,r.jsx)(s.admonition,{type:"note",children:(0,r.jsxs)(s.p,{children:["If multiple filters specify ",(0,r.jsx)(s.code,{children:"maxNrMsgs"})," the maximum value is used (0 counted as highest number)."]})}),"\n",(0,r.jsx)(s.admonition,{type:"note",children:(0,r.jsx)(s.p,{children:"Please consider that this might impact heavily the processing time to calculate/update all badges. So please use sparingly where needed only."})}),"\n",(0,r.jsx)(s.h3,{id:"adding-lifecycle-info-to-the-dlt-query-results-addlifecycles",children:"Adding lifecycle info to the DLT query results: addLifecycles"}),"\n",(0,r.jsxs)(s.p,{children:["By default a DLT-logs query returns an array of DLT logs as shown in ",(0,r.jsx)(s.a,{href:"#data-returned-from-a-dlt-logs-rest-query",children:"Data returned"}),". Each log info contains a ",(0,r.jsx)(s.code,{children:"lifecycle"})," identifier as well that helps e.g. doing calculations like avg/min/max,... per lifecycle."]}),"\n",(0,r.jsxs)(s.p,{children:['To support more complex use-cases e.g. to calculate the time distance from a certain message towards the end of the lifecycle "occurred xx sec before end of LC" you can request the lifecycle details as well.\nTo do so simply add ',(0,r.jsx)(s.code,{children:"addLifecycles"})," to any filter of your query. E.g."]}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-jsonc",metastring:"{4}",children:'/get/docs/0/filters?\nquery=[\n  {\n    "addLifecycles": true, // defaults to false\n    "type": 0,\n    "payload": "foo.*",\n    "ctid": "FOOD"\n  }\n]\n'})}),"\n",(0,r.jsxs)(s.p,{children:["The example data returned will then consist of both type ",(0,r.jsx)(s.code,{children:"lifecycles"})," and type ",(0,r.jsx)(s.code,{children:"msg"})," objects:"]}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-jsonc",metastring:"{3,17,35}",children:'  "data": [\n    {\n      "type": "lifecycles",\n      "id": 1585240865939.6,\n      "attributes": {\n        "index": 1,\n        "id": 1585240865939.6,\n        "ecu": "ECU1",\n        "label": "3/26/2020, 5:41:05 PM-5:42:57 PM #10277",\n        "startTimeUtc": "Thu, 26 Mar 2020 16:41:05 GMT",\n        "endTimeUtc": "Thu, 26 Mar 2020 16:42:57 GMT",\n        "sws": [], // list of sw versions detected\n        "msgs": 10277 // nr of messages in this lifecycle (unfiltered)\n      }\n    },\n    {\n      "type": "lifecycles",\n      "id": 1585240984260.5,\n      "attributes": {\n        "index": 2,\n        "id": 1585240984260.5,\n        "ecu": "ECU1",\n        "label": "3/26/2020, 5:43:04 PM-5:46:25 PM #41519",\n        "startTimeUtc": "Thu, 26 Mar 2020 16:43:04 GMT",\n        "endTimeUtc": "Thu, 26 Mar 2020 16:46:25 GMT",\n        "sws": [\n          "ECU1 21w..." // sw version received.\n        ],\n        "msgs": 41519 // nr of messages in this lifecycles (unfiltered)\n      }\n    },\n    // ... more lifecycle infos\n    {\n      "id": 10485,\n      "type": "msg",\n      "attributes": {\n        "timeStamp": 63279, // relative timestamp in 0.1ms granularity to the lifecycle startTimeUtc. You can use Date(lifecycle.startTimeUtc).valueOf()+msg.timeStamp/10 to calculate the abs starttime in ms from UTC.\n        "ecu": "ECU1",\n        "apid": "DEAD",\n        "ctid": "FOOD",\n        "payloadString": "foo happened",\n        "lifecycle": 1585240984260.5 // this can be used as an identifier/lookup to the returned lifecycles.id\n      }\n    },\n    // ... more messages fitting to the filters.\n  ]\n'})}),"\n",(0,r.jsx)(s.admonition,{type:"note",children:(0,r.jsx)(s.p,{children:"The lifecycle infos are always the first objects in the results list and you can rely on the lifecycles being sorted by ecus first (if multiple ecus are present in the logs) then by time."})}),"\n",(0,r.jsx)(s.h3,{id:"json-path-details",children:"Json path details"}),"\n",(0,r.jsxs)(s.p,{children:["As a first step of processing the returned object can be processed with a ",(0,r.jsx)(s.a,{href:"https://goessner.net/articles/JsonPath/index.html",children:"json path"})," pre-processor."]}),"\n",(0,r.jsxs)(s.p,{children:["E.g. to get the ",(0,r.jsx)(s.code,{children:"data"})," array elements simply use:"]}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-json",children:"$.data[*]\n"})}),"\n",(0,r.jsx)(s.p,{children:"or if you're only interested in the attributes:"}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-json",children:"$.data[*].attributes\n"})}),"\n",(0,r.jsx)(s.admonition,{type:"warning",children:(0,r.jsxs)(s.p,{children:["Dont use this with the ",(0,r.jsx)(s.a,{href:"#adding-lifecycle-info-to-the-dlt-query-results-addlifecycles",children:"addLifecycles"})," feature. You'll loose the type info!"]})}),"\n",(0,r.jsxs)(s.p,{children:["or for the ",(0,r.jsx)(s.code,{children:"payloadString"}),":"]}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-json",children:"$.data[*].attributes.payloadString\n"})}),"\n",(0,r.jsx)(s.admonition,{type:"tip",children:(0,r.jsxs)(s.p,{children:["If you're not used to json path expressions there is a online evaluator available here ",(0,r.jsx)(s.a,{href:"https://jsonpath.com",children:"jsonpath"}),"."]})}),"\n",(0,r.jsx)(s.h3,{id:"javascript-function-details",children:"Javascript function details"}),"\n",(0,r.jsx)(s.p,{children:"If the the number of messages or the first element from the json path expression is not sufficient e.g. for use-cases like:"}),"\n",(0,r.jsxs)(s.ul,{children:["\n",(0,r.jsx)(s.li,{children:"calculate an average/min/max value"}),"\n",(0,r.jsx)(s.li,{children:"calculate the distinct set of values e.g. different SW versions"}),"\n",(0,r.jsx)(s.li,{children:"extract/shorten the result"}),"\n",(0,r.jsx)(s.li,{children:"find lifecycles where messages matching exactly one of multiple filters"}),"\n",(0,r.jsx)(s.li,{children:"..."}),"\n"]}),"\n",(0,r.jsx)(s.p,{children:"a user-provided javascript function body can be entered."}),"\n",(0,r.jsx)(s.p,{children:"The function prototype is in the form of:"}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-typescript",children:"function (result: object|any[] ):string|number|object {\n    <body text>\n}\n"})}),"\n",(0,r.jsx)(s.p,{children:"It's actually created, called and evalued internally with:"}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-javascript",children:"    const fn = new Function(\"result\", '<entered body text>');\n    const fnRes = fn(result); // call the function\n    switch (typeof fnRes) { // which type was returned:\n        case 'string': answer.convResult = fnRes; break;\n        case 'number': answer.convResult = fnRes; break;\n        case 'object': answer.convResult = JSON.stringify(fnRes); break;\n    ...\n"})}),"\n",(0,r.jsxs)(s.p,{children:["The result from the rest query or if provided from the json path processor is passed to the javascript function as ",(0,r.jsx)(s.code,{children:"result"})," parameter."]}),"\n",(0,r.jsx)(s.admonition,{type:"tip",children:(0,r.jsx)(s.p,{children:"You can use JSON5.parse(...) from inside the function body to parse e.g. JSON strings with comments or hex numbers."})}),"\n",(0,r.jsx)(s.h3,{id:"javascript-function-examples",children:"Javascript function examples"}),"\n",(0,r.jsx)(s.p,{children:"See here a few examples:"}),"\n",(0,r.jsxs)(s.ol,{children:["\n",(0,r.jsx)(s.li,{children:"provide from the first 3 results the substring from index 10 to 15 separated by ',':"}),"\n"]}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-javascript",children:"   return result.slice(0,3).map(r=>r.slice(10,15)).join(',');\n"})}),"\n",(0,r.jsxs)(s.ol,{start:"2",children:["\n",(0,r.jsx)(s.li,{children:"show 0 for number of message, i.e. convert to string as result:"}),"\n"]}),"\n",(0,r.jsx)(s.pre,{children:(0,r.jsx)(s.code,{className:"language-javascript",children:"    return result.length.toString();\n"})}),"\n",(0,r.jsx)(s.p,{children:"todo ... add more examples."}),"\n",(0,r.jsx)(s.h3,{id:"uri-de-encoder",children:"URI-De-/Encoder"}),"\n",(0,r.jsx)(s.p,{children:'As the communication from fishbone extension to DLT-Logs extension is via a rest-api alike "restQuery" the query gets transmitted and stored in a URI encoded format.'}),"\n",(0,r.jsxs)(s.p,{children:["To ease decoding and fast manual edits you can enter/modify the query below or use the ",(0,r.jsx)(s.strong,{children:"EDIT MANUALLY..."})," button:"]}),"\n",(0,r.jsx)(c.A,{fallback:(0,r.jsx)(j,{}),children:()=>(0,r.jsx)(j,{searchParams:new URL(document.location).searchParams})}),"\n",(0,r.jsx)(s.h2,{id:"badges-using-https-rest-queries",children:"Badges using https rest-queries"}),"\n",(0,r.jsx)(s.p,{children:"todo add example"})]})}function q(e={}){const{wrapper:s}={...(0,i.R)(),...e.components};return s?(0,r.jsx)(s,{...e,children:(0,r.jsx)(T,{...e})}):T(e)}}}]);