import React, {Component} from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { v5 as uuidv5 } from 'uuid';

import {createRoom, joinRoom} from '../actions';
import {UserList} from './UserList';
import * as uid from '../constants/Namespace';


class Contacts extends Component {
	constructor(props) {
		super(props);
		this.state = {videoRedirect: false, audioRedirect: true,
	  self: props.user.name,
		selfid: props.user.id, roominput: ''};
		this.handleChange = this.handleChange.bind(this);
		this.startCall = this.startCall.bind(this);
		this.joinCall = this.joinCall.bind(this);
	}

	handleChange (event) {
		this.setState({roominput: event.target.value});
	}

	startCall (type) {
		var t = new Date().toLocaleString();
		var str = this.state.self.concat(t);
		var newId = uuidv5(str, uid.NAMESPACE);
		newId = prompt("Edit or Copy and Share this id to others so they can enter the call(You can also find it in the url after '/call/'): \n", newId);
		this.props.create(("Room-").concat(this.state.self),newId, this.state.self);
	  setTimeout(this.props.history.push(
			{ pathname: '/call/'+newId,
				state: {
					room: newId,
					type: type
				}
			}
		), 2000);
	}

	joinCall (type) {
		let id = this.state.roominput;
		this.props.join(id, this.state.self);
	  setTimeout(this.props.history.push({
			pathname: '/call/'+id,
			state: {
				room: id,
				type: type
			}
		}), 10000);
	}

  render() {
		const contacts = this.props.contacts.filter(user => user.id !== this.state.selfid);
    return (
			<div className="page">
				<ul className="userlist">
				<li className="userlist__name"><span className="online-dot"></span>{this.state.self}(Me)<br/>id: {this.state.selfid}</li>
				</ul>
				<div className="inputRow">
				<input type="text" id="callRoom" placeholder="Type/Paste Room Id" className="call-input" onChange={this.handleChange}/>
				<button onClick={()=>this.joinCall('audio')} className="audio-callbtn smallbtn"><i className="fas fa-phone-volume"></i></button>
				<button onClick={()=>this.joinCall('video')} className="video-callbtn smallbtn"><i className="fas fa-video"></i></button>
				</div>
				<div>
        <UserList users={contacts} self={this.state.self}
				visible={true}/>
				</div>
				<div className="fab-row">
				<button onClick={()=>this.startCall('audio')} className="audio-callbtn"><i className="fas fa-phone-volume"></i></button>
				<button onClick={()=>this.startCall('video')} className="video-callbtn"><i className="fas fa-video"></i></button>
				</div>
      </div>
		);
	}
}

Contacts.propTypes = {
	create: PropTypes.func.isRequired,
	join: PropTypes.func.isRequired,
	contacts: PropTypes.arrayOf(PropTypes.shape({
		name: PropTypes.string.isRequired
	})).isRequired,
	user: PropTypes.shape({
		id: PropTypes.string.isRequired,
		name: PropTypes.string
	}).isRequired
}

const mapStateToProps = state => {
	return {
		contacts: state.users
	}
}

const mapDispatchToProps = dispatch => ({
	create: (roomName, uid, name) => {
		dispatch(createRoom(roomName, uid, name))
	},
	join: (uid, name) => {
		dispatch(joinRoom(uid, name))
	}
})

export const ContactsContainer = connect(mapStateToProps, mapDispatchToProps)(Contacts);
