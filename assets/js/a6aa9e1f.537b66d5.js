(self.webpackChunkfishbone=self.webpackChunkfishbone||[]).push([[89],{4428:(e,a,t)=>{"use strict";t.r(a),t.d(a,{default:()=>d});var l=t(7294),r=t(2263),n=t(1952),s=t(3146),i=t(6742),m=t(4973);const o=function(e){const{metadata:a}=e,{previousPage:t,nextPage:r}=a;return l.createElement("nav",{className:"pagination-nav","aria-label":(0,m.I)({id:"theme.blog.paginator.navAriaLabel",message:"Blog list page navigation",description:"The ARIA label for the blog pagination"})},l.createElement("div",{className:"pagination-nav__item"},t&&l.createElement(i.Z,{className:"pagination-nav__link",to:t},l.createElement("div",{className:"pagination-nav__label"},"\xab"," ",l.createElement(m.Z,{id:"theme.blog.paginator.newerEntries",description:"The label used to navigate to the newer blog posts page (previous page)"},"Newer Entries")))),l.createElement("div",{className:"pagination-nav__item pagination-nav__item--next"},r&&l.createElement(i.Z,{className:"pagination-nav__link",to:r},l.createElement("div",{className:"pagination-nav__label"},l.createElement(m.Z,{id:"theme.blog.paginator.olderEntries",description:"The label used to navigate to the older blog posts page (next page)"},"Older Entries")," ","\xbb"))))};var c=t(5601),g=t(6700);const d=function(e){const{metadata:a,items:t,sidebar:i}=e,{siteConfig:{title:m}}=(0,r.default)(),{blogDescription:d,blogTitle:p,permalink:u}=a,E="/"===u?m:p;return l.createElement(n.Z,{title:E,description:d,wrapperClassName:g.kM.wrapper.blogPages,pageClassName:g.kM.page.blogListPage,searchMetadatas:{tag:"blog_posts_list"}},l.createElement("div",{className:"container margin-vert--lg"},l.createElement("div",{className:"row"},l.createElement("div",{className:"col col--3"},l.createElement(c.Z,{sidebar:i})),l.createElement("main",{className:"col col--7"},t.map((({content:e})=>l.createElement(s.Z,{key:e.metadata.permalink,frontMatter:e.frontMatter,metadata:e.metadata,truncated:e.metadata.truncated},l.createElement(e,null)))),l.createElement(o,{metadata:a})))))}},3146:(e,a,t)=>{"use strict";t.d(a,{Z:()=>p});var l=t(7294),r=t(6010),n=t(3905),s=t(4973),i=t(6742),m=t(3541),o=t(1217);const c="blogPostTitle_GeHD",g="blogPostDate_fNvV";var d=t(6700);const p=function(e){const a=function(){const{selectMessage:e}=(0,d.c2)();return a=>{const t=Math.ceil(a);return e(t,(0,s.I)({id:"theme.blog.post.readingTime.plurals",description:'Pluralized label for "{readingTime} min read". Use as much plural forms (separated by "|") as your language support (see https://www.unicode.org/cldr/cldr-aux/charts/34/supplemental/language_plural_rules.html)',message:"One min read|{readingTime} min read"},{readingTime:t}))}}(),{children:t,frontMatter:p,metadata:u,truncated:E,isBlogPostPage:h=!1}=e,{date:b,formattedDate:v,permalink:_,tags:N,readingTime:k}=u,{author:f,title:Z,image:T,keywords:w}=p,M=p.author_url||p.authorURL,L=p.author_title||p.authorTitle,I=p.author_image_url||p.authorImageURL;return l.createElement(l.Fragment,null,l.createElement(o.Z,{keywords:w,image:T}),l.createElement("article",{className:h?void 0:"margin-bottom--xl"},(()=>{const e=h?"h1":"h2";return l.createElement("header",null,l.createElement(e,{className:(0,r.Z)("margin-bottom--sm",c)},h?Z:l.createElement(i.Z,{to:_},Z)),l.createElement("div",{className:"margin-vert--md"},l.createElement("time",{dateTime:b,className:g},v,k&&l.createElement(l.Fragment,null," \xb7 ",a(k)))),l.createElement("div",{className:"avatar margin-vert--md"},I&&l.createElement(i.Z,{className:"avatar__photo-link avatar__photo",href:M},l.createElement("img",{src:I,alt:f})),l.createElement("div",{className:"avatar__intro"},f&&l.createElement(l.Fragment,null,l.createElement("h4",{className:"avatar__name"},l.createElement(i.Z,{href:M},f)),l.createElement("small",{className:"avatar__subtitle"},L)))))})(),l.createElement("div",{className:"markdown"},l.createElement(n.Zo,{components:m.Z},t)),(N.length>0||E)&&l.createElement("footer",{className:"row margin-vert--lg"},N.length>0&&l.createElement("div",{className:"col"},l.createElement("strong",null,l.createElement(s.Z,{id:"theme.tags.tagsListLabel",description:"The label alongside a tag list"},"Tags:")),N.map((({label:e,permalink:a})=>l.createElement(i.Z,{key:a,className:"margin-horiz--sm",to:a},e)))),E&&l.createElement("div",{className:"col text--right"},l.createElement(i.Z,{to:u.permalink,"aria-label":`Read more about ${Z}`},l.createElement("strong",null,l.createElement(s.Z,{id:"theme.blog.post.readMore",description:"The label used in blog post item excerpts to link to full blog posts"},"Read More")))))))}},5601:(e,a,t)=>{"use strict";t.d(a,{Z:()=>d});var l=t(7294),r=t(6010),n=t(6742);const s="sidebar_2ahu",i="sidebarItemTitle_2hhb",m="sidebarItemList_2xAf",o="sidebarItem_2UVv",c="sidebarItemLink_1RT6",g="sidebarItemLinkActive_12pM";function d({sidebar:e}){return 0===e.items.length?null:l.createElement("div",{className:(0,r.Z)(s,"thin-scrollbar")},l.createElement("h3",{className:i},e.title),l.createElement("ul",{className:m},e.items.map((e=>l.createElement("li",{key:e.permalink,className:o},l.createElement(n.Z,{isNavLink:!0,to:e.permalink,className:c,activeClassName:g},e.title))))))}}}]);