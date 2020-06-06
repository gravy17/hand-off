import * as types from '../constants/ActionTypes';
import {peerContact, removeUser, incomingMsg, peerFeed, peerCreate, peerJoin, removeUserFromRooms} from '../actions/index';

var P2P = require('socket.io-p2p');
var io = require('socket.io-client');

const ENDPOINT = 'https://hand-off-server.herokuapp.com/';

const setupSocket = (dispatch, storedCredentials) => {
	var socket = io(ENDPOINT);
	socket.emit('hello', {type: types.REGISTER_USR, id: storedCredentials.id, name: storedCredentials.name})
	//attempt upgrade to webrtc p2p
	var p2pSock = new P2P(socket, {autoUpgrade: true}, () => {console.log("Upgrading to WebRTC..."); socket.emit('peer-msg', {type: types.REGISTER_USR, id: storedCredentials.id, name: storedCredentials.name})});

	p2pSock.on('ready', function(){
		p2pSock.usePeerConnection = true;
		alert("Now using WebRTC Peer Connection");
	})
	//respond to messages
	p2pSock.on('peer-msg', (data) => {
		switch (data.type) {
		case types.REGISTER_USR:
			dispatch(peerContact(data.name, data.id))
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
                        console.log(JSON.stringify(data))
			dispatch(peerFeed(data.src,
			data.sender,
			data.roomId))
			break;
		case types.CREATE_ROOM:
			dispatch(peerCreate(
				data.id,
				data.roomName,
				data.roomUsers))
			break;
		case types.JOIN_ROOM:
			dispatch(peerJoin(
				data.id,
				data.newUser))
			break;
		default:
			break;
		}
	})

	return p2pSock
}

export default setupSocket;
