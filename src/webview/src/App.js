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
import Filter1Icon from '@material-ui/icons/Filter1';
import FishboneChart from './components/fishbone/fishboneChart'
import { FormControlLabel, IconButton, Container } from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';


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
          if (typeof rootcause === 'object') {
            console.log(`found object rootcause:'${JSON.stringify(rootcause)}'`);
            if (rootcause.type === 'react') {
              switch (rootcause.element) {
                case 'MyCheckbox': rootcause.elementName = MyCheckbox; rootcause.props.onChange = this.handleInputChange.bind(this, rootcause); break;
                default: // do nothing
                  break;
              }
            }
          }
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
          this.props.vscode.setState({ data: msg.data, title: msg.title }); // todo shall we store any other data?
          this.parseFBData(msg.data); // modifies msg.data
          // update the FishboneChart completely (as props changes are not handled correctly! (todo))
          this.fbChartKey++;
          this.setState({ data: msg.data, title: msg.title });

          break;
        default:
          console.warn(`App received unknown type=${msg.type} msg:`);
          console.log(msg);      
            break;
      }
    });

  }

  handleInputChange(object, event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    const id = target.id;
    console.log(`App.handleInputChange(id=${id}, type=${target.type}, name=${name}, value=${value} key=${target.key} object.keys=${Object.keys(object).toString()})`);
    if ('props' in object) {
      if (target.type === 'checkbox') {
        object.props.checked = value;
      }
      console.log(`updated object to ${JSON.stringify(object)}`);
      // update state... (todo...think about how to do this best)
      this.setState({});
      // this.state.data might not be updated yet but it doesn't matter as we modified the object directly...
      this.props.vscode.setState({ data: this.state.data, title: this.state.title }); // todo shall we store any other data?

      // we parse and unparse to get rid of the elementName modifications... (functions)
      this.props.vscode.postMessage({ type: 'update', data: JSON.parse(JSON.stringify(this.state.data)), title: this.state.title });
    }
  }

  render() {
    console.log(`App render state.data: ${JSON.stringify(this.state.data)}`);
    return (
      <div className="App">
        <Breadcrumbs aria-label="breadcrumb">
          <Link color="inherit" href="/">Material-UI</Link>
          <Link color="inherit" href="/">path2</Link>
        </Breadcrumbs>
        <Filter1Icon />
        <Paper>
          <FishboneChart key={this.fbChartKey.toString()} onChange={this.handleInputChange} data={this.state.data} title={this.state.title} cols="12" />
        </Paper>
      </div>
    );
  }
}
