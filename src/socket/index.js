import * as types from '../constants/ActionTypes';
import {addContact, renameUser, onlineUsers, incomingMsg, userRooms, addFeed, createRoom, joinRoom} from '../actions/index';

const setupSocket = (dispatch, defaultName, defaultId, registered=false, storedCredentials) => {
	//attempt upgraded webrtc p2p, else use websocket
	const socket = new WebSocket('ws://10.238.69.201:8989')//Must be changed to the IP of the server

	socket.onopen = () => {
		if (!registered) {
			socket.send(JSON.stringify({
				type: types.REGISTER_USR,
				id: defaultId,
				name: defaultName
			}))
		} else {
			socket.send(JSON.stringify({
				type: types.REGISTER_USR,
				id: storedCredentials.id,
				name: storedCredentials.name
			}))
		}
	}

	socket.onmessage = (event) => {
		const data = JSON.parse(event.data)
		switch (data.type) {
			case types.REGISTER_USR:
				dispatch(addContact(data.name, data.id))
				break;
			case types.RENAME_USR:
				dispatch(renameUser(data.name, data.id))
				break;
			case types.OUTGOING_MSG:
				dispatch(incomingMsg(data.msg, data.sender, data.id, data.roomid))
				break;
			case types.ADD_FEED:
				dispatch(addFeed(data.src,
				data.sender,
				data.roomId))
				break;
			case types.USERS:
				dispatch(onlineUsers(data.onlineUsers))
				break;
			case types.USER_ROOMS:
				dispatch(userRooms(data.rooms))
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
	}

	return socket
}

export default setupSocket;
