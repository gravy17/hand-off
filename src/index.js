import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

//Move this elsewhere when logic to take name as user is added
import { v5 as uuidv5 } from 'uuid';
import * as uid from './constants/Namespace';
//
import defaultName from './name-gen.js';
import { addContact } from './actions';
import combinedReducer from './reducers';
import './index.css';
import App from './components/App';
import * as serviceWorker from './serviceWorker';

const appStore = createStore(combinedReducer);

//Move this elsewhere when logic to take name as user is added
const name = defaultName;
appStore.dispatch(addContact(name, uuidv5(name, uid.NAMESPACE)))
//

ReactDOM.render(
  <React.StrictMode>
		<Provider store={appStore}>
			<BrowserRouter>
	    	<App />
			</BrowserRouter>
		</Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
