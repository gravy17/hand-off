import React, {Component} from 'react';
import {
  Switch,
  Route,
	NavLink
} from 'react-router-dom';
import classnames from 'classnames';
import '@fortawesome/fontawesome-free/css/all.css';

import {ChatContainer} from './Chat';
import {DEFAULT_ROOM} from '../constants/Namespace';
import Contacts from './Contacts';
import FileShare from './FileShare';
import Call from './Call';
import Details from './Details';
import Error from './Error';
import '../styles/App.css';
//import logo from '../logo.svg';


//server: import webrtc, declare server, users, broadcast(send data to each client), on connection- handle user & room reg- modify store & broadcast, on close- remove from userlist and broadcast
//client: import actiontypes and creators, setup socket, add user on socket open, onmessage- dispatch appropriate actions based on type, return socket


class App extends Component {
	constructor(props){
		super(props);
		this.state= {lastScroll: window.pageYOffset, headerVisible: true};
		this.handleScroll = this.handleScroll.bind(this);
	}

	componentDidMount() {
		window.addEventListener('scroll', this.handleScroll);
	}

	componentWillUnmount() {
		window.removeEventListener('scroll', this.handleScroll);
	}

	handleScroll = () => {
		const { lastScroll } = this.state;
		const currScroll = window.pageYOffset;
		const headerVisible = lastScroll > currScroll;
		this.setState({
			lastScroll: currScroll,
			headerVisible: headerVisible
		})
	}
	render() {
    return (
        <div className="App">
          <header className={classnames("App-header", {"App-header--hidden": !this.state.headerVisible} )}>
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
        <main>
          <Switch>
            <Route exact path='/' component={Contacts} />
            <Route path='/chat' component={() => <ChatContainer newRoomId={DEFAULT_ROOM}/>} />
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
