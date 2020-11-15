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

import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Input from '@material-ui/core/Input';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import MoreVertIcon from '@material-ui/icons/MoreVert';

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
// *cols
// reactInlineElementsAdder...
// onChange, for persisted data
// onStateChange, for not-necessarilly persisted data like effect selected of nested fb chosen
//  effectIndex: x
//  childFBData: [data, title] (or null -> prev.)

// data
// effectIndex

export default function FishboneChart(props) {

  const effectIndex = props?.effectIndex ? props.effectIndex : 0;
  const effect = props?.data.length ?
    props.data[effectIndex] : { name: 'no effects', rootCauses: [] };

  const categories = effect.categories;

  // popup menu e.g. for category del,...
  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(0);

  if (!categories) {
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
    

  const effectIndexColor = getColor(effectIndex);

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
                  //console.log(`FishboneChart.getRootCauses(type=${rootCause.type}, elementName=${rootCause.elementName})elementsAdder=${props.reactInlineElementsAdder} `);
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
                return (<button class="nestedRootCauses" key={`root_causes_${index}`} type="button" onClick={() => props?.onStateChange({ childFBData: [rootCause.data, rootCause.title] })} >{rootCause.title}</button>);
              default:
                return (<div key={`root_causes_${rootCause.title}_${index}`} >`unsupported type='{rootCause.type}'` </div>);
            }
          }
        });
        return (<div className="rootCauses">{causes}</div>);
      }

  const handleMenuClick = (event) => {
    console.log(`handleMenuClick event.currentTarget.id=${event.currentTarget.id}`, event.currentTarget);
    setMenuAnchorEl(event.currentTarget);
    setMenuOpen(event.currentTarget.id);
  };

  const handleMenuClose = () => {
    setMenuOpen(0)
    //setMenuAnchorEl(null);
  };

  const getHalfCategories = (categories, top) => {
        // we want them sorted from left to right always changing top/down, e.g.
        // 1 3 5
        //  2 4
    
        const halfArray = [];
    for (let i = top ? 0 : 1; i < categories.length; i += 2) {
      halfArray.push(categories[i]);
        }
        // top ? causes.slice(0, middle) : causes.slice(middle);
    
        const color = effectIndexColor;
        const halfCauses = halfArray.map((category, index) => {
          if (top) {
            // todo optimize so that we do use only one menu instance?
            return (
              <div key={`top_causes_${category.name}_${index}`} className="causeContent">
                <div className={`cause top ${color}_ ${color}Border`}>
                  <InputBase style={{ height: '1em' }} margin='dense' value={category.name} onChange={(event) => props.onChange(category, event, 'name')} />
                  {props.categoryContextMenu && props.categoryContextMenu.length > 0 &&
                    <React.Fragment>
                      <IconButton id={`top_cat_${index}`} onClick={handleMenuClick} size="small"><MoreVertIcon fontSize="small" /></IconButton>
                      <Menu id={`top_cat_${index}`} anchorEl={menuAnchorEl} keepMounted open={menuOpen === `top_cat_${index}`} onClose={handleMenuClose}>
                        {props.categoryContextMenu.map((menuItem, index) => <MenuItem onClick={() => { handleMenuClose(); menuItem?.cb(props.data, effectIndex, category); }}>{menuItem.text}</MenuItem>)}
                      </Menu>
                    </React.Fragment>
                  }

                </div>
                <div className="causeAndLine">
                  {getRootCauses(category.rootCauses)}
                  <div className={`diagonalLine ${color}TopBottom`} />
                </div>
              </div>
            );
          } else {
            return (
              <div key={`bottom_causes_${category.name}_${index}`} className="causeContent">
                <div className="causeAndLine">
                  {getRootCauses(category.rootCauses)}
                  <div className={`diagonalLine ${color}BottomTop`} />
                </div>
                <div className={`cause bottom ${color}_ ${color}Border`}>
                  <InputBase style={{ height: '1em' }} margin='dense' value={category.name} onChange={(event) => props.onChange(category, event, 'name')} />
                  {props.categoryContextMenu && props.categoryContextMenu.length > 0 &&
                    <React.Fragment>
                      <IconButton id={`bottom_cat_${index}`} onClick={handleMenuClick} size="small"><MoreVertIcon fontSize="small" /></IconButton>
                      <Menu id={`bottom_cat_${index}`} anchorEl={menuAnchorEl} keepMounted open={menuOpen === `bottom_cat_${index}`} onClose={handleMenuClose}>
                        {props.categoryContextMenu.map((menuItem, index) => <MenuItem onClick={() => { handleMenuClose(); menuItem?.cb(props.data, effectIndex, category); }}>{menuItem.text}</MenuItem>)}
                      </Menu>
                    </React.Fragment>
                  }
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
            {getHalfCategories(categories, true)}
                <div className={`lineEffect ${color}Border`} />
            {getHalfCategories(categories, false)}
            </div>
        );
    };

    const getEffect = ()=> {
        const color = effectIndexColor;
        return (
          <div className={`effect left ${color}_ ${color}Border`}>
            <div className={`effectValue`}>
              <Input multiline value={effect.name} style={{ width: 100 }} onChange={(event) => props.onChange(effect, event, 'name')} />
            </div>
            {props.effectContextMenu && props.effectContextMenu.length > 0 &&
              <React.Fragment>
                <IconButton id={`effect_${effectIndex}`} onClick={handleMenuClick} size="small"><MoreVertIcon fontSize="small" /></IconButton>
                <Menu anchorEl={menuAnchorEl} keepMounted open={menuOpen === `effect_${effectIndex}`} onClose={handleMenuClose}>
                  {props.effectContextMenu.map((menuItem, index) => <MenuItem onClick={() => { handleMenuClose(); menuItem?.cb(props.data, effectIndex); }}>{menuItem.text}</MenuItem>)}
              </Menu>
            </React.Fragment>
            }
          </div>
        );
      }
      
      const getLegend = () => {
        const effectLabels = props.data.map((effect, index) => effect.name.slice(0, 12));
    
        if (effectLabels.length <= 1) {
          return;
        }
    
        const labelsDivs = effectLabels.map((label, index) => {
          const labelClass = index === effectIndex ? 'label_' : 'labelLineThrough';
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
