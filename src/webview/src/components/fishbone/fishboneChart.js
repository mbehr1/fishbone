// todo add copyright to initial github repo! (MIT license from ...)

import React, {Component} from 'react';
import Grid from '../layout/grid';
import './fishboneChart.css';

const INITIAL_STATE = {causes: undefined, effect: undefined, index: 0};


export class FishboneElementUrl extends Component {
  render() {
    return (
      <a href={this.props.href || 'href missing!'}>
        {this.props.text || 'text missing!'}
      </a>
    );
  }
}  

export default class FishboneChart extends Component {
  constructor(props) {
    super(props);
    console.log(`FishboneChart constructor called. props.title=${props.title} props.reactInlineElementsAdder=${props.reactInlineElementsAdder}`);
    this.state = INITIAL_STATE;
    this.state.data = props.data;
  }

  componentDidUpdate(prevProps, prevState) {
    console.log(`FishboneChart didUpdate. lastPath=${JSON.stringify(this.lastPath)} 
        navPath=${JSON.stringify(this.navPath)} state.effect=${JSON.stringify(this.state.effect)}
        props.title=${JSON.stringify(this.props.title)}
        state.title=${JSON.stringify(this.state.title)}`);

    if (prevProps !== this.props) {
      console.log(`props changed!`);
    }

    if (('onNavigationChanged' in this.props) &&
    JSON.stringify(this.navPath) !== JSON.stringify(this.lastPath)) { // todo dirty! need to find a better solution
      console.log(`sending update`);
      this.lastPath = this.navPath;
      this.props.onNavigationChanged(this.navPath);
      return null;
    }
  }

  static getDerivedStateFromProps(props, state) {
    console.log(`FishboneChart getDerivedStateFromProps called. props.title=${props.title} state.title=${state.title}`);
    if (state.prevData !== state.data ||
            state.prevIndex !== state.index) {
      const [effect, causes] =
                state.data && state.data.length ?
                state.data[state.index] : ['no effects', []];
      return {
        prevData: state.data,
        data: state.data,
        causes: causes, // or categories?
        effect: effect,
        parentState: state.parentState,
        title: state.title || props.title,
      };
    }
  }

  selectDataset(index) {
    const data = this.state.data;
    if (data) {
      this.setState({index: index});
    }
  }

  selectChildFB(data, title) {
    this.setState({index: 0, data: data, parentState: this.state, title: title});
  }

  restoreState(state) {
    this.setState(state);
  }

  /*
componentWillMount() {
    // use only for initial timer,... on first rendering
}*/

  // componentWillUnmount() on dom element disappear

  render() {
    if (!this.state.causes) {
      console.log(`FishboneChart render no causes!`);
      return <React.Fragment></React.Fragment>;
    }

    return (
      <Grid cols={this.props.cols}>
        <div>{this.getParentNav()}</div>
        <div className="fishboneChart">
          {this.getCauses()}
          {this.getEffect()}
          {this.getLegend()}
        </div>
      </Grid >
    );
  }

  getHalfCauses(causes, top) {
    // we want them sorted from left to right always changing top/down, e.g.
    // 1 3 5
    //  2 4

    const halfArray = [];
    for (let i = top ? 0 : 1; i < causes.length; i += 2) {
      halfArray.push(causes[i]);
    }
    // top ? causes.slice(0, middle) : causes.slice(middle);

    const color = this.getColor(this.state.index);
    const halfCauses = halfArray.map((category, index) => {
      if (top) {
        return (
          <div key={`top_causes_${category[0]}_${index}`} className="causeContent">
            <div className={`cause top ${color}_ ${color}Border`}>
              {category[0]}
            </div>
            <div className="causeAndLine">
              {this.getRootCauses(category[1])}
              <div className={`diagonalLine ${color}TopBottom`} />
            </div>
          </div>
        );
      } else {
        return (
          <div key={`bottom_causes_${category[0]}_${index}`} className="causeContent">
            <div className="causeAndLine">
              {this.getRootCauses(category[1])}
              <div className={`diagonalLine ${color}BottomTop`} />
            </div>
            <div className={`cause bottom ${color}_ ${color}Border`}>
              {category[0]}
            </div>
          </div>
        );
      }
    });

    return (<div className="causesGroup">{halfCauses}</div>);
  }

  getRootCauses(rootCauses) {
    const causes = rootCauses.map((rootCause, index) => {
      if (typeof rootCause === 'string') {
        return (<div key={`root_causes_${rootCause}_${index}`}>{rootCause}</div>);
      } else { // todo check for Object
        switch (rootCause.type) {
          case 'Url':
            return (<div key={`root_causes_${rootCause.title}_${index}`} >{React.createElement(FishboneElementUrl, rootCause, null)} </div>);
          case 'react':
            // console.log(`FishboneChart.getRootCauses(type=${rootCause.type}, elementName=${rootCause.elementName})`);
            let fragment = null;
            try {
              console.log(`FishboneChart.getRootCauses(type=${rootCause.type}, elementName=${rootCause.elementName})elementsAdder=${this.props.reactInlineElementsAdder} `);
              if (!rootCause.elementName && this.props.reactInlineElementsAdder) {
                this.props.reactInlineElementsAdder(rootCause);
              }

              if (rootCause.elementName) {
                fragment = (<div key={`root_causes_${index}`}> {React.createElement(rootCause.elementName, rootCause.props, null)}</div>);
              } else {
                console.warn(`elementName undefined for element=${rootCause.element}`);
              }
            } catch (e) {
              console.error(`got error while creating rootcause.type 'react' elementName=${rootCause.elementName}. e=${e}`);
            }
            return fragment;
          case 'nested':
            console.log(`FishboneChart.getRootCauses(type=${rootCause.type}, elementName=${rootCause.elementName})`);
            return (<button key={`root_causes_${index}`} type="button" onClick={() => this.selectChildFB(rootCause.data, rootCause.title)} >{rootCause.title}</button>);
          default:
            return (<div key={`root_causes_${rootCause.title}_${index}`} >`unsupported type='{rootCause.type}'` </div>);
        }
      }
    });
    return (<div className="rootCauses">{causes}</div>);
  }

  getCauses() {
    const causes = this.state.causes;
    const color = this.getColor(this.state.index);
    return (
      <div className="causes">
        {this.getHalfCauses(causes, true)}
        <div className={`lineEffect ${color}Border`} />
        {this.getHalfCauses(causes, false)}
      </div>
    );
  }

  getEffect() {
    const color = this.getColor(this.state.index);
    return (
      <div className={`effect left ${color}_ ${color}Border`}>
        <div className={`effectValue`}>
          {this.state.effect}
        </div>
      </div>
    );
  }

  getLegend() {
    const labels = this.state.data.map((effect, index) => effect[0]);

    if (labels.length <= 1) {
      return;
    }

    const labelsDivs = labels.map((label, index) => {
      const labelClass = index === this.state.index ? 'label_' : 'labelLineThrough';
      const color = this.getColor(index);
      return (
        <div key={`labels_${label}_${index}`} className="legendLabel" onClick={() => this.selectDataset(index)}>
          <div className={`labelSquare legend all ${color}_dark ${color}Border`} />
          <div className={labelClass}>{label}</div>
        </div>
      );
    });

    return (
      <div className="legend">
        {labelsDivs}
      </div>
    );
  }

  getParentNav() {
    // render a breadcrumb like:
    // title / effect (only if more than 1)  [ / category / title / effect ]
    // this does not allow to choose effects...
    //
    // or
    //
    // render a tree for navigation like:
    // title
    // - effect
    //   |- category
    //      |- (root cause title)
    //         - effect
    //         - effect

    const navPath = [];

    let curObj = this.state;
    let parentState = undefined;
    while (curObj) {
        var callback = (thisObj, sta) => {
            return ()=> { thisObj.restoreState(sta); console.log(`callback called thisObj=${thisObj} sta=${JSON.stringify(sta)}`);}
        }
      // effect if more than 1:
      if (curObj.data.length > 1) {
        navPath.unshift({ref: curObj.data[curObj.index][0], onClick: callback(this, parentState)});
        // prefer to insert at effect not at title
        parentState = undefined;
      }
      // title
      navPath.unshift({ref: curObj.title || 'no title', onClick: callback(this, parentState)});
      parentState = curObj.parentState;
      curObj = parentState;
    }

    if ('onNavigationChanged' in this.props) {
      this.navPath = navPath;
      if (this.lastPath === undefined) {
        this.lastPath = navPath;
        this.props.onNavigationChanged(this.navPath); // todo this leads to the warning:
        // Cannot update during an existing state transition...
        // find a better way for it.
      }
      return null;
    }

    const breadCrumb = (<div>{navPath.map((elem) => elem.ref).join(' / ')}</div>);

    if (this.state.parentState) {
      return (
        < div>
          { breadCrumb}
          <button type="button" onClick={() => this.restoreState(this.state.parentState)} >back</button>
        </div >
      );
    } else {
      return (
        <div>
          {breadCrumb}
        </div>
      );
    }
  }

  getColor(index) {
    const colors = [
      'blue',
      'gray',
      'black',
      'green',
      'blue_two',
      'orange',
      'purple',
      'pink',

    ];

    if (index >= colors.length) {
      index %= colors.length;
    }

    return colors[index];
  }
}
