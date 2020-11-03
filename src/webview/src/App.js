/**
 * copyright (c) 2020, Matthias Behr
 * 
 * todo list:
 * - make FishboneChart fully controlled or fully uncontrolled: https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
 * - ensure that real state changes (zoom in, effect selection) get stored in .fba and vscode.state
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
import { FormControlLabel } from '@material-ui/core';

class MyCheckbox extends Component {
  render() {
    return (<FormControlLabel control={<Tooltip title={`a tooltip for ${this.props.name}`}><Checkbox color="primary"></Checkbox></Tooltip>} label={this.props.name} />);
  }
}

export default class App extends Component {

  fbChartKey = 0;

  logMsg(msg) {
    console.log('logPostMsg:' + msg);
    this.props.vscode.postMessage({ type: 'log', message: 'logMsg:' + msg });
  }

  static parseFBData(data) {
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
              switch (rootcause.elementName) {
                case 'MyCheckbox': rootcause.elementName = MyCheckbox; break;
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

    const vsCodeState = props.vscode.getState();

    // need to convert to class names...
    App.parseFBData(vsCodeState?.data || []);

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
          App.parseFBData(msg.data); // modifies msg.data
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
          <FishboneChart key={this.fbChartKey} data={this.state.data} title={this.state.title} cols="12" />
        </Paper>
      </div>
    );
  }
}
