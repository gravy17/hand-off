import React, {Component} from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {outgoingMsg, createRoom, joinRoom} from '../actions';
import {UserList} from './UserList';

class Chat extends Component {
	constructor(props) {
		super(props);
		this.state = { input: '', viewusers: true, self: props.user.name};
		this.submitMessage = this.submitMessage.bind(this);
		this.handleChange = this.handleChange.bind(this);
		this.userlistToggle = this.userlistToggle.bind(this);
		this.scrollToBottom = this.scrollToBottom.bind(this);
		// console.log(JSON.stringify(props));
	}
	componentDidMount () {
		let curr = prompt("Confirm room id below:\n ", this.props.location.state.room );
		if(curr && this.props.location.state.room !== curr){
			this.props.enter(curr, this.props.user.name);
			this.forceUpdate();
			setTimeout(this.props.history.push(
				{ pathname: '/chat/'+curr,
					state: {
						room: curr,
						type: 'chat'
					}
				}
			), 1000);
		} else {
			if (!this.props.room){
				this.props.create("Room-".concat(this.props.user.name), this.props.location.state.room, this.props.user.name); this.forceUpdate(); return;}
			if (!this.props.room.roomUsers.length || !this.props.room.roomUsers.includes(this.props.user.name)){
				this.props.enter(this.props.location.state.room, this.props.user.name);this.forceUpdate();}
		}
		if(!this.state.viewusers)
		{this.scrollToBottom();}
	}
	componentDidUpdate () {
		if(!this.state.viewusers)
		{this.scrollToBottom();}
	}
	scrollToBottom () {
		this.messagesEnd.scrollIntoView({ behavior: "smooth"});
	}
	submitMessage () {
		if (this.state.input){
		var datetime = new Date().toLocaleString();
		this.props.dispatch(this.state.input, this.state.self, datetime, this.props.room.id);
		this.setState({input: ''});
	}
	}
	handleChange (event) {
		this.setState({input: event.target.value});
	}
	userlistToggle() {
		this.setState({viewusers: !this.state.viewusers});
	}
  render() {
		//display chat name if exists
		let title = null;
		if (this.props.room){
		title = <section className="chat__header row"><h3 className="chat__name col">{this.props.room.roomName}</h3><button className="userlist__toggle" onClick={this.userlistToggle}><i className="fas fa-angle-double-down"></i></button></section>;}
		//iterate through and display messages
		const classifiedMessages = this.props.messages.map((message) =>
			{	return (<Message message={message} key={message.id}
			self={this.state.self}/>); }
		);

    return (
      <div className="page">
				{title}
				<UserList users={this.props.room?this.props.room.roomUsers:[]} self={this.state.self} visible={this.state.viewusers}/>
				<section className="chat__messages">
				{classifiedMessages}
				<div style={{ float:"left", clear: "both"}} ref={(el) => {this.messagesEnd = el;}}></div>
				</section>
				<section className="chat__input row">
					<textarea id="message__input" maxLength="1000" name="message__input" placeholder="type here :)" wrap="soft" className="message__input col" value={this.state.input}
					onChange={this.handleChange}></textarea>
					<button onClick={this.submitMessage} className="send__button"><i className="fas fa-paper-plane"></i></button>
				</section>
      </div>
    );
  }
}

const Message = (prop) => {
	return (prop.message.sender !== prop.self )?
	(<div className="msgcontainer"><p className="inMessage col">{prop.message.msg}<span className="msginfo">From {prop.message.sender}@{prop.message.id}</span></p></div>):
	(<div className="msgcontainer"><p className="outMessage col">{prop.message.msg}<span className="msginfo">From Me@{prop.message.id}</span></p></div>)}

Chat.propTypes = {
	dispatch: PropTypes.func.isRequired,
	messages: PropTypes.arrayOf(PropTypes.shape({
		id: PropTypes.string.isRequired,
		msg: PropTypes.string.isRequired,
		sender: PropTypes.string.isRequired,
		roomid: PropTypes.string.isRequired
	})).isRequired,
	room: PropTypes.shape({
		id: PropTypes.string.isRequired,
		roomUsers: PropTypes.arrayOf(PropTypes.string).isRequired ,
		roomName: PropTypes.string
	}).isRequired,
	user: PropTypes.shape({
		id: PropTypes.string.isRequired,
		name: PropTypes.string
	}).isRequired
}

const mapStateToProps = (state, ownProps) => {
	return {
		room: state.rooms.find(chat => chat.id === ownProps.location.state.room ),
		messages: state.messages.filter(message => message.roomid === ownProps.location.state.room)
	}
}

const mapDispatchToProps = (dispatch, ownProps) => ({
	dispatch: (msg, sender, datetime, roomid) => {
		dispatch(outgoingMsg(msg, sender, datetime, roomid))
	},
	create: (roomName, roomid, name) => {
		dispatch(createRoom(roomName, roomid, name))
	},
	enter: (uid, name) => {
		dispatch(joinRoom(uid, name))
	}
})

export const ChatContainer = connect(mapStateToProps, mapDispatchToProps)(Chat);
