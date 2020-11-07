// copyright (c) Matthias Behr, 2020
// based on the ...
// todo add copyright to initial github repo! (MIT license from ...)

/**
 * represents a "controlled" / "stateless component" )
 * (if we have to use some state it'll be a "functional component"
 */


import React from 'react';
import Grid from '../layout/grid';
import './fishboneChart.css';

// const INITIAL_STATE = {causes: undefined, effect: undefined, index: 0};

/**
 * Component to represent URLs/Links inside a fishbone chart.
 * Can be use via rootcause type "Url"
 * @param {*} props 
 */
export function FishboneElementUrl(props) {
    return (
        <a href={props.href || 'href missing!'}>
            {props.text || 'text missing!'}
        </a>
    );
}

// todo add PropTypes
// title
// *cols
// reactInlineElementsAdder...
// onChange, for persisted data
// onStateChange, for not-necessarilly persisted data like effect selected of nested fb chosen
//  effectIndex: x
//  childFBData: [data, title] (or null -> prev.)

// data
// effectIndex

export default function FishboneChart(props) {

    const [effect, causes] = props?.data.length ?
        props.data[props?.effectIndex ? props.effectIndex : 0] : ['no effects', []];

    if (!causes) {
      console.log(`FishboneChart render no causes!`);
      return <React.Fragment></React.Fragment>;
    }

    const getColor = (index) => {
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
    

    const effectIndexColor = getColor(props?.effectIndex ? props.effectIndex : 0);

    const getRootCauses = (rootCauses) => {
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
                  console.log(`FishboneChart.getRootCauses(type=${rootCause.type}, elementName=${rootCause.elementName})elementsAdder=${props.reactInlineElementsAdder} `);
                  if (!rootCause.elementName && props.reactInlineElementsAdder) {
                    props.reactInlineElementsAdder(rootCause);
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
                return (<button key={`root_causes_${index}`} type="button" onClick={() => props?.onStateChange({childFBData: [rootCause.data, rootCause.title]})} >{rootCause.title}</button>);
              default:
                return (<div key={`root_causes_${rootCause.title}_${index}`} >`unsupported type='{rootCause.type}'` </div>);
            }
          }
        });
        return (<div className="rootCauses">{causes}</div>);
      }

    const getHalfCauses = (causes, top) => {
        // we want them sorted from left to right always changing top/down, e.g.
        // 1 3 5
        //  2 4
    
        const halfArray = [];
        for (let i = top ? 0 : 1; i < causes.length; i += 2) {
          halfArray.push(causes[i]);
        }
        // top ? causes.slice(0, middle) : causes.slice(middle);
    
        const color = effectIndexColor;
        const halfCauses = halfArray.map((category, index) => {
          if (top) {
            return (
              <div key={`top_causes_${category[0]}_${index}`} className="causeContent">
                <div className={`cause top ${color}_ ${color}Border`}>
                  {category[0]}
                </div>
                <div className="causeAndLine">
                        {getRootCauses(category[1])}
                  <div className={`diagonalLine ${color}TopBottom`} />
                </div>
              </div>
            );
          } else {
            return (
              <div key={`bottom_causes_${category[0]}_${index}`} className="causeContent">
                <div className="causeAndLine">
                        {getRootCauses(category[1])}
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

    const getCauses = () => {
        const color = effectIndexColor;
        return (
            <div className="causes">
                {getHalfCauses(causes, true)}
                <div className={`lineEffect ${color}Border`} />
                {getHalfCauses(causes, false)}
            </div>
        );
    }


    const getEffect = ()=> {
        const color = effectIndexColor;
        return (
          <div className={`effect left ${color}_ ${color}Border`}>
            <div className={`effectValue`}>
              {effect}
            </div>
          </div>
        );
      }
      
      const getLegend = () => {
        const effectLabels = props.data.map((effect, index) => effect[0]);
    
        if (effectLabels.length <= 1) {
          return;
        }
    
        const labelsDivs = effectLabels.map((label, index) => {
          const labelClass = index === props.effectIndex ? 'label_' : 'labelLineThrough';
          const color = getColor(index);
          return (
            <div key={`labels_${label}_${index}`} className="legendLabel" onClick={() => props?.onStateChange({effectIndex: index})} >
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
    
    return (
        <Grid cols={props.cols}>
            <div className="fishboneChart">
                {getCauses()}
                {getEffect()}
                {getLegend()}
            </div>
        </Grid >
    );
}

/*

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
*/
