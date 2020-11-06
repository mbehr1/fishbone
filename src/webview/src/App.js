/**
 * copyright (c) 2020, Matthias Behr
 * 
 * todo list:
 * - make FishboneChart fully controlled or fully uncontrolled: https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
 * - ensure that real state changes (zoom in, effect selection) get stored in .fba and vscode.state
 * - use Chips instead of texts (allowing always to set the <DoneIcon />?)
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
import { FormControlLabel, IconButton, Container, TextField } from '@material-ui/core';
// import { makeStyles } from '@material-ui/core/styles';
import EditIcon from '@material-ui/icons/Edit';
import Grid from '@material-ui/core/Grid';
//import MenuItem from '@material-ui/core/MenuItem';
import InputDataProvided from './components/dataProvider';
import FBACheckbox from './components/fbaCheckbox';
import { receivedResponse } from './util';

class MyCheckbox extends Component {
  render() {
    return (
      <Container>
        <Tooltip title={`a tooltip for ${this.props.name}`}>
          <FormControlLabel control={
            <Checkbox {...this.props} color="primary"></Checkbox>
          } label={this.props.label}
          />
        </Tooltip >
        <IconButton aria-label="edit">
          <EditIcon fontSize="small" />
        </IconButton>
      </Container>
    );
  }
}

export default class App extends Component {

  fbChartKey = 0; // todo once FishboneChart is a controlled component this can be removed.

  logMsg(msg) {
    console.log('logPostMsg:' + msg);
    this.props.vscode.postMessage({ type: 'log', message: 'logMsg:' + msg });
  }

  addInlineElements = (rootcause) => {
    if (typeof rootcause === 'object') {
      console.log(`addInlineElements found object rootcause:'${JSON.stringify(rootcause)}'`);
      if (rootcause.type === 'react') {
        if (!('elementName' in rootcause)) {
          switch (rootcause.element) {
            case 'MyCheckbox': rootcause.elementName = MyCheckbox; rootcause.props.onChange = this.handleInputChange.bind(this, rootcause); break;
            case 'FBACheckbox': rootcause.elementName = FBACheckbox; rootcause.props.onChange = this.handleInputChange.bind(this, rootcause); break;
            default: // do nothing
              break;
          }
        }
      }
    }
  }

  parseFBData(data) {
    // parse data for known react classes and replace them (in the same object) 
    // data consists of:
    // [effect_cat]
    // effect_cat = [effect,categories]
    // categories = [category, [root causes]]
    for (const effect_cat of data) {
      // eslint-disable-next-line no-unused-vars
      const [effect, categories] = effect_cat;


      // eslint-disable-next-line no-unused-vars
      for (const [category, rootCauses] of categories) {
        for (const rootcause of rootCauses) {
          this.addInlineElements(rootcause);
        }
      }
    }
  }

  constructor(props) {
    super(props);
    //this.handleInputChange = this.handleInputChange.bind(this);

    const vsCodeState = props.vscode.getState();

    // need to convert to class names...
    this.parseFBData(vsCodeState?.data || []);

    console.log(`vsCodeState=${JSON.stringify(vsCodeState)}`);

    this.state = vsCodeState || (props.initialData ? { data: props.initialData, title: "<no title>" } : { data: [], title: "<no title>" });

    this.logMsg(`from App/constructor state.title=${this.state.title}`);
    window.addEventListener('message', event => {
      const msg = event.data;
      console.log(`App received msg:`);
      console.log(msg);
      switch (msg.type) {
        case 'update':
          // we store the non-modified data in vscode.state (e.g. with react:MyCheckbox as string)
          this.props.vscode.setState({ data: msg.data, title: msg.title, attributes: msg.attributes }); // todo shall we store any other data?
          this.parseFBData(msg.data); // modifies msg.data
          // update the FishboneChart completely (as props changes are not handled correctly! (todo))
          this.fbChartKey++;
          this.setState({ data: msg.data, title: msg.title, attributes: msg.attributes });

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

  handleInputChange(object, event, propsField) {
    // if propsField is provided this determines the field to update (e.g. object.props[propsField]=...)
    const target = event.target;
    let value = target.type === 'checkbox' ? target.checked : target.value;

    const propsFieldName = (propsField !== undefined) ? propsField : (target.type === 'checkbox' ? 'checked' : 'value');

    const name = target.name;
    const id = target.id;
    console.log(`App.handleInputChange(id=${id}, type=${target.type}, name=${name}, value=${value} propsField=${propsField} key=${target.key} object.keys=${Object.keys(object).toString()})`);

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
      if ('props' in object) { object.props[propsFieldName] = value; didUpdate = true; } else {
        // for attributes object contains just one key: (the name)
        if (Object.keys(object).length === 1) {
          console.log(`App.handleInputChange found attribute like object to update: ${JSON.stringify(object)}`);
          const curValue = object[Object.keys(object)[0]];
          if (typeof curValue === 'object') {
            const attrObj = curValue;
            console.log(`App.handleInputChange found object inside attribute to update: ${JSON.stringify(attrObj)}`);
            if (propsFieldName in attrObj) {
              attrObj[propsFieldName] = value;
              didUpdate = true;
              console.log(`App.handleInputChange updated object inside attribute to: ${JSON.stringify(object)}`);
            }
          } else {
            // update that one directly
            object[Object.keys(object)[0]] = value;
            console.log(`App.handleInputChange updated flat attribute to: ${JSON.stringify(object)}`);
            didUpdate = true;
          }
        }
      }
    }

    if (didUpdate) {
      console.log(`updated object to ${JSON.stringify(object)}`);
      // update state... (todo...think about how to do this best)
      this.setState({});
      // this.state.data might not be updated yet but it doesn't matter as we modified the object directly...
      this.props.vscode.setState({ data: this.state.data, title: this.state.title, attributes: this.state.attributes }); // todo shall we store any other data?

      // we parse and unparse to get rid of the elementName modifications... (functions)
      this.props.vscode.postMessage({ type: 'update', data: JSON.parse(JSON.stringify(this.state.data)), title: this.state.title, attributes: this.state.attributes });
    } else {
      console.warn(`App.handleInputChange didn't found property to update!`);
    }
  }

  render() {
    console.log(`App render state.data: ${JSON.stringify(this.state.data)}`);

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

    return (
      <div className="App">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Breadcrumbs aria-label="breadcrumb">
              <Link color="primary" href="/">Material-UI</Link>
              <Link color="primary" href="/">path2</Link>
            </Breadcrumbs>
          </Grid>
          <Grid item xs={12}>
            <Paper>
              <FishboneChart key={this.fbChartKey.toString()} reactInlineElementsAdder={this.addInlineElements} onChange={this.handleInputChange} data={this.state.data} title={this.state.title} cols="12" />
            </Paper>
          </Grid>
          <Grid item xs={6}>
            {attributeSection}
          </Grid>
        </Grid>
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
