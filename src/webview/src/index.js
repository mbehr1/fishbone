import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { getVsCode } from './util';

console.log(`index.js started... initialData=${JSON.stringify(window.initialData)}`);

const vscode = getVsCode();
vscode.postMessage({ type: 'log', message: 'in webview/src/index.js' });

ReactDOM.render(
  <React.StrictMode>
    <App
      vscode={vscode}
      initialData={
        vscode.isStandaloneApi
          ? [
              {
                name: '<enter effect to analyse>',
                categories: [
                  {
                    name: 'category 1',
                    rootCauses: [],
                  },
                ],
              },
            ]
          : undefined
      }
    />
  </React.StrictMode>,
  document.getElementById('root')
);
