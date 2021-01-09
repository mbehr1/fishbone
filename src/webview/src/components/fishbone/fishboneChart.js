// copyright (c) Matthias Behr, 2020 - 2021
// based on the ...
// todo add copyright to initial github repo! (MIT license from ...)

/**
 * represents a "controlled" / "stateless component" )
 * (if we have to use some state it'll be a "functional component"
 */


import React from 'react';
import Grid from '../layout/grid';
import OnBlurInputBase from '../onBlurInputBase';

import './fishboneChart.css';

import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Input from '@material-ui/core/Input';
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
    console.log(`FishboneChart render no causes! props=`, props);
    return <React.Fragment></React.Fragment>;
  }
  const vscodeStyles = window.getComputedStyle(document.body);

  const getColor = (index) => {
      const colors = [
        'blue_two',
        'gray',
        'black',
        'green',
        'blue',
        'orange',
        'purple',
        'pink',
  
      ];
    
        if (index >= colors.length) {
          index %= colors.length;
        }
    
        return colors[index];
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
    
      const effectIndexColor = getColor(effectIndex);

  const getRootCauses = (rootCauses, category) => {
      // todo do we need unique keys everywhere?
        const causes = rootCauses.map((rootCause, index) => {
          let fragment = null;
          if (typeof rootCause === 'string') {
            fragment = (<div key={`root_causes_${rootCause}_${index}`}>{rootCause}</div>);
          } else { // todo check for Object
            switch (rootCause.type) {
              case 'Url':
                fragment =  (<div key={`root_causes_${rootCause.title}_${index}`} >{React.createElement(FishboneElementUrl, rootCause, null)} </div>);
                break;
              case 'react':
                // console.log(`FishboneChart.getRootCauses(type=${rootCause.type}, element=${rootCause.element} props=${JSON.stringify(rootCause.props)})`);
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
                break;
              case 'nested':
                // console.log(`FishboneChart.getRootCauses(type=${rootCause.type}, elementName=${rootCause.elementName})`);
                // margin-left 1 px <- to align the outer border with the checkboxes
                // padding: 1px top/bottom to ensure that the size is same as regular root cause
                // padding: 20px left: to align the text inside with the other root causes text. take care the other root causes have 0.85rem, this one 0.8125rem, 
                fragment = (<Button style={{ 'marginLeft': '1px', 'padding': '1px 9px 1px 20px', 'justifyContent': 'left' }} fullWidth size="small" variant="outlined" color="primary" key={`root_causes_${index}`} onClick={() => props?.onStateChange({ childFBData: [rootCause.data, rootCause.title] })} >{rootCause.title}</Button>);
                break;
              default:
                fragment= (<div key={`root_causes_${rootCause.title}_${index}`} >`unsupported type='{rootCause.type}'` </div>);
                break;
            }
          }
          // context menu?
          // todo the key for Menu needs to be unique! add uuid?
          if (props.rootCauseContextMenu && props.rootCauseContextMenu.length>0) {
            const keyFrag = typeof rootCause === 'string' ? `${rootCause}_${index}` : `${JSON.stringify(rootCause)}_${index}`;
            return (
              <div style={{height: '100%', width:'100%', display:'flex', 'align-items':'baseline'}}>
                <div style={{position: 'relative', width:'95%'}}>
                {fragment}
                </div>
                <div style={{position: 'relative', width:'5%'}}>
                  <IconButton id={`rcMore_${keyFrag}`} onClick={handleMenuClick} color="secondary" size="small"><MoreVertIcon fontSize="small" /></IconButton>
                  <Menu key={`cm_root_causes_${keyFrag}`} anchorEl={menuAnchorEl} keepMounted open={menuOpen === `rcMore_${keyFrag}`} onClose={handleMenuClose}>
                    {props.rootCauseContextMenu.filter(m => m !== undefined).map((menuItem, index) => <MenuItem onClick={(event) => { handleMenuClose(); menuItem?.cb(props.data, effectIndex, category, rootCause); }}>{menuItem.text}</MenuItem>)}
                </Menu>
                </div>
              </div>
            );
          }else{
            return fragment;
          }
        });
        return (<div className="rootCauses">{causes}</div>);
      }

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
              <OnBlurInputBase style={{ height: '1em' }} margin='dense' value={category.name} onChange={(event) => props.onChange(category, event, 'name')} />
              {props.categoryContextMenu && props.categoryContextMenu.length > 0 && /* todo race cond if all items are undefined... */
                <React.Fragment>
                <IconButton id={`top_cat_${index}`} onClick={handleMenuClick} color="secondary" size="small" style={{ color: vscodeStyles.getPropertyValue('--vscode-button-secondaryForeground'), backgroundColor: vscodeStyles.getPropertyValue('--vscode-button-secondaryBackground'), }} ><MoreVertIcon fontSize="small" /></IconButton>
                  <Menu id={`top_cat_${index}`} anchorEl={menuAnchorEl} keepMounted open={menuOpen === `top_cat_${index}`} onClose={handleMenuClose}>
                    {props.categoryContextMenu.filter(m => m !== undefined).map((menuItem, index) => <MenuItem onClick={() => { handleMenuClose(); menuItem?.cb(props.data, effectIndex, category); }}>{menuItem.text}</MenuItem>)}
                  </Menu>
                </React.Fragment>
              }

            </div>
            <div className="causeAndLine">
              {getRootCauses(category.rootCauses, category)}
              <div className={`diagonalLine ${color}TopBottom`} />
            </div>
          </div>
        );
      } else {
        return (
          <div key={`bottom_causes_${category.name}_${index}`} className="causeContent">
            <div className="causeAndLine">
              {getRootCauses(category.rootCauses, category)}
              <div className={`diagonalLine ${color}BottomTop`} />
            </div>
            <div className={`cause bottom ${color}_ ${color}Border`}>
              <OnBlurInputBase style={{ height: '1em' }} margin='dense' value={category.name} onChange={(event) => props.onChange(category, event, 'name')} />
              {props.categoryContextMenu && props.categoryContextMenu.length > 0 &&
                <React.Fragment>
                <IconButton id={`bottom_cat_${index}`} onClick={handleMenuClick} color="secondary" size="small" style={{ color: vscodeStyles.getPropertyValue('--vscode-button-secondaryForeground'), backgroundColor: vscodeStyles.getPropertyValue('--vscode-button-secondaryBackground'), }}><MoreVertIcon fontSize="small" /></IconButton>
                  <Menu id={`bottom_cat_${index}`} anchorEl={menuAnchorEl} keepMounted open={menuOpen === `bottom_cat_${index}`} onClose={handleMenuClose}>
                    {props.categoryContextMenu.filter(m => m !== undefined).map((menuItem, index) => <MenuItem onClick={() => { handleMenuClose(); menuItem?.cb(props.data, effectIndex, category); }}>{menuItem.text}</MenuItem>)}
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
              <IconButton id={`effect_${effectIndex}`} onClick={handleMenuClick} color="secondary" size="small" style={{ color: vscodeStyles.getPropertyValue('--vscode-button-secondaryForeground'), backgroundColor: vscodeStyles.getPropertyValue('--vscode-button-secondaryBackground'), }}><MoreVertIcon fontSize="small" /></IconButton>
                <Menu anchorEl={menuAnchorEl} keepMounted open={menuOpen === `effect_${effectIndex}`} onClose={handleMenuClose}>
                {props.effectContextMenu.filter(e => e !== undefined).map((menuItem, index) => <MenuItem onClick={() => { handleMenuClose(); menuItem?.cb(props.data, effectIndex); }}>{menuItem.text}</MenuItem>)}
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
