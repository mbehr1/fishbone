(self.webpackChunkfishbone=self.webpackChunkfishbone||[]).push([[103],{3146:(e,t,a)=>{"use strict";a.d(t,{Z:()=>u});var n=a(7294),l=a(6010),r=a(3905),s=a(4973),i=a(6742),o=a(3541),c=a(1217);const m="blogPostTitle_GeHD",d="blogPostDate_fNvV";var g=a(6700);const u=function(e){const t=function(){const{selectMessage:e}=(0,g.c2)();return t=>{const a=Math.ceil(t);return e(a,(0,s.I)({id:"theme.blog.post.readingTime.plurals",description:'Pluralized label for "{readingTime} min read". Use as much plural forms (separated by "|") as your language support (see https://www.unicode.org/cldr/cldr-aux/charts/34/supplemental/language_plural_rules.html)',message:"One min read|{readingTime} min read"},{readingTime:a}))}}(),{children:a,frontMatter:u,metadata:p,truncated:E,isBlogPostPage:v=!1}=e,{date:h,formattedDate:b,permalink:_,tags:f,readingTime:N}=p,{author:k,title:Z,image:T,keywords:w}=u,I=u.author_url||u.authorURL,L=u.author_title||u.authorTitle,x=u.author_image_url||u.authorImageURL;return n.createElement(n.Fragment,null,n.createElement(c.Z,{keywords:w,image:T}),n.createElement("article",{className:v?void 0:"margin-bottom--xl"},(()=>{const e=v?"h1":"h2";return n.createElement("header",null,n.createElement(e,{className:(0,l.Z)("margin-bottom--sm",m)},v?Z:n.createElement(i.Z,{to:_},Z)),n.createElement("div",{className:"margin-vert--md"},n.createElement("time",{dateTime:h,className:d},b,N&&n.createElement(n.Fragment,null," \xb7 ",t(N)))),n.createElement("div",{className:"avatar margin-vert--md"},x&&n.createElement(i.Z,{className:"avatar__photo-link avatar__photo",href:I},n.createElement("img",{src:x,alt:k})),n.createElement("div",{className:"avatar__intro"},k&&n.createElement(n.Fragment,null,n.createElement("h4",{className:"avatar__name"},n.createElement(i.Z,{href:I},k)),n.createElement("small",{className:"avatar__subtitle"},L)))))})(),n.createElement("div",{className:"markdown"},n.createElement(r.Zo,{components:o.Z},a)),(f.length>0||E)&&n.createElement("footer",{className:"row margin-vert--lg"},f.length>0&&n.createElement("div",{className:"col"},n.createElement("strong",null,n.createElement(s.Z,{id:"theme.tags.tagsListLabel",description:"The label alongside a tag list"},"Tags:")),f.map((({label:e,permalink:t})=>n.createElement(i.Z,{key:t,className:"margin-horiz--sm",to:t},e)))),E&&n.createElement("div",{className:"col text--right"},n.createElement(i.Z,{to:p.permalink,"aria-label":`Read more about ${Z}`},n.createElement("strong",null,n.createElement(s.Z,{id:"theme.blog.post.readMore",description:"The label used in blog post item excerpts to link to full blog posts"},"Read More")))))))}},4147:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>u});var n=a(7294),l=a(1952),r=a(3146),s=a(4973),i=a(6742);const o=function(e){const{nextItem:t,prevItem:a}=e;return n.createElement("nav",{className:"pagination-nav","aria-label":(0,s.I)({id:"theme.blog.post.paginator.navAriaLabel",message:"Blog post page navigation",description:"The ARIA label for the blog posts pagination"})},n.createElement("div",{className:"pagination-nav__item"},a&&n.createElement(i.Z,{className:"pagination-nav__link",to:a.permalink},n.createElement("div",{className:"pagination-nav__sublabel"},n.createElement(s.Z,{id:"theme.blog.post.paginator.newerPost",description:"The blog post button label to navigate to the newer/previous post"},"Newer Post")),n.createElement("div",{className:"pagination-nav__label"},"\xab ",a.title))),n.createElement("div",{className:"pagination-nav__item pagination-nav__item--next"},t&&n.createElement(i.Z,{className:"pagination-nav__link",to:t.permalink},n.createElement("div",{className:"pagination-nav__sublabel"},n.createElement(s.Z,{id:"theme.blog.post.paginator.olderPost",description:"The blog post button label to navigate to the older/next post"},"Older Post")),n.createElement("div",{className:"pagination-nav__label"},t.title," \xbb"))))};var c=a(5601),m=a(571),d=a(6146),g=a(6700);const u=function(e){const{content:t,sidebar:a}=e,{frontMatter:s,metadata:i}=t,{title:u,description:p,nextItem:E,prevItem:v,editUrl:h}=i,{hide_table_of_contents:b}=s;return n.createElement(l.Z,{title:u,description:p,wrapperClassName:g.kM.wrapper.blogPages,pageClassName:g.kM.page.blogPostPage},t&&n.createElement("div",{className:"container margin-vert--lg"},n.createElement("div",{className:"row"},n.createElement("div",{className:"col col--3"},n.createElement(c.Z,{sidebar:a})),n.createElement("main",{className:"col col--7"},n.createElement(r.Z,{frontMatter:s,metadata:i,isBlogPostPage:!0},n.createElement(t,null)),n.createElement("div",null,h&&n.createElement(d.Z,{editUrl:h})),(E||v)&&n.createElement("div",{className:"margin-vert--xl"},n.createElement(o,{nextItem:E,prevItem:v}))),!b&&t.toc&&n.createElement("div",{className:"col col--2"},n.createElement(m.Z,{toc:t.toc})))))}},5601:(e,t,a)=>{"use strict";a.d(t,{Z:()=>g});var n=a(7294),l=a(6010),r=a(6742);const s="sidebar_2ahu",i="sidebarItemTitle_2hhb",o="sidebarItemList_2xAf",c="sidebarItem_2UVv",m="sidebarItemLink_1RT6",d="sidebarItemLinkActive_12pM";function g({sidebar:e}){return 0===e.items.length?null:n.createElement("div",{className:(0,l.Z)(s,"thin-scrollbar")},n.createElement("h3",{className:i},e.title),n.createElement("ul",{className:o},e.items.map((e=>n.createElement("li",{key:e.permalink,className:c},n.createElement(r.Z,{isNavLink:!0,to:e.permalink,className:m,activeClassName:d},e.title))))))}},6146:(e,t,a)=>{"use strict";a.d(t,{Z:()=>c});var n=a(7294),l=a(4973),r=a(2122),s=a(6010);const i="iconEdit_2_ui",o=({className:e,...t})=>n.createElement("svg",(0,r.Z)({fill:"currentColor",height:"1.2em",width:"1.2em",preserveAspectRatio:"xMidYMid meet",role:"img",viewBox:"0 0 40 40",className:(0,s.Z)(i,e),"aria-label":"Edit page"},t),n.createElement("g",null,n.createElement("path",{d:"m34.5 11.7l-3 3.1-6.3-6.3 3.1-3q0.5-0.5 1.2-0.5t1.1 0.5l3.9 3.9q0.5 0.4 0.5 1.1t-0.5 1.2z m-29.5 17.1l18.4-18.5 6.3 6.3-18.4 18.4h-6.3v-6.2z"})));function c({editUrl:e}){return n.createElement("a",{href:e,target:"_blank",rel:"noreferrer noopener"},n.createElement(o,null),n.createElement(l.Z,{id:"theme.common.editThisPage",description:"The link label to edit the current page"},"Edit this page"))}},571:(e,t,a)=>{"use strict";a.d(t,{Z:()=>c});var n=a(7294),l=a(6010);const r=function(e,t,a){const[l,r]=(0,n.useState)(void 0);(0,n.useEffect)((()=>{function n(){const n=function(){const e=Array.from(document.getElementsByClassName("anchor")),t=e.find((e=>{const{top:t}=e.getBoundingClientRect();return t>=a}));if(t){if(t.getBoundingClientRect().top>=a){return e[e.indexOf(t)-1]??t}return t}return e[e.length-1]}();if(n){let a=0,s=!1;const i=document.getElementsByClassName(e);for(;a<i.length&&!s;){const e=i[a],{href:o}=e,c=decodeURIComponent(o.substring(o.indexOf("#")+1));n.id===c&&(l&&l.classList.remove(t),e.classList.add(t),r(e),s=!0),a+=1}}}return document.addEventListener("scroll",n),document.addEventListener("resize",n),n(),()=>{document.removeEventListener("scroll",n),document.removeEventListener("resize",n)}}))},s="tableOfContents_35-E",i="table-of-contents__link";function o({toc:e,isChild:t}){return e.length?n.createElement("ul",{className:t?"":"table-of-contents table-of-contents__left-border"},e.map((e=>n.createElement("li",{key:e.id},n.createElement("a",{href:`#${e.id}`,className:i,dangerouslySetInnerHTML:{__html:e.value}}),n.createElement(o,{isChild:!0,toc:e.children}))))):null}const c=function({toc:e}){return r(i,"table-of-contents__link--active",100),n.createElement("div",{className:(0,l.Z)(s,"thin-scrollbar")},n.createElement(o,{toc:e}))}}}]);