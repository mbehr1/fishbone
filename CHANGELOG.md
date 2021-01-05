# Change log for 'Fishbone':

### [1.5.3](https://github.com/mbehr1/fishbone/compare/v1.5.2...v1.5.3) (2021-01-05)


### Bug Fixes

* **attributes:** empty lifecycles should match all ([650f422](https://github.com/mbehr1/fishbone/commit/650f4225c4e94bdca9bbba4980056711d8a594af))

### [1.5.2](https://github.com/mbehr1/fishbone/compare/v1.5.1...v1.5.2) (2021-01-04)


### Bug Fixes

* **applyeffect:** apply effect button was using initial props ([ef283fb](https://github.com/mbehr1/fishbone/commit/ef283fb18778449533087be6159ea967b5f1a286))
* **fbacheckbox:** offer apply filter directly after editing ([d2851dc](https://github.com/mbehr1/fishbone/commit/d2851dc742d4d744ffd1c22a8445a5cd7a18866a))

### [1.5.1](https://github.com/mbehr1/fishbone/compare/v1.5.0...v1.5.1) (2021-01-04)


### Bug Fixes

* **webview:** for queue msgs keep fifo order ([b9656a0](https://github.com/mbehr1/fishbone/commit/b9656a03decd49da3c10cd8b8ccb03f11badfd53))

## [1.5.0](https://github.com/mbehr1/fishbone/compare/v1.4.2...v1.5.0) (2021-01-03)


### Features

* **dltfilterassistant:** support multiple event filters for reports ([b55081e](https://github.com/mbehr1/fishbone/commit/b55081e92efb1d9f731348587012e68f939295c5))

### [1.4.2](https://github.com/mbehr1/fishbone/compare/v1.4.1...v1.4.2) (2021-01-03)


### Bug Fixes

* **dltfilterassistant:** offer marker and report filter only in apply mode ([e5f222b](https://github.com/mbehr1/fishbone/commit/e5f222b2f6e5c63afdc72c09dd843241ff8eb0c8))

### [1.4.1](https://github.com/mbehr1/fishbone/compare/v1.4.0...v1.4.1) (2021-01-03)


### Bug Fixes

* **dataprovidereditdialog:** add test apply filter button ([c409760](https://github.com/mbehr1/fishbone/commit/c4097608bf3731eaee38403196ecff78f0ab4e13))

## [1.4.0](https://github.com/mbehr1/fishbone/compare/v1.3.0...v1.4.0) (2021-01-02)


### Features

* **fileformat:** change format to 0.4 ([f8c27ce](https://github.com/mbehr1/fishbone/commit/f8c27cee1058f75af06fff37db187902f96bc34b))
* **restquery:** show warning if version of dlt-logs is too old ([53c6ccb](https://github.com/mbehr1/fishbone/commit/53c6ccb4234be2acbe01884de1d0c6a48f3df522))


### Bug Fixes

* **dataprovidereditdialog:** uri encode the examples ([388bbd1](https://github.com/mbehr1/fishbone/commit/388bbd10867da663caf3ccfc05adc63dbeac12f6))
* **dltfilterassistant:** support delete and patch ([bf1f605](https://github.com/mbehr1/fishbone/commit/bf1f605793b62f55dbc47427620f5133d5e59a6e))
* **dltfilterassistant:** use uri en-/decode for parameter ([f638a33](https://github.com/mbehr1/fishbone/commit/f638a3306ceaf64d705b2d8607cfaf6615eb8af2))
* **restquery:** support non quoted attributes ([79dc2b4](https://github.com/mbehr1/fishbone/commit/79dc2b46d2b55cfc6079ff34f16cb04b0a495ee2))
* **restquery:** uri encode attribute parameters ([3c875db](https://github.com/mbehr1/fishbone/commit/3c875db669c2fe3b302244444073720c8c300be8))
* **util:** support parameter subst for uri encoded params ([8955ee6](https://github.com/mbehr1/fishbone/commit/8955ee671b24b14f11d4142861e2de24fc3b86f9))


### Other

* **dataprovider:** use triggerRestQueryDetails ([1ee1519](https://github.com/mbehr1/fishbone/commit/1ee15190e78a8b33b1ab4207041f3f2e51d51587))
* **format:** remove old props.filter.* ([bb9095d](https://github.com/mbehr1/fishbone/commit/bb9095de42449b243b0d7cdf1763e7761549e417))

## [1.3.0](https://github.com/mbehr1/fishbone/compare/v1.2.4...v1.3.0) (2021-01-01)


### Features

* **dltfilterassistant:** show name like dlt-logs ([ec29c70](https://github.com/mbehr1/fishbone/commit/ec29c70bc5ffb8159623eff211da85047edf3488))
* **dltfilterassistant:** show the source on multiple lines ([d8d129f](https://github.com/mbehr1/fishbone/commit/d8d129f8bb5beafd77e10204befdab817b7bfd94))


### Other

* less debug output ([669126e](https://github.com/mbehr1/fishbone/commit/669126effe4e7c3808d4cde81940b7215ba4d054))
* **dltfilterassistant:** dense layout ([55baea7](https://github.com/mbehr1/fishbone/commit/55baea747dc21af53b4bd0639a370544c0b8739b))

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
