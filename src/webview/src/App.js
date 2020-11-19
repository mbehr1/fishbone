/**
 * copyright (c) 2020, Matthias Behr
 * 
 * todo list:
 * - rethink "react" class support (function as string parsed to js?)
 * 
 * - use webpack (or something else) for proper react "app" bundling/generation incl. debugging support
 *   ( to get rid of src/webview yarn build, F5 (cmd+s...))
 * 
 */

import React, { Component } from 'react';
import './App.css';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import Link from '@material-ui/core/Link';
import Paper from '@material-ui/core/Paper'
import Checkbox from '@material-ui/core/Checkbox';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
// import Filter1Icon from '@material-ui/icons/Filter1';
import FishboneChart from './components/fishbone/fishboneChart'
import { FormControlLabel, IconButton, Container, TextField, ThemeProvider } from '@material-ui/core';
// import { makeStyles } from '@material-ui/core/styles';
import EditIcon from '@material-ui/icons/Edit';
import Grid from '@material-ui/core/Grid';
//import MenuItem from '@material-ui/core/MenuItem';
import InputDataProvided from './components/dataProvider';
import FBACheckbox from './components/fbaCheckbox';
import OnBlurInputBase from './components/onBlurInputBase';
import { receivedResponse } from './util';
import HomeIcon from '@material-ui/icons/Home';
import { createMuiTheme } from '@material-ui/core/styles';

class MyCheckbox extends Component {
  render() {
    return (
      <Container>
        <Tooltip title={`a tooltip for ${this.props.name}`}>
          <FormControlLabel control={
            <Checkbox {...this.props} size="small" color="primary"></Checkbox>
          } label={this.props.label}
          />
        </Tooltip >
        <IconButton size="small" aria-label="edit">
          <EditIcon fontSize="small" color="primary" />
        </IconButton>
      </Container>
    );
  }
}

export default class App extends Component {

  logMsg(msg) {
    console.log('logPostMsg:' + msg);
    this.props.vscode.postMessage({ type: 'log', message: 'logMsg:' + msg });
  }

  addInlineElements = (rootcause) => {
    if (typeof rootcause === 'object') {
      if (rootcause.type === 'react') {
        if (!('elementName' in rootcause)) {
          switch (rootcause.element) {
            case 'MyCheckbox': rootcause.elementName = MyCheckbox; rootcause.props.onChange = this.handleInputChange.bind(this, rootcause); break;
            case 'FBACheckbox': rootcause.elementName = FBACheckbox; rootcause.props.onChange = this.handleInputChange.bind(this, rootcause); break;
            default: // do nothing
              console.log(`addInlineElements found unknown object rootcause element:'${JSON.stringify(rootcause)}'`);
              break;
          }
        }
      }
    }
  }

  /**
   * return the data object for the current path
   * @param {*} curPath array of objects with {title, effectIndex}
   * @param {*} data full tree of fishbone chart data, i.e. root chart.
   * @returns data object for the current path or null if not available
   */
  getCurData(curPath, data) {
    console.log(`getCurData(curPath=${JSON.stringify(curPath)}) called...`);
    if (!curPath.length) return null;
    if (curPath.length === 1) return data;
    // a path consists of e.g. [ (roottitle, effectIndex1), (childTitle, effectIndex2),... ]
    // the childFB1 has to be reachable via an nested type rootcause named "childFB1title" within roottitle/effectIndex1

    // we start checking from the 2nd one (level/idx 1):
    let prevData = data;
    let prevEffectIndex = curPath[0].effectIndex;

    for (let level = 1; level < curPath.length; ++level) {
      const childTitle = curPath[level].title;
      // does prevData has at prevEffectIndex a rootcaused typed "nested" and named "childTitle?
      const effectObj = prevData.length > prevEffectIndex ? prevData[prevEffectIndex] : [null, null];
      if (effectObj.categories) { // array of [{name:category, rootCauses:[rootcauses]}]
        const categories = effectObj.categories;
        // console.log(`categories=`, categories);

        let found = false;
        console.log(`categories.length = ${categories.length}`);
        for (const category of categories) {
          // console.log(`category = ${category.name} rootCauses.length=${category?.rootCauses.length}`);
          for (const rootcause of category?.rootCauses) {
            if (typeof rootcause === 'object') {
              // console.log(`found rootcause type=${rootcause.type} ${rootcause.title}`);
              if (rootcause.type === 'nested' && rootcause.title === childTitle) {
                // got it
                console.log(`getCurData found ${childTitle}`);
                prevData = rootcause.data;
                prevEffectIndex = curPath[level].effectIndex;
                found = true;
                break;
              }
            }
          }
          if (found) break;
        }
        if (!found) { console.log(`didnt found '${childTitle}'`); return null; }
      } else { console.log(`got no categories!`); return null; }
    }
    console.log(`getCurData returning `, prevData, data);
    return prevData;
  }

  /**
   * Returns the longest matching path. Modifies the curPath!
   * @param {*} curPath current path array. Will be shortend if not fitting!
   * @param {*} data  root fishbone data node.
   * @param {*} firstTitle first/root chart title
   * @returns longest matching path (in most cases a shortened curPath)
   */
  matchingFbPath(curPath, data, firstTitle) {
    const matchingPath = [{ title: firstTitle, effectIndex: 0 }];
    console.log(`matchingFbPath(curPath.length=${curPath.length}) called`);
    if (curPath[0]?.title !== firstTitle) return matchingPath;

    // now check from the end:
    // we could do binary search but for this use case most of the time 
    // the path doesn't change anyhow!
    while (curPath.length > 0) {
      const pathData = this.getCurData(curPath, data);
      if (!pathData) {
        curPath.pop();
      } else return curPath;
    }
    console.log(`matchingFbPath(curPath.length=${curPath.length}) done`);
    if (curPath.length > 0) return curPath;
    return matchingPath;
  }

  constructor(props) {
    super(props);
    //this.handleInputChange = this.handleInputChange.bind(this);

    const vsCodeState = props.vscode.getState();

    // need to convert to class names...
    // done on the fly/need now this.parseFBData(vsCodeState?.data || []);

    console.log(`vsCodeState=${JSON.stringify(vsCodeState)}`);

    this.state = vsCodeState ||
      (props.initialData ?
        { data: props.initialData, title: "<no title>" } :
        { data: [], title: "<no title>" });

    if (!(this.state?.fbPath?.length)) {
      this.state.fbPath = [{ title: this.state.title, effectIndex: 0 }]
    }

    this.logMsg(`from App/constructor state.title=${this.state.title}`);
    window.addEventListener('message', event => {
      const msg = event.data;
      console.log(`App received msg:`);
      console.log(msg);
      switch (msg.type) {
        case 'update':
          // do we need to update the fbPath?
          // check whether the current path is still valid, if not use the first matching parts:
          console.log(`state.fbPath=${JSON.stringify(this.state.fbPath)}`);
          const newFbPath = this.matchingFbPath(this.state.fbPath, msg.data, msg.title);
          console.log(`newPath=${JSON.stringify(newFbPath)}`);

          // we store the non-modified data in vscode.state (e.g. with react:MyCheckbox as string)
          this.props.vscode.setState({ data: msg.data, title: msg.title, attributes: msg.attributes, fbPath: newFbPath }); // todo shall we store any other data?
          this.setState({ data: msg.data, title: msg.title, attributes: msg.attributes, fbPath: newFbPath });
          break;
        case 'sAr':
          receivedResponse(msg);
          break;
        default:
          console.warn(`App received unknown type=${msg.type} msg:`);
          console.log(msg);      
            break;
      }
    });

  }

  handleFBStateChange(fbState) {
    console.log(`App.handleFBStateChange fbState=`, fbState);
    if ('childFBData' in fbState) {
      const fbData = fbState.childFBData;
      if (Array.isArray(fbData)) {
        const [, childTitle] = fbData;
        console.log(`App.handleFBStateChange nest into '${childTitle}'`);
        console.log(`App.handleFBStateChange curPath=`, this?.state?.fbPath);
        const curPath = this.state.fbPath; // 
        curPath.push({ title: childTitle, effectIndex: 0 });
        this.setState({ fbPath: curPath });
      } else {
        // go back to prev.
        console.log(`App.handleFBStateChange curPath=`, this?.state?.fbPath);
        const curPath = this.state.fbPath; // 
        curPath.pop();
        this.setState({ fbPath: curPath }); // todo use setAllStates with new params "noDocUpdate?"
      }
      this.props.vscode.setState({ data: this.state.data, title: this.state.title, attributes: this.state.attributes, fbPath: this.state.fbPath }); // todo shall we store any other data?
    }
    if ('effectIndex' in fbState) {
      // update fbPath last element:
      if (!(this.state?.fbPath.length)) {
        throw new Error(`handleFBStateChange effectIndex change without fbPath!`);
      }
      // modify directly and call setState... ? dirty   
      console.log(`App.handleFBStateChange curPath=`, this?.state?.fbPath);
      const curPath = this.state.fbPath; // 
      curPath[this.state.fbPath.length - 1].effectIndex = fbState.effectIndex || 0;
      this.setState({ fbPath: curPath });
      this.props.vscode.setState({ data: this.state.data, title: this.state.title, attributes: this.state.attributes, fbPath: curPath }); // todo shall we store any other data?
    }
  }

  handleInputChange(object, event, propsField) {
    console.warn(`handleInputChange this=`, this);
    console.warn(`handleInputChange object=`, object);
    console.warn(`handleInputChange event=`, event);
    console.warn(`handleInputChange propsField=`, propsField);

    // if propsField is provided this determines the field to update (e.g. object.props[propsField]=...)
    const target = event.target;
    let values = target.values; // this can be an array like [{<name>:<value>}] in this case propsField will be ignored!
    let value = target.type === 'checkbox' ? target.checked : target.value;

    if (values && propsField) {
      console.error(`logical error! only values or propsFields must be used!`);
      throw new Error(`logical error! only values or propsFields must be used!`);
    }  

    const propsFieldName = (propsField !== undefined) ? propsField : (target.type === 'checkbox' ? 'checked' : 'value');
  
    if (!values) {
      values = { [propsFieldName]: value }
    }


    const name = target.name;
    const id = target.id;
    console.log(`App.handleInputChange(id=${id}, type=${target.type}, name=${name}, value=${value} propsField=${propsField} key=${target.key} object.keys=${Object.keys(object).toString()} values=`, values);

    let didUpdate = false;

    if (target.type === 'datetime-local') {
      const tempVal = new Date(value);
      // no timeshift needed? const date = new Date((tempVal.valueOf() + this.timeZoneOffsetInMs));
      value = tempVal.toISOString();
    }

    if (target.type === 'checkbox') {
      if ('props' in object) { object.props.checked = value; didUpdate = true; }
      if ('checked' in object) { object.checked = value; didUpdate = true; }
      // todo for attributes!
    } else {
      if ('props' in object) { for (const [key, value] of Object.entries(values)) { object.props[key] = value; }; /*object.props[propsFieldName] = value; */ didUpdate = true; }
      else {
        // for attributes object contains just one key: (the name)
        if (Object.keys(object).length === 1) {
          console.log(`App.handleInputChange found attribute like object to update: ${JSON.stringify(object)}`);
          const curValue = object[Object.keys(object)[0]];
          if (typeof curValue === 'object') {
            const attrObj = curValue;
            console.log(`App.handleInputChange found object inside attribute to update: ${JSON.stringify(attrObj)}`);
            for (const [key, value] of Object.entries(values)) {
              attrObj[key] = value;
              didUpdate = true;
              console.log(`App.handleInputChange updated object inside attribute to: ${JSON.stringify(object)}`);
            }
          } else {
            // update that one directly todo: needs update with values logic!
            object[Object.keys(object)[0]] = value;
            console.warn(`App.handleInputChange updated flat attribute to: ${JSON.stringify(object)}`);
            didUpdate = true;
          }
        } else {
          // update the key directly? (e.g. for effect(=object) name(propsField) change)
          for (const [key, value] of Object.entries(values)) {
            if (key in object) {
              object[key] = value;
              didUpdate = true;
            } else {
              console.warn(`handleInputChange didn't found key '${key}' in object to update to value '${value}'!`);
            }
          }
        }
      }
    }

    if (didUpdate) {
      console.log(`updated object to ${JSON.stringify(object)}`);
      this.setAllStates();
    } else {
      console.warn(`App.handleInputChange didn't found property to update!`);
    }
  }

  /**
   * Updates state and the cached vscode.setState and posts the data to the
   * extension for updating the document.
   * @param {*} newStateFragements fragment of the state that shall be updated
   */
  setAllStates(newStateFragements) {
    this.setState(newStateFragements || {}, () => {
      this.props.vscode.setState({ data: this.state.data, title: this.state.title, attributes: this.state.attributes, fbPath: this.state.fbPath }); // todo shall we store any other data?
      // we parse and unparse to get rid of the elementName modifications... (functions)
      // storing all but the fbPath... (todo: why not?)
      this.props.vscode.postMessage({ type: 'update', data: JSON.parse(JSON.stringify(this.state.data)), title: this.state.title, attributes: this.state.attributes });
    });
  }

  /**
   * Add a new root cause to category...
   * @param {*} type type to be added. 'FBACheckbox' or 'nested'
   * @param {*} data 
   * @param {*} effectIndex 
   * @param {*} category category to add the root cause to
   */
  onAddRootCause(type, data, effectIndex, category) {
    console.log(`onAddRootCause (type='${type}' at category=${category?.name}`);
    if (!category) return;
    const rootCauses = category.rootCauses;
    let insertIndex = rootCauses.length;
    let newRootCause = undefined;
    switch (type) {
      case 'FBACheckbox':
        newRootCause = {
          type: 'react',
          element: 'FBACheckbox',
          props: { // todo do we need name?
            label: `root cause ${rootCauses.length + 1}`,
            value: null
          }
        };
        break;
      case 'nested':
        newRootCause = {
          type: 'nested',
          title: `nested fb ${rootCauses.length + 1}`,
          data: [
            {
              name: 'effect 1',
              categories: [{ name: 'category 1', rootCauses: [] }]
            }
          ]
        };
        break;
      default:
        console.warn(`onAddRootCause unknown type '${type}'`);
        break;
    }
    if (newRootCause !== undefined) { 
    rootCauses.splice(insertIndex, 0, newRootCause);
    this.setAllStates();
    }
  }

  /**
   * add a category to the effect indexed by data[effectIndex]
   * @param {*} data 
   * @param {*} effectIndex 
   * @param {*} category category used to select command, can be undefined!
   * The new category will be added before this one if provided.
   */
  onAddCategory(data, effectIndex, category) {
    console.log(`onAddCategory called. effectIndex = ${effectIndex} data=`, data);
    console.log(`onAddCategory called. category=`, category);
    let insertIndex = data[effectIndex].categories.length;
    if (category) {
      // find the category and delete it:
      const catIdx = data[effectIndex].categories.findIndex((element) => element === category);
      if (catIdx >= 0) { insertIndex = catIdx; }
    }
    data[effectIndex].categories.splice(insertIndex, 0, { name: `category ${data[effectIndex].categories.length + 1}`, rootCauses: [] });
    this.setAllStates();
  }

  onAddEffect(data, effectIndex) {
    console.log(`onAddEffect called. effectIndex = ${effectIndex} data=`, data);
    data.splice(effectIndex + 1, 0, { name: `effect ${effectIndex + 2}`, categories: [{ name: `category 1`, rootCauses: [] }] }); // todo add one root cause?

    // we do select the new one
    const curPath = this.state.fbPath;
    // console.log(`onDeleteEffect called. curPath =`, curPath);
    curPath[this.state.fbPath.length - 1].effectIndex = effectIndex + 1;

    this.setAllStates();
  }

  onDeleteEffect(data, effectIndex) {
    console.log(`onDeleteEffect called. effectIndex = ${effectIndex} data=`, data);
    if (data.length <= 1) return; // we dont allow to delete the last effect
    data.splice(effectIndex, 1);

    // we do select the prev one as next one
    const curPath = this.state.fbPath;
    // console.log(`onDeleteEffect called. curPath =`, curPath);
    curPath[this.state.fbPath.length - 1].effectIndex = effectIndex > 0 ? effectIndex - 1 : 0;

    this.setAllStates();
  }

  onDeleteCategory(data, effectIndex, category) {
    console.log(`onDeleteCategory called. effectIndex = ${effectIndex} data=`, data);
    console.log(`onDeleteCategory called. category.name=${category.name}`, category);

    // don't support deleting the last category:
    if (data[effectIndex].categories.length <= 1) return;

    // find the category and delete it:
    const catIdx = data[effectIndex].categories.findIndex((element) => element === category);
    if (catIdx >= 0) {
      console.log(`found element ${catIdx} to delete:`, data[effectIndex].categories[catIdx]);
      data[effectIndex].categories.splice(catIdx, 1);
      this.setAllStates();
    }
  }

  /**
   * Callback to delete a rootcause
   * @param {*} rootcause object to the rootcause
   * @param {*} event event that triggered it
   */
  onDeleteRootCause(rootCause, event) {
    console.log(`onDeleteRootCause() object=`, rootCause);
    console.log(`onDeleteRootCause() event=`, event);

    // search for this rootcause: (could search in active effect only... but searching all)
    let found = false;
    const data = this.getCurData(this.state.fbPath, this.state.data)
    data.forEach(effect => {
      effect.categories.forEach(category => {
        for (let i = 0; !found && i < category.rootCauses.length; ++i) {
          const rc2 = category.rootCauses[i];
          if (rc2 === rootCause) {
            category.rootCauses.splice(i, 1);
            this.setAllStates();
            found = true;
          }
        }
      });
    });
    if (!found) {
      console.warn(`onDeleteRootCause didn't found rc to delete!`);
    }
  }

  render() {
    console.log(`App render (title=${this.state.title}) `); // state.data: ${JSON.stringify(this.state.data)}`);

    // hack to get the css variables from vscode:
    const vscodeStyles = window.getComputedStyle(document.body);

    const theme = createMuiTheme({
      palette: {
        common: {
          black: '#ff0000'
        },
        background: {
          paper: vscodeStyles.getPropertyValue('--vscode-editor-background'),
        },
        text: {
          primary: vscodeStyles.getPropertyValue('--vscode-foreground'),
          secondary: vscodeStyles.getPropertyValue('--vscode-descriptionForeground'),
          disabled: '#ff0000',
          hint: '#00ff00',
        }
      },
      typography: {
        // looks weird?        fontSize: 'var(--vscode-font-size)',
        fontFamily: vscodeStyles.getPropertyValue('--vscode-font-family'),
        // looks weird?        fontWeightRegular: 'var(--vscode-font-weight)'
      }
    });

    // attribute section
    let attributeSection = undefined;
    if (this.state.attributes?.length > 0) {
      console.log(`App.render() adding ${this.state.attributes.length} attributes:`);

      /*
      const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiTextField-root': {
      margin: theme.spacing(1),
      width: '25ch',
    },
  },
}));
      */

      const formStyle = {
        margin: 3,
        width: '25ch',
        spacing: 2
      }

      // add attributes:
      const attrs = this.state.attributes.map((attribute) =>
        this.getUIForAttribute(attribute)
      );
      attributeSection = (
        <Paper>
          <Grid container spacing={2}>
            <Grid item sm={6} container>
              <Typography align="left" gutterBottom variant="h5">
                Attributes:
                </Typography>
              <form style={formStyle} noValidate autoComplete="off">
                <Grid container spacing={2}>
                  {attrs}
                </Grid>
              </form>
            </Grid>
          </Grid>
        </Paper>
      );
    }

    const handleBreadcrumbClick = (index) => {
      console.log(`handleBreadcrumbClick ev=`, index);
      // we encode the level in href
      const level = index;
      console.log(`handleBreadcrumbClick level=${level}`);
      // shorten path to that level:
      const curPath = this.state.fbPath;
      while (curPath.length > level + 1) curPath.pop();
      this.setState({ fbPath: curPath });
    }

    const handleChangeTitle = (value) => {
      console.log(`handleChangeTitle value='${value}'`);
      if (this.state.fbPath.length === 1) {
        this.setAllStates({ title: value });
      } else {
        // it's a bit tricky to get to the current title...
        // its the title of the rootcause with .title property...
        // so we do need to search for that root cause:
        const parentData = this.getCurData(this.state.fbPath.slice(0, -1), this.state.data);
        // search all effects and categories:
        parentData.forEach((effect) => {
          effect.categories.forEach((category) => {
            category.rootCauses.forEach((rootCause) => {
              if (typeof rootCause === 'object' && rootCause.type === 'nested' &&
                rootCause.title === this.state.fbPath[this.state.fbPath.length - 1].title) {
                console.log(`found nested fb. Cur title=${rootCause.title}`);
                // modify the obj directly
                rootCause.title = value;
                // and update fbPath: (directly)
                const fbPathTemp = this.state.fbPath;
                fbPathTemp[this.state.fbPath.length - 1].title = value;
                this.setAllStates({ fbPath: fbPathTemp }); // even though we did modify it directly...
              }
            });
          });
        });
      }
    }

    const breadcrumbFragment = this.state.fbPath.map((path, index, arr) => {
        const icon = index === -1 ? <HomeIcon /> : null; // disabled for now
        if (index < arr.length - 1) {
          return (
            <Link component="button" key={`br_${index}_${path.title}`} onClick={(event) => { event.preventDefault(); handleBreadcrumbClick(index); }} color="textPrimary">
              {icon}{path.title}
            </Link>);
        } else {
          console.log(`breadcrumbFragment(${this.state.title}) path.title =${path.title}}`);
          return (<OnBlurInputBase value={path.title} key={`br_${index}_${path.title}`} name="title" onChange={(event) => handleChangeTitle(event.target.value)} />);
        }
      });

    // alignItems = vertical alignment
    // justify = horiz.
    return (
      <div className="App">
        <ThemeProvider theme={theme}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper>
              <div>
                <Grid container spacing={2} justify="center">
                  <Grid item gutterBottom>
                    <Breadcrumbs>
                        {breadcrumbFragment}
                    </Breadcrumbs>
                  </Grid>
                </Grid>
                </div>
                <FishboneChart
                  onStateChange={(fbData) => this.handleFBStateChange(fbData)}
                  reactInlineElementsAdder={this.addInlineElements}
                  onChange={this.handleInputChange.bind(this)}
                  effectContextMenu={[
                    { text: 'add category', cb: this.onAddCategory.bind(this) },
                    { text: 'add effect', cb: this.onAddEffect.bind(this) },
                    { text: 'delete effect', cb: this.onDeleteEffect.bind(this) }]}
                  categoryContextMenu={[
                    { text: 'add root-cause', cb: this.onAddRootCause.bind(this, 'FBACheckbox') },
                    { text: 'add nested fishbone', cb: this.onAddRootCause.bind(this, 'nested') },
                    { text: 'add category', cb: this.onAddCategory.bind(this) },
                    { text: 'delete category', cb: this.onDeleteCategory.bind(this) }
                  ]}
                  rootCauseContextMenu={[
                    { text: 'delete root-cause', cb: this.onDeleteRootCause.bind(this) },
                  ]}
                  data={this.getCurData(this.state.fbPath, this.state.data)}
                  effectIndex={this.state.fbPath[this.state.fbPath.length - 1].effectIndex} cols="12" />
            </Paper>
          </Grid>
          <Grid item xs={6}>
            {attributeSection}
          </Grid>
        </Grid>
        </ThemeProvider>
      </div>
    );
  }

  timeZoneOffsetInMs = new Date().getTimezoneOffset() * 60 * 1000;

  getUIForAttribute(attribute) {
    // we expect as attribute an Object with one key (the name)
    // then the key value can be a string or an object with value, type,...
    const attrName = Object.keys(attribute)[0];
    console.log(`getUIForAttribute #keys=${Object.keys(attribute)} attr[0]=${attrName}`);
    const attrObj = attribute[attrName];
    let attrValue = ''
    let type = 'text';
    let label = attrName;

    let useSelect = undefined;

    if (typeof attrObj === 'object') {
      attrValue = attrObj.value;
      if (attrObj.type) { type = attrObj.type; }
      if (attrObj.label) { label = attrObj.label; }

      // dataProvider?
      if (attrObj.dataProvider) {
        useSelect = true
      }

    } else {
      attrValue = attrObj; // assert string
    }

    // if type == datetime-local we do need to convert the values:
    if (type === 'datetime-local' && attrValue.length > 0) {
      const tempVal = new Date(attrValue);
      const date = new Date((tempVal.valueOf() - this.timeZoneOffsetInMs));
      attrValue = date.toISOString().slice(0, 19);
    }

    if (useSelect !== undefined) {
      return (
        <Grid item>
          <InputDataProvided
            id={`attribute_${attrName}`}
            dataProvider={attrObj.dataProvider}
            attributes={this.state.attributes}
            label={label}
            value={attrValue}
            onChange={this.handleInputChange.bind(this, attribute)}
          />
        </Grid>
      );
    } else {
      return (
        <Grid item>
          <TextField
            id={`attribute_${attrName}`}
            label={label}
            type={type}
            value={attrValue}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
            onChange={this.handleInputChange.bind(this, attribute)}
          >
          </TextField>
        </Grid>
      );
    }
  }

}
