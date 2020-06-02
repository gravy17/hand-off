import * as types from '../constants/ActionTypes';
import {addContact, removeUser, incomingMsg, addFeed, createRoom, joinRoom, removeUserFromRooms} from '../actions/index';
import io from 'socket.io-client';

const ENDPOINT = 'https://hand-off-server.herokuapp.com/';

const setupSocket = (dispatch, storedCredentials) => {
	const socket = io(ENDPOINT);
	socket.emit('hello', {id: storedCredentials.id,	name: storedCredentials.name});
	//attempt upgraded webrtc p2p

	//else use websocket
	//respond to messages
	socket.on('message', (data) => {
		switch (data.type) {
		case types.REGISTER_USR:
			dispatch(addContact(data.name, data.id))
			break;
		case types.REMOVE_USR:
			dispatch(removeUser(data.id))
			break;
		case types.RM_FROM_ROOMS:
			dispatch(removeUserFromRooms(data.name))
			break;
		case types.OUTGOING_MSG:
			dispatch(incomingMsg(data.msg, data.sender, data.id, data.roomid))
			break;
		case types.ADD_FEED:
			dispatch(addFeed(data.src,
			data.sender,
			data.roomId))
			break;
		case types.CREATE_ROOM:
			dispatch(createRoom(
				data.id,
				data.roomName,
				data.roomUsers))
			break;
		case types.JOIN_ROOM:
			dispatch(joinRoom(
				data.id,
				data.newUser))
			break;
		default:
			break;
		}
	})

	return socket
}

export default setupSocket;
