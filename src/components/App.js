import React, {Component} from 'react';
import {
  Switch,
  Route,
	NavLink
} from 'react-router-dom';


import Chat from './Chat';
import Contacts from './Contacts';
import FileShare from './FileShare';
import Call from './Call';
import Details from './Details';
import Error from './Error';
import '../styles/App.css';
//import logo from '../logo.svg';

class App extends Component {
  render() {
    return (
        <div className="App">
          <header className="App-header">
						<div className="container row">
							{/*<div className="logo-container col">
							<img src={logo} className="App-logo" alt="logo"/>
							</div>*/}
							<div className="title-container col">
								<h2 className="App-title">HandOff</h2>
							</div>
						</div>
            <nav className="nav">
							<div className="container">
	             <ul className="nav__list row">
	               <li className="nav__item col">
								 	<NavLink exact={true} to="/" id="navcontacts" className="nav__link" activeClassName="nav--active">Contacts</NavLink></li>
	               <li className="nav__item col">
								 	<NavLink to="/chat" className="nav__link" activeClassName="nav--active">Chat</NavLink></li>
	               <li className="nav__item col">
								 	<NavLink to="/file-share" className="nav__link" activeClassName="nav--active">Share</NavLink></li>
	             </ul>
						  </div>
            </nav>
        </header>
        <main className="container">
          <Switch>
            <Route exact path='/' component={Contacts} />
            <Route path='/chat' component={Chat} />
            <Route path='/file-share' component={FileShare} />
            <Route path='/call' component={Call} />
            <Route path='/details' component={Details} />
						<Route component={Error}/>
          </Switch>
        </main>
      </div>
    );
  }
}

export default App;
