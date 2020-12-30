# Change log for 'Fishbone':

### [1.1.1](https://github.com/mbehr1/fishbone/compare/v1.1.0...v1.1.1) (2020-12-30)


### Bug Fixes

* **filehandling:** create new file before opening it ([d6b4a7e](https://github.com/mbehr1/fishbone/commit/d6b4a7ecedda74ca5c98eb1506968fca6ead30bc)), closes [#7](https://github.com/mbehr1/fishbone/issues/7) [#7](https://github.com/mbehr1/fishbone/issues/7)

## [1.1.0](https://github.com/mbehr1/fishbone/compare/v1.0.1...v1.1.0) (2020-12-29)


### Features

* **template-workflow:** add 'reset & reimport all entries' ([03855b4](https://github.com/mbehr1/fishbone/commit/03855b48d961148099cc67721b22427afe04d645))

### [1.0.1](https://github.com/mbehr1/fishbone/compare/v1.0.0...v1.0.1) (2020-12-28)


### Bug Fixes

* **logging:** log 2000 chars on wrong type ([f06e45c](https://github.com/mbehr1/fishbone/commit/f06e45ceec32fb4332e58eddf10ccb3c5f7d299e))

### [1.0.0]
* prepared for semantic-release. Promoted to v1.0.0. No functional changes.

### [0.9.6]
- changed log output for rest queries. Less verbose except for content-type != application/json.

### [0.9.5]
- improved layout for heavier usage of badges. Change/fix for issue #3.

### [0.9.4]
- readme: abs path to icon and size changed to 24.

### [0.9.3]
- add icon

### [0.9.2]
- readme update

### [0.9.1]
- add example picture

### [0.9.0]
- add summary feature

### [0.8.1]
- added http cache for rest api queries. Items will only be added if the header cache-control max-age value is >0 and stay only valid for that duration.

### [0.8.0]
- add "import fishbone" feature that adds the complete fishbone from a different file as a nested rootcause.

### [0.7.0]
- added copy/cut/paste for root causes and categories. Cut will be disabled if any other changes are done before the paste.

### [0.6.1]
- move lower badge a little more lower to improve readability.

### [0.6.0]
- added markdown support for comments, background description and instructions.

### [0.5.1]
- dont show upper badge if value is 0 (number). If you want a 0 use '0' (string).
- dont show lower badge if value is checked/error.

### [0.5.0]
- add DLT attributes: added an option in App bar to add DLT attributes (ecu, sw, lifecycles)
- DLT filter assistant will add a lifecycle filter automatically if DLT attribute "lifecycles" is defined

### [0.4.5]
- fix change title not working after onBlur fix
- add error message when changes could not be applied to the document.

### [0.4.4]
 - fix "New fishbone..." not working under Windows.

### [0.4.3]
- first onBlur not called on leaving OnBlurInputBase
- minor style changes for DataProviderEditDialog

### [0.4.2]
- first set of fixes for applyFilter.

### [0.4.1]
- draft version for applyFilter edit. still poc-alike/buggy...

### [0.4.0]
- edit dialogs for badges incl. first DLT filter assistant
- Appbar with "reset all entries" button
- layout changes (color matching to proper vstheme still messy)
- fix changes in nested fbs not being reflected in the edit dialog for those

### [0.3.0]
- added http basic auth caching in context.globalState to avoid the need to put credentials in the .fba files. The username/password is automatically triggered on each 401 response and currently can only be aborted via entering an empty username or password.

### [0.2.0]
- *add nested fishbone* from UI.
- change title for nested fishbones via UI

### [0.1.1]
- Fix: 'delete rootcause' deleting wrong element (same index but different category)

### [0.1.0]
- Initial released version
