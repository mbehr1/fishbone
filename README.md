# Fishbone README

[![Version](https://vsmarketplacebadge.apphb.com/version/mbehr1.fishbone.svg)](https://marketplace.visualstudio.com/items?itemName=mbehr1.fishbone)

This Visual Studio Code(tm) extension adds support create interactive fishbone charts that can be used to analyse failures, defect reports, root cause analysis.

**Note:** It works well with [![Version](https://vsmarketplacebadge.apphb.com/version/mbehr1.dlt-logs.svg)](https://marketplace.visualstudio.com/items?itemName=mbehr1.dlt-logs) **dlt-logs** extension and supports e.g. querying data directly from the DLT log or applying filter automatically in the DLT log. 

## Features

- allows to create interactive fishbone diagrams
- diagrams can be nested
- supports restQuery from other extensions (currently dlt-logs)

<!-- todo add image \!\[feature X\]\(images/feature-x.png\) -->

## Planned features

- add/edit/delete effects/categories/root-causes via UI (currently only in YAML format in the serialized .fba files)
- support a "template-workflow" (e.g. reset values, comments,... or clone)
- add JIRA data provider support
- add markdown support for descriptive fields like background, instructions, comments

## Known Issues

- not ready yet, proof-of-concept status

## Contributions

Any and all test, code or feedback contributions are welcome.
Open an [issue](https://github.com/mbehr1/fishbone/issues) or create a pull request to make this extension work better for all.

[![Donations](https://www.paypalobjects.com/en_US/DK/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=2ZNMJP5P43QQN&source=url) Donations are welcome! (Contact me for commercial use or different [license](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode)).

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

