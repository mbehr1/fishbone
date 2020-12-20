# <img src="https://github.com/mbehr1/fishbone/blob/main/fishbone-icon2.png?raw=true" alt="icon" width="24"> Fishbone README

[![Version](https://vsmarketplacebadge.apphb.com/version/mbehr1.fishbone.svg)](https://marketplace.visualstudio.com/items?itemName=mbehr1.fishbone)

This Visual Studio Code(tm) extension adds support to create interactive fishbone aka [Ishikawa](https://en.wikipedia.org/wiki/Ishikawa_diagram) diagrams that can be used to 
- analyse failures or
- defect reports / perform root cause analysis or
- support FMEAs.

![example1](https://github.com/mbehr1/fishbone/blob/main/images/fishbone_example1.gif?raw=true)

**Note:** It works well with [![Version](https://vsmarketplacebadge.apphb.com/version/mbehr1.dlt-logs.svg)](https://marketplace.visualstudio.com/items?itemName=mbehr1.dlt-logs) **dlt-logs** extension and supports e.g. querying data directly from the DLT log or applying filter automatically in the DLT log. 

**Note:** To start you can use the command *New fishbone* or create an empty file with extension .fba and simpy open that via regular "Open...".

**Note:** Title, effects and categories can be directly changed via the UI. Simply click into the corresponding area.

**Note:** The document supports regular **Undo**. That's why e.g. commands like "delete effect", "delete rootcause",... are not asking whether you do really want to delete.

## Features

- allows to create interactive fishbone diagrams with
  - multiple effects
  - causes/categories to aid clustering root causes
  - root causes that
    - can be checked/unchecked or marked as failing
    - can have a background description
    - can have processing instructions.

- diagrams can be nested via 
  - *add nested fishbone* command from the category ... menu or
  - *import fishbone* command from the category ... menu. On importing new attributes defined in the imported ones will be added. Take care: attributes with same name will not be modified on import. Please check that they have the same meaning.
- supports copy/cut/paste for root causes and categories.
- supports restQuery from other extensions (currently dlt-logs and via direct yaml file modification)
- summary table to provide a compact overview
	- grouping by effect and category
	- links to jump directly to the particular fishbone view
	- filter for each element 

<!-- todo add image \!\[feature X\]\(images/feature-x.png\) -->

## Planned features

- support a "template-workflow" (e.g. reset values, comments,... or clone)
  - *reset all entries* to reset values, comments and attribute values already available
  - *import fishbone* implemented to be able to split the definition of fishbones into multiple files, e.g. per topic but to add them into one analysis file.
  - missing: on *reset all entries* imported fishbones should be re-read to ease maintenance of files per topic.
- support pcap filters similar to dlt log filters
- support text document filters working with smart-logs

## Known Issues

- first version, proof-of-concept status. Expect (and pls report) bugs.

## Contributors

Thanks a lot to :
- [Florian Fuerst](https://github.com/flfue) for the first PR providing markdown support!

## Contributions

Any and all test, code or feedback contributions are welcome.
Open an [issue](https://github.com/mbehr1/fishbone/issues) or create a pull request to make this extension work better for all.

[![Donations](https://www.paypalobjects.com/en_US/DK/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=2ZNMJP5P43QQN&source=url) Donations are welcome! (Contact me for commercial use or different [license](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode)).

[GitHub ♥︎ Sponsors are welcome!](https://github.com/sponsors/mbehr1)

## Release Notes

See [Changelog](./CHANGELOG.md)

## Third-party Content

This project leverages the following third party content.

fishbone-chart (1.0.24)
 - License: MIT
 - Source: https://github.com/thiagoferrax/fishbone-chart
 - Note: this was used as the initial basis. I plan to provide the fixes/improvements done here to my github fork.

js-yaml (3.14.0)
 - License: MIT
 - see npm package js-yaml
 
jsonpath (1.0.2)
 - License: MIT
 - see npm package jsonpath

React, material-ui, react-dom, react-scripts, web-vitals: see corresponding npm packages.

