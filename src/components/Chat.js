import React, {Component} from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import defaultName from '../name-gen';
import {outgoingMsg} from '../actions';
import { v5 as uuidv5 } from 'uuid';
import * as uid from '../constants/Namespace';

class Chat extends Component {
	constructor(props) {
		super(props);
		this.state = { input: '', chatName: null, viewusers: false};
		if(props.room.roomName) {
			this.state.chatName = props.room.roomName;
		}
		this.submitMessage = this.submitMessage.bind(this);
		this.handleChange = this.handleChange.bind(this);
		this.userlistToggle = this.userlistToggle.bind(this);
	}
	componentDidMount () {
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
		let datetime = new Date().toLocaleString();
		this.props.dispatch(this.state.input, defaultName, datetime, this.props.room.id);
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
		if (this.state.chatName){
		title = <section className="chat__header row"><h3 className="chat__name col">{this.state.chatName}</h3><button className="userlist__toggle" onClick={this.userlistToggle}><i className="fas fa-angle-double-down"></i></button></section>;}
		//iterate through and display messages
		const classifiedMessages = this.props.messages.map((message) =>
			{	return (<Message message={message} key={message.id}/>); }
		);

    return (
      <div className="page">
				{title}
				<UserList users={this.props.room.roomUsers} visible={this.state.viewusers}/>
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

const UserList = (prop) => {
	return (prop.visible)?
		(<section className="userlist-view">
			<ul className="userlist">
				{prop.users.map((user) => {
					return <User name={user} me={(user === defaultName)?'(Me)':null} key={uuidv5(user, uid.NAMESPACE)}/> }
				)}
			</ul>
		</section>):null;
	}

const User = (prop) => {
	return (<li className="userlist__name"><span className="online-dot"></span>{prop.name} {prop.me}</li>)
}

const Message = (prop) => {
	return (prop.message.sender !== defaultName)?
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
	}).isRequired
}

const mapStateToProps = (state, ownProps) => {
	return {
		room: state.rooms.find(chat => chat.id === ownProps.newRoomId),
		messages: state.messages.filter(message => message.roomid === ownProps.newRoomId)
	}
}

const mapDispatchToProps = dispatch => ({
	dispatch: (msg, sender, datetime, roomid) => {
		dispatch(outgoingMsg(msg, sender, datetime, roomid))
	}
})

export const ChatContainer = connect(mapStateToProps, mapDispatchToProps)(Chat);
