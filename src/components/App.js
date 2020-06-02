import React, {Component} from 'react';
import {
  Switch,
  Route,
	NavLink
} from 'react-router-dom';
import classnames from 'classnames';
import '@fortawesome/fontawesome-free/css/all.css';

import {ChatContainer} from './Chat';
import {ContactsContainer} from './Contacts';
import FileShare from './FileShare';
import {CallContainer} from './Call';
import Error from './Error';
import {DEFAULT_ROOM} from '../constants/Namespace';
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
								 	<NavLink to={{ pathname: '/chat/'.concat(DEFAULT_ROOM), state: {room: DEFAULT_ROOM, type: 'chat'} }} className="nav__link" activeClassName="nav--active">Chat</NavLink></li>
	               <li className="nav__item col">
								 	<NavLink to="/file-share" className="nav__link" activeClassName="nav--active">Share</NavLink></li>
	             </ul>
						  </div>
            </nav>
        </header>
        <main>
          <Switch>
            <Route exact path='/' render={(props) => <ContactsContainer {...props} user={this.props.user}/>} />
            <Route path='/chat' render={(props) => <ChatContainer {...props} user={this.props.user}/>} />
            <Route path='/file-share' render={(props) => <FileShare {...props} user={this.props.user}/>} />
            <Route path='/call' render={(props) => <CallContainer {...props} user={this.props.user}/>} />
						<Route component={Error}/>
          </Switch>
        </main>
      </div>
    );
  }
}

export default App;
