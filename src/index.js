import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter} from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { v5 as uuidv5 } from 'uuid';

import defaultName from './name-gen.js';
import setupSocket from './socket';
import combinedReducer from './reducers';
import './index.css';
import App from './components/App';
import * as serviceWorker from './serviceWorker';
import rootSaga from './sagas';
import * as uid from './constants/Namespace';

const sagaMiddleware = createSagaMiddleware();
const appStore = createStore(combinedReducer, applyMiddleware(sagaMiddleware));

let name = null;
let defaultId = '';
if (localStorage.getItem("handoff-user")===null) {
	do{
		defaultId = uuidv5(defaultName,uid.NAMESPACE);
		name = prompt("Please enter a unique name or confirm the generated name below", defaultName);
		if (name !== null){
		localStorage.setItem("handoff-user", JSON.stringify({id: defaultId, name: name}));
		}
	} while(!name);
}
const user = JSON.parse(localStorage.getItem("handoff-user"));
const socket = setupSocket(appStore.dispatch, user);
sagaMiddleware.run(rootSaga, {socket, user});

ReactDOM.render(
  <React.StrictMode>
		<Provider store={appStore}>
			<BrowserRouter>
	    	<App user={user}/>
			</BrowserRouter>
		</Provider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
