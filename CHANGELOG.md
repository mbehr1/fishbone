# Change Log

All notable changes to the "fishbone" extension will be documented in this file.

## [0.9.4]
- readme: abs path to icon and size changed to 24.

## [0.9.3]
- add icon

## [0.9.2]
- readme update

## [0.9.1]
- add example picture

## [0.9.0]
- add summary feature

## [0.8.1]
- added http cache for rest api queries. Items will only be added if the header cache-control max-age value is >0 and stay only valid for that duration.

## [0.8.0]
- add "import fishbone" feature that adds the complete fishbone from a different file as a nested rootcause.

## [0.7.0]
- added copy/cut/paste for root causes and categories. Cut will be disabled if any other changes are done before the paste.

## [0.6.1]
- move lower badge a little more lower to improve readability.

## [0.6.0]
- added markdown support for comments, background description and instructions.

## [0.5.1]
- dont show upper badge if value is 0 (number). If you want a 0 use '0' (string).
- dont show lower badge if value is checked/error.

## [0.5.0]
- add DLT attributes: added an option in App bar to add DLT attributes (ecu, sw, lifecycles)
- DLT filter assistant will add a lifecycle filter automatically if DLT attribute "lifecycles" is defined

## [0.4.5]
- fix change title not working after onBlur fix
- add error message when changes could not be applied to the document.

## [0.4.4]
 - fix "New fishbone..." not working under Windows.

## [0.4.3]
- first onBlur not called on leaving OnBlurInputBase
- minor style changes for DataProviderEditDialog

## [0.4.2]
- first set of fixes for applyFilter.

## [0.4.1]
- draft version for applyFilter edit. still poc-alike/buggy...

## [0.4.0]
- edit dialogs for badges incl. first DLT filter assistant
- Appbar with "reset all entries" button
- layout changes (color matching to proper vstheme still messy)
- fix changes in nested fbs not being reflected in the edit dialog for those

## [0.3.0]
- added http basic auth caching in context.globalState to avoid the need to put credentials in the .fba files. The username/password is automatically triggered on each 401 response and currently can only be aborted via entering an empty username or password.

## [0.2.0]
- *add nested fishbone* from UI.
- change title for nested fishbones via UI

## [0.1.1]
- Fix: 'delete rootcause' deleting wrong element (same index but different category)

## [0.1.0]
- Initial released version