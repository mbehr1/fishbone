(self.webpackChunkfishbone=self.webpackChunkfishbone||[]).push([[781],{5283:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>b,frontMatter:()=>k,metadata:()=>N,toc:()=>v});var n=a(2122),s=a(7294),r=a(3905),i=a(5350);const l=({lightImageSrc:e,darkImageSrc:t})=>{const{isDarkTheme:a}=(0,i.Z)();return s.createElement("img",{src:a?t:e})};var o=a(4996),d=a(1262),c=a(1142),p=a.n(c),m=a(735),u=a.n(m);function h(e){try{const t=u().tokenize(e);let a="",n=!1,s="";for(const e of t){const t=0===s.length;switch(n&&"whitespace"!==e.type&&(n=!1),e.type){case"separator":switch(e.raw){case"{":case"}":t&&(s+="  ".repeat(e.stack.length)),s+=e.raw;break;case":":s+=e.raw,s+=" ",n=!0;break;default:s+=e.raw}break;case"newline":a+=s.trimEnd(),s="",a+="\n";break;case"literal":case"key":t&&(s+="  ".repeat(e.stack.length)),s+=e.raw;break;case"whitespace":t||n||(s+=e.raw);break;case"comment":s+=e.raw;break;default:console.error(`formatJson5: unknown token '${e.type}'`,e)}}return s.length>0&&(a+=s),a}catch(t){return console.error(`formatJson5: got error='${t}'`),e}}const f=e=>{if(!e||0===e.length)return"";let t="";const a=null==e?void 0:e.indexOf("?");if(a>0){t+=e.slice(0,a+1)+"\n";const n=e.slice(a+1).split("&");let s=0;for(const e of n){const a=e.indexOf("="),n=e.slice(0,a),r=decodeURIComponent(e.slice(a+1));s&&(t+=" &\n"),s++;try{p().parse(r),t+=n+"="+h(r)+"\n"}catch{r.includes("{")||r.includes("[")||r.includes('"')?t+=`\n<cannot parse: \n'${n}=${r}'\n as JSON5>`:t+=`${n}=${r}`}}}else t=e;return t};function g(e){var t,a;const[n,r]=(0,s.useState)(null!=e&&null!=(t=e.searchParams)&&t.get("q")?decodeURIComponent(null==e||null==(a=e.searchParams)?void 0:a.get("q")):"/get/docs/0/filters?query=%5B%5D"),[i,l]=(0,s.useState)(f("")),[o,d]=(0,s.useState)("");return(0,s.useEffect)((()=>{const e=f(n);e!==i&&l(e)}),[n]),(0,s.useEffect)((()=>{try{const[e,t]=(e=>{let t=!0,a="";const n=null==e?void 0:e.indexOf("?");if(n>0){a+=e.slice(0,n+1);const r=e.slice(n+1).split("&\n");let i=0;for(let e of r){e=e.replace(/^\s+|\s+$/g,"");const n=e.indexOf("=");if(i&&(a+="&"),i++,n>=0){const r=e.slice(0,n),i=e.slice(n+1);try{p().parse(i),a+=`${r}=${encodeURIComponent(h(i))}`}catch(s){if(i.includes("{")||i.includes("[")||i.includes('"')){const e=/at (\d+):(\d+)$/.exec(s);if(e){const t=e[1],n=e[2];a+=`&\n<${s}:\n${i.split(/\r?\n/)[t-1]}\n${n>0?"-".repeat(n-1)+"^":"^"}\n parsing JSON5 at \n'${r}=${i}'\n>`}else a+=`&\n<cannot parse: \n'${r}=${i}'\n as JSON5 due to '${s}'>`;t=!1}else a+=`${r}=${i}`}}else a+=`${e}`}}else a=e;return[t,a]})(i);t!==o&&d(t)}catch{}}),[i]),s.createElement("form",null,s.createElement("label",null,"DLT-Logs rest query (URI encoded):",s.createElement("br",null),s.createElement("textarea",{cols:80,rows:20,value:n,placeholder:"enter your dlt-logs rest query expression here",type:"text",name:"payloadRegex",onChange:e=>r(e.target.value)})),s.createElement("div",null),s.createElement("label",null,"DLT-Logs rest query (URI decoded, after & as command sep. a new line has to follow):",s.createElement("br",null),s.createElement("textarea",{cols:80,rows:30,type:"text",value:i,onChange:e=>l(e.target.value)})),s.createElement("div",null),s.createElement("label",null,"DLT-Logs rest query (URI re-encoded):",n!==o?" modified!":"",s.createElement("br",null),s.createElement("textarea",{readOnly:!0,cols:80,rows:20,type:"text",value:o})))}const k={id:"badges",title:"Badges",sidebar_label:"Badges"},N={unversionedId:"badges",id:"badges",isDocsHomePage:!1,title:"Badges",description:"Overview",source:"@site/docs/badges.md",sourceDirName:".",slug:"/badges",permalink:"/fishbone/docs/badges",editUrl:"https://github.com/mbehr1/fishbone/edit/master/docs/fishbone/docs/badges.md",version:"current",sidebar_label:"Badges",frontMatter:{id:"badges",title:"Badges",sidebar_label:"Badges"},sidebar:"fishboneSideBar",previous:{title:"Interactive diagrams",permalink:"/fishbone/docs/interactive"},next:{title:"Nested fishbone charts",permalink:"/fishbone/docs/nestedFishbones"}},v=[{value:"Overview",id:"overview",children:[]},{value:"Badges using DLT-Logs extensions",id:"badges-using-dlt-logs-extensions",children:[{value:"Manual edit of DLT query",id:"manual-edit-of-dlt-query",children:[]},{value:"Data returned from a DLT-Logs rest query:",id:"data-returned-from-a-dlt-logs-rest-query",children:[]},{value:"Maximum number of DLT query messages returned: maxNrMsgs",id:"maximum-number-of-dlt-query-messages-returned-maxnrmsgs",children:[]},{value:"Adding lifecycle info to the DLT query results: addLifecycles",id:"adding-lifecycle-info-to-the-dlt-query-results-addlifecycles",children:[]},{value:"Json path details",id:"json-path-details",children:[]},{value:"Javascript function details",id:"javascript-function-details",children:[]},{value:"Javascript function examples",id:"javascript-function-examples",children:[]},{value:"URI-De-/Encoder",id:"uri-de-encoder",children:[]}]},{value:"Badges using https rest-queries",id:"badges-using-https-rest-queries",children:[]}],y={toc:v};function b({components:e,...t}){return(0,r.kt)("wrapper",(0,n.Z)({},y,t,{components:e,mdxType:"MDXLayout"}),(0,r.kt)("h2",{id:"overview"},"Overview"),(0,r.kt)("p",null,"Badges are little indicators (similar like number of messages on mobile phone icons) providing a quick way to show data and capture your attention."),(0,r.kt)(l,{lightImageSrc:(0,o.Z)("/img/badge1_light.png"),darkImageSrc:(0,o.Z)("/img/badge1_dark.png"),mdxType:"ImageSwitcher"}),(0,r.kt)("p",null,"Example picture with root cause 1 with upper badge and root cause 2 with both upper and lower badge."),(0,r.kt)("p",null,"Each root-cause supports two badges:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"upper left badge. Shown in red color."),(0,r.kt)("li",{parentName:"ul"},"lower left badge. Shown in secondary color.")),(0,r.kt)("p",null,"Badges receive their info from currently two sources:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"DLT-Logs extension"),(0,r.kt)("li",{parentName:"ul"},"https rest-queries.")),(0,r.kt)("div",{className:"admonition admonition-note alert alert--secondary"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"The badges are only shown if the checkbox is unchecked or marked as error."))),(0,r.kt)("div",{className:"admonition admonition-info alert alert--info"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm1 3H6v5h2V4zm0 6H6v2h2v-2z"}))),"info")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"The upper badge is configured to not show if the returned value is the number 0 and is limited to 999. The lower badge will show the 0 and is limited to 99.\nIf you want to show it anyhow or show higher numbers see ",(0,r.kt)("a",{parentName:"p",href:"#javascript-function-examples"},"examples")," on how to convert to the string '0'."))),(0,r.kt)("div",{className:"admonition admonition-note alert alert--secondary"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"The text from badges is truncated to max 40 chars. A tooltip is available showing the full text."))),(0,r.kt)("h2",{id:"badges-using-dlt-logs-extensions"},"Badges using DLT-Logs extensions"),(0,r.kt)("p",null,"With DLT-Logs extension the following use-cases are supported:"),(0,r.kt)("p",null,"Show information in any of the badges: "),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"based on number of messages matching a set of DLT-filters on the currently opened DLT-file"),(0,r.kt)("li",{parentName:"ul"},"based on message attributes usually from the first message filtered"),(0,r.kt)("li",{parentName:"ul"},"based on applying a user-defined Javascript on the messages returned from a query of a set of DLT-filters.")),(0,r.kt)("p",null,"To use a badge perform the following steps:"),(0,r.kt)("ol",null,(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},(0,r.kt)("strong",{parentName:"p"},"edit")," a root-cause (press the small pen icon on a root cause in the fishbone or click on the text of the root cause)")),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"press the ",(0,r.kt)("strong",{parentName:"p"},"edit upper left badge")," or *lower right badge** button")),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"select the ",(0,r.kt)("strong",{parentName:"p"},"extension dlt-logs rest query")," button")),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"press the ",(0,r.kt)("strong",{parentName:"p"},"OPEN DLT FILTER ASSISTANT...")," button")),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"select the filters you want to use on the right hand side ",(0,r.kt)("strong",{parentName:"p"},"All available filters:"),"."),(0,r.kt)("div",{parentName:"li",className:"admonition admonition-note alert alert--secondary"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"If the list is empty you do need to open a DLT log file and configure your filters there first.")))),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"press the ",(0,r.kt)("inlineCode",{parentName:"p"},"<"),"button to move those filters to the ",(0,r.kt)("strong",{parentName:"p"},"Selected filters:")," list.")),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"press ",(0,r.kt)("strong",{parentName:"p"},"SAVE CHANGES"))),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},'specify the "jsonPath" expression to extract results. For the "number of messages" use-case the jsonPath expression is already prefilled. See (todo) for details.')),(0,r.kt)("li",{parentName:"ol"},(0,r.kt)("p",{parentName:"li"},"select whether you want to use "),(0,r.kt)("ul",{parentName:"li"},(0,r.kt)("li",{parentName:"ul"},"number of array elements or"),(0,r.kt)("li",{parentName:"ul"},"data from first element or "),(0,r.kt)("li",{parentName:"ul"},"a javascript function")),(0,r.kt)("p",{parentName:"li"},"to get the data out of the returned DLT-filter results."))),(0,r.kt)("h3",{id:"manual-edit-of-dlt-query"},"Manual edit of DLT query"),(0,r.kt)("p",null,"You can as well use the ",(0,r.kt)("strong",{parentName:"p"},"EDIT MANUALLY")," button to directly change the rest query performed.\nThe DLT-Logs rest query api supports the following commands:"),(0,r.kt)("table",null,(0,r.kt)("thead",{parentName:"table"},(0,r.kt)("tr",{parentName:"thead"},(0,r.kt)("th",{parentName:"tr",align:null},"command name"),(0,r.kt)("th",{parentName:"tr",align:null},"description"))),(0,r.kt)("tbody",{parentName:"table"},(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"query")),(0,r.kt)("td",{parentName:"tr",align:null},"Used to apply a query for dlt messages. The expected parameter is an array of filter objects. For a filter object attributes see ",(0,r.kt)("a",{parentName:"td",href:"https://mbehr1.github.io/dlt-logs/docs/filterReference#filter-match-attributes"},"filter reference"),". Query should be used for all badges. If multiple filters are queried the ",(0,r.kt)("a",{parentName:"td",href:"https://mbehr1.github.io/dlt-logs/docs/filterReference/#when-is-a-dlt-message-shown-in-a-view"},"usual rules")," apply (e.g. positive filters are ",(0,r.kt)("inlineCode",{parentName:"td"},"or"),"'d) except that for no filter no messages are returned.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"disableAll"),", ",(0,r.kt)("inlineCode",{parentName:"td"},"enableAll")),(0,r.kt)("td",{parentName:"tr",align:null},"Used to disable/enable all filters of a certain type. The expected parameter is any of ",(0,r.kt)("inlineCode",{parentName:"td"},"view")," (pos or neg), ",(0,r.kt)("inlineCode",{parentName:"td"},"pos")," (positive filters), ",(0,r.kt)("inlineCode",{parentName:"td"},"neg")," (neg. filters), ",(0,r.kt)("inlineCode",{parentName:"td"},"marker"),"(marker). Used only for ",(0,r.kt)("a",{parentName:"td",href:"/docs/interactive"},"apply filter")," button.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"report")),(0,r.kt)("td",{parentName:"tr",align:null},"Used to generate a report. The expected parameter is an array of filter objects. Used only for ",(0,r.kt)("a",{parentName:"td",href:"/docs/interactive"},"apply filter")," button.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"add")),(0,r.kt)("td",{parentName:"tr",align:null},'Used to add a filter. The expected parameter is a filter object. Those filters are not persisted. Hint: use e.g. an attribute like "tmpFb":1 to identify those filters easily for a later ',(0,r.kt)("inlineCode",{parentName:"td"},"delete"),"(see below). Used only for ",(0,r.kt)("a",{parentName:"td",href:"/docs/interactive"},"apply filter")," button.")),(0,r.kt)("tr",{parentName:"tbody"},(0,r.kt)("td",{parentName:"tr",align:null},(0,r.kt)("inlineCode",{parentName:"td"},"delete")),(0,r.kt)("td",{parentName:"tr",align:null},"Used to delete a filter. The expected parameter is an object with filter attributes. All matching filter will be deleted. The main use-case is to delete temporary filters that are added via ",(0,r.kt)("inlineCode",{parentName:"td"},"add"),". Used only for ",(0,r.kt)("a",{parentName:"td",href:"/docs/interactive"},"apply filter")," button.")))),(0,r.kt)("h3",{id:"data-returned-from-a-dlt-logs-rest-query"},"Data returned from a DLT-Logs rest query:"),(0,r.kt)("p",null,"The returned data from a rest query is in general a JSON object. "),(0,r.kt)("p",null,"For a query with DLT-filters it's typically in the form of an object with a key ",(0,r.kt)("inlineCode",{parentName:"p"},"data")," that is an array of messages like:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-jsonc",metastring:"{2,5,6,11,17,18,23}","{2,5,6,11,17,18,23}":!0},'{\n  "data": [\n    {\n        "id": 10,\n        "type": "msg",\n        "attributes": {\n            "timeStamp": 18283269,\n            "ecu": "ECU1",\n            "apid": "SYS",\n            "ctid": "CTI1",\n            "payloadString": "Example SYS CTI1 message payload...",\n            "lifecycle": 1585216860833.6\n        }\n    },\n    {\n        "id": 68,\n        "type": "msg",\n        "attributes": {\n            "timeStamp": 18304306,\n            "ecu": "ECU1",\n            "apid": "SYS",\n            "ctid": "CTI1",\n            "payloadString": "Another example SYS CTI1 message payload...",\n            "lifecycle": 1585216860833.6\n        },\n    }\n    // more msgs to follow\n    ]\n}\n')),(0,r.kt)("h3",{id:"maximum-number-of-dlt-query-messages-returned-maxnrmsgs"},"Maximum number of DLT query messages returned: maxNrMsgs"),(0,r.kt)("p",null,"By default a DLT-logs query returns a maximum of 1000 messages. In general this should be sufficient for the intended use-cases by using filters restricting the results. If you have use-cases where this is not sufficient you can increase the limit or even disable the limit by adding the ",(0,r.kt)("inlineCode",{parentName:"p"},"maxNrMsgs"),"attribute to any filter of the query. E.g."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-jsonc",metastring:"{4}","{4}":!0},'/get/docs/0/filters?\nquery=[\n  {\n    "maxNrMsgs": 0, // 0 = unlimited, 1000 default\n    "type": 0,\n    "payload": "foo.*",\n    "ctid": "FOOD"\n  }\n]\n')),(0,r.kt)("div",{className:"admonition admonition-note alert alert--secondary"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"If multiple filters specify ",(0,r.kt)("inlineCode",{parentName:"p"},"maxNrMsgs")," the maximum value is used (0 counted as highest number)."))),(0,r.kt)("div",{className:"admonition admonition-note alert alert--secondary"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"Please consider that this might impact heavily the processing time to calculate/update all badges. So please use sparingly where needed only."))),(0,r.kt)("h3",{id:"adding-lifecycle-info-to-the-dlt-query-results-addlifecycles"},"Adding lifecycle info to the DLT query results: addLifecycles"),(0,r.kt)("p",null,"By default a DLT-logs query returns an array of DLT logs as shown in ",(0,r.kt)("a",{parentName:"p",href:"#data-returned-from-a-dlt-logs-rest-query"},"Data returned"),". Each log info contains a ",(0,r.kt)("inlineCode",{parentName:"p"},"lifecycle")," identifier as well that helps e.g. doing calculations like avg/min/max,... per lifecycle."),(0,r.kt)("p",null,'To support more complex use-cases e.g. to calculate the time distance from a certain message towards the end of the lifecycle "occurred xx sec before end of LC" you can request the lifecycle details as well.\nTo do so simply add ',(0,r.kt)("inlineCode",{parentName:"p"},"addLifecycles")," to any filter of your query. E.g."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-jsonc",metastring:"{4}","{4}":!0},'/get/docs/0/filters?\nquery=[\n  {\n    "addLifecycles": true, // defaults to false\n    "type": 0,\n    "payload": "foo.*",\n    "ctid": "FOOD"\n  }\n]\n')),(0,r.kt)("p",null,"The example data returned will then consist of both type ",(0,r.kt)("inlineCode",{parentName:"p"},"lifecycles")," and type ",(0,r.kt)("inlineCode",{parentName:"p"},"msg")," objects:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-jsonc",metastring:"{3,17,35}","{3,17,35}":!0},'  "data": [\n    {\n      "type": "lifecycles",\n      "id": 1585240865939.6,\n      "attributes": {\n        "index": 1,\n        "id": 1585240865939.6,\n        "ecu": "ECU1",\n        "label": "3/26/2020, 5:41:05 PM-5:42:57 PM #10277",\n        "startTimeUtc": "Thu, 26 Mar 2020 16:41:05 GMT",\n        "endTimeUtc": "Thu, 26 Mar 2020 16:42:57 GMT",\n        "sws": [], // list of sw versions detected\n        "msgs": 10277 // nr of messages in this lifecycle (unfiltered)\n      }\n    },\n    {\n      "type": "lifecycles",\n      "id": 1585240984260.5,\n      "attributes": {\n        "index": 2,\n        "id": 1585240984260.5,\n        "ecu": "ECU1",\n        "label": "3/26/2020, 5:43:04 PM-5:46:25 PM #41519",\n        "startTimeUtc": "Thu, 26 Mar 2020 16:43:04 GMT",\n        "endTimeUtc": "Thu, 26 Mar 2020 16:46:25 GMT",\n        "sws": [\n          "ECU1 21w..." // sw version received.\n        ],\n        "msgs": 41519 // nr of messages in this lifecycles (unfiltered)\n      }\n    },\n    // ... more lifecycle infos\n    {\n      "id": 10485,\n      "type": "msg",\n      "attributes": {\n        "timeStamp": 63279, // relative timestamp in 0.1ms granularity to the lifecycle startTimeUtc. You can use Date(lifecycle.startTimeUtc).valueOf()+msg.timeStamp/10 to calculate the abs starttime in ms from UTC.\n        "ecu": "ECU1",\n        "apid": "DEAD",\n        "ctid": "FOOD",\n        "payloadString": "foo happened",\n        "lifecycle": 1585240984260.5 // this can be used as an identifier/lookup to the returned lifecycles.id\n      }\n    },\n    // ... more messages fitting to the filters.\n  ]\n')),(0,r.kt)("div",{className:"admonition admonition-note alert alert--secondary"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"14",height:"16",viewBox:"0 0 14 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"}))),"note")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"The lifecycle infos are always the first objects in the results list and you can rely on the lifecycles being sorted by ecus first (if multiple ecus are present in the logs) then by time."))),(0,r.kt)("h3",{id:"json-path-details"},"Json path details"),(0,r.kt)("p",null,"As a first step of processing the returned object can be processed with a ",(0,r.kt)("a",{parentName:"p",href:"https://goessner.net/articles/JsonPath/index.html"},"json path")," pre-processor."),(0,r.kt)("p",null,"E.g. to get the ",(0,r.kt)("inlineCode",{parentName:"p"},"data")," array elements simply use:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-json"},"$.data[*]\n")),(0,r.kt)("p",null,"or if you're only interested in the attributes:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-json"},"$.data[*].attributes\n")),(0,r.kt)("div",{className:"admonition admonition-warning alert alert--danger"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"12",height:"16",viewBox:"0 0 12 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M5.05.31c.81 2.17.41 3.38-.52 4.31C3.55 5.67 1.98 6.45.9 7.98c-1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-.3-6.61-.61 2.03.53 3.33 1.94 2.86 1.39-.47 2.3.53 2.27 1.67-.02.78-.31 1.44-1.13 1.81 3.42-.59 4.78-3.42 4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52.13-2.03 1.13-1.89 2.75.09 1.08-1.02 1.8-1.86 1.33-.67-.41-.66-1.19-.06-1.78C8.18 5.31 8.68 2.45 5.05.32L5.03.3l.02.01z"}))),"warning")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"Dont use this with the ",(0,r.kt)("a",{parentName:"p",href:"#adding-lifecycle-info-to-the-dlt-query-results-addlifecycles"},"addLifecycles")," feature. You'll loose the type info!"))),(0,r.kt)("p",null,"or for the ",(0,r.kt)("inlineCode",{parentName:"p"},"payloadString"),":"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-json"},"$.data[*].attributes.payloadString\n")),(0,r.kt)("div",{className:"admonition admonition-tip alert alert--success"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"12",height:"16",viewBox:"0 0 12 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.5 0C3.48 0 1 2.19 1 5c0 .92.55 2.25 1 3 1.34 2.25 1.78 2.78 2 4v1h5v-1c.22-1.22.66-1.75 2-4 .45-.75 1-2.08 1-3 0-2.81-2.48-5-5.5-5zm3.64 7.48c-.25.44-.47.8-.67 1.11-.86 1.41-1.25 2.06-1.45 3.23-.02.05-.02.11-.02.17H5c0-.06 0-.13-.02-.17-.2-1.17-.59-1.83-1.45-3.23-.2-.31-.42-.67-.67-1.11C2.44 6.78 2 5.65 2 5c0-2.2 2.02-4 4.5-4 1.22 0 2.36.42 3.22 1.19C10.55 2.94 11 3.94 11 5c0 .66-.44 1.78-.86 2.48zM4 14h5c-.23 1.14-1.3 2-2.5 2s-2.27-.86-2.5-2z"}))),"tip")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"If you're not used to json path expressions there is a online evaluator available here ",(0,r.kt)("a",{parentName:"p",href:"https://jsonpath.com"},"jsonpath"),"."))),(0,r.kt)("h3",{id:"javascript-function-details"},"Javascript function details"),(0,r.kt)("p",null,"If the the number of messages or the first element from the json path expression is not sufficient e.g. for use-cases like:"),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},"calculate an average/min/max value"),(0,r.kt)("li",{parentName:"ul"},"calculate the distinct set of values e.g. different SW versions"),(0,r.kt)("li",{parentName:"ul"},"extract/shorten the result"),(0,r.kt)("li",{parentName:"ul"},"find lifecycles where messages matching exactly one of multiple filters"),(0,r.kt)("li",{parentName:"ul"},"...")),(0,r.kt)("p",null,"a user-provided javascript function body can be entered."),(0,r.kt)("p",null,"The function prototype is in the form of:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-typescript"},"function (result: object|any[] ):string|number|object {\n    <body text>\n}\n")),(0,r.kt)("p",null,"It's actually created, called and evalued internally with:"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"    const fn = new Function(\"result\", '<entered body text>');\n    const fnRes = fn(result); // call the function\n    switch (typeof fnRes) { // which type was returned:\n        case 'string': answer.convResult = fnRes; break;\n        case 'number': answer.convResult = fnRes; break;\n        case 'object': answer.convResult = JSON.stringify(fnRes); break;\n    ...\n")),(0,r.kt)("p",null,"The result from the rest query or if provided from the json path processor is passed to the javascript function as ",(0,r.kt)("inlineCode",{parentName:"p"},"result")," parameter."),(0,r.kt)("div",{className:"admonition admonition-tip alert alert--success"},(0,r.kt)("div",{parentName:"div",className:"admonition-heading"},(0,r.kt)("h5",{parentName:"div"},(0,r.kt)("span",{parentName:"h5",className:"admonition-icon"},(0,r.kt)("svg",{parentName:"span",xmlns:"http://www.w3.org/2000/svg",width:"12",height:"16",viewBox:"0 0 12 16"},(0,r.kt)("path",{parentName:"svg",fillRule:"evenodd",d:"M6.5 0C3.48 0 1 2.19 1 5c0 .92.55 2.25 1 3 1.34 2.25 1.78 2.78 2 4v1h5v-1c.22-1.22.66-1.75 2-4 .45-.75 1-2.08 1-3 0-2.81-2.48-5-5.5-5zm3.64 7.48c-.25.44-.47.8-.67 1.11-.86 1.41-1.25 2.06-1.45 3.23-.02.05-.02.11-.02.17H5c0-.06 0-.13-.02-.17-.2-1.17-.59-1.83-1.45-3.23-.2-.31-.42-.67-.67-1.11C2.44 6.78 2 5.65 2 5c0-2.2 2.02-4 4.5-4 1.22 0 2.36.42 3.22 1.19C10.55 2.94 11 3.94 11 5c0 .66-.44 1.78-.86 2.48zM4 14h5c-.23 1.14-1.3 2-2.5 2s-2.27-.86-2.5-2z"}))),"tip")),(0,r.kt)("div",{parentName:"div",className:"admonition-content"},(0,r.kt)("p",{parentName:"div"},"You can use JSON5.parse(...) from inside the function body to parse e.g. JSON strings with comments or hex numbers. "))),(0,r.kt)("h3",{id:"javascript-function-examples"},"Javascript function examples"),(0,r.kt)("p",null,"See here a few examples:"),(0,r.kt)("ol",null,(0,r.kt)("li",{parentName:"ol"},"provide from the first 3 results the substring from index 10 to 15 separated by ',':")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"   return result.slice(0,3).map(r=>r.slice(10,15)).join(',');\n")),(0,r.kt)("ol",{start:2},(0,r.kt)("li",{parentName:"ol"},"show 0 for number of message, i.e. convert to string as result:")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-javascript"},"    return result.length.toString();\n")),(0,r.kt)("p",null,"todo ... add more examples."),(0,r.kt)("h3",{id:"uri-de-encoder"},"URI-De-/Encoder"),(0,r.kt)("p",null,'As the communication from fishbone extension to DLT-Logs extension is via a rest-api alike "restQuery" the query gets transmitted and stored in a URI encoded format.'),(0,r.kt)("p",null,"To ease decoding and fast manual edits you can enter/modify the query below or use the ",(0,r.kt)("strong",{parentName:"p"},"EDIT MANUALLY...")," button:"),(0,r.kt)(d.Z,{fallback:(0,r.kt)(g,{mdxType:"UriEnDecode"}),mdxType:"BrowserOnly"},(()=>(0,r.kt)(g,{searchParams:new URL(document.location).searchParams,mdxType:"UriEnDecode"}))),(0,r.kt)("h2",{id:"badges-using-https-rest-queries"},"Badges using https rest-queries"),(0,r.kt)("p",null,"todo add example"))}b.isMDXComponent=!0},5357:e=>{function t(e){var t=new Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}t.keys=()=>[],t.resolve=t,t.id=5357,e.exports=t}}]);