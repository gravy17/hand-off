import React, {Component} from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {createRoom, joinRoom} from '../actions';
import {UserList} from './UserList';


class Contacts extends Component {
	constructor(props) {
		super(props);
		this.state = {videoRedirect: false, audioRedirect: false,
	  self: props.user.name,
		selfid: props.user.id};
		// this.openDetails= this.openDetails.bind(this);
		// this.startCall = this.startCall.bind(this);
		// this.joinCall = this.joinCall.bind(this);
	}
  render() {
		const contacts = this.props.contacts.filter(user => user.id !== this.state.selfid);
    return (
			<div className="page">
				<ul className="userlist">
				<li className="userlist__name"><span className="online-dot"></span>{this.state.self}(Me)<br/>id: {this.state.selfid}</li>
				</ul>
				<div className="inputRow">
				<input type="text" id="callRoom" placeholder="Type/Paste Room Id" className="call-input"/>
				<button className="audio-callbtn smallbtn"><i className="fas fa-phone-volume"></i></button>
				<button className="video-callbtn smallbtn"><i className="fas fa-video"></i></button>
				</div>
				<div>
        <UserList users={contacts} self={this.state.self}
				visible={true}/>
				</div>
				<div className="fab-row">
				<button className="audio-callbtn"><i className="fas fa-phone-volume"></i></button>
				<button className="video-callbtn"><i className="fas fa-video"></i></button>
				</div>
      </div>
		);
	}
}

Contacts.propTypes = {
	dispatch: PropTypes.func.isRequired,
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
	dispatch: (roomName, uid, name) => {
		dispatch(createRoom(roomName, uid, name))
	},
	dispatch: (uid, name) => {
		dispatch(joinRoom(uid, name))
	}
})

export const ContactsContainer = connect(mapStateToProps, mapDispatchToProps)(Contacts);
