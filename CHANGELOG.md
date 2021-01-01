# Change log for 'Fishbone':

### [1.2.4](https://github.com/mbehr1/fishbone/compare/v1.2.3...v1.2.4) (2021-01-01)


### Bug Fixes

* not processing queue items in error cases ([ae995d8](https://github.com/mbehr1/fishbone/commit/ae995d83a34f5f74d153976bf55535ea0a57ce24))

### [1.2.3](https://github.com/mbehr1/fishbone/compare/v1.2.2...v1.2.3) (2021-01-01)


### Bug Fixes

* proper error messages for exceptions ([0dd4f2e](https://github.com/mbehr1/fishbone/commit/0dd4f2ef9d4f3845404b88f2d59e740b21800b3b))


### Performance

* update webview only on doc version change ([d31a159](https://github.com/mbehr1/fishbone/commit/d31a159c8de912ef1b1e415c52dceb7745de41f5))

### [1.2.2](https://github.com/mbehr1/fishbone/compare/v1.2.1...v1.2.2) (2021-01-01)


### Bug Fixes

* refactor the update text document logic ([8c31890](https://github.com/mbehr1/fishbone/commit/8c3189077b6b66deeb25039b2114654aaffa5337)), closes [#7](https://github.com/mbehr1/fishbone/issues/7) [#7](https://github.com/mbehr1/fishbone/issues/7)

### [1.2.1](https://github.com/mbehr1/fishbone/compare/v1.2.0...v1.2.1) (2020-12-31)


### Bug Fixes

* **app:** add preventDefault ([63abbe1](https://github.com/mbehr1/fishbone/commit/63abbe1b4c13cf0d73c0a73b765c067bd6b69b0a)), closes [#7](https://github.com/mbehr1/fishbone/issues/7)
* **multistatebox:** prevent clicking twice ([676456b](https://github.com/mbehr1/fishbone/commit/676456b1f280f14e4d9d83ac6d9b1d2bbf6b00f8)), closes [#7](https://github.com/mbehr1/fishbone/issues/7)

## [1.2.0](https://github.com/mbehr1/fishbone/compare/v1.1.2...v1.2.0) (2020-12-31)


### Features

* **applyfilter:** very basic support of dlt reports ([c94eb8d](https://github.com/mbehr1/fishbone/commit/c94eb8d627b1c7ee6ff94b97dcd6064a844d7109))

### [1.1.2](https://github.com/mbehr1/fishbone/compare/v1.1.1...v1.1.2) (2020-12-30)


### Bug Fixes

* **newfile:** open the new file in non preview mode ([1126a52](https://github.com/mbehr1/fishbone/commit/1126a5256c09d938330ec67fd8d20dfd2f472aaf))

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
