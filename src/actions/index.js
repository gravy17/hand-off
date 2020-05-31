import * as types from '../constants/ActionTypes'

//action creators for chat component- sending and receiving messages
export const outgoingMsg = (msg, sender, datetime, roomid) => ({
	type: types.OUTGOING_MSG,
	id: datetime,
	msg,
	sender,
	roomid
})

export const incomingMsg = (msg, sender, id, roomid) => ({
	type: types.INCOMING_MSG,
	id: id,
	msg,
	sender,
	roomid
})

//action creators for contacts component- registering users and listing all users online
export const addContact = (name, uid) => ({
	type: types.REGISTER_USR,
	id: uid,
	name
})

export const renameUser = (name, uid) => ({
	type: types.RENAME_USR,
	id: uid,
	name
})

export const onlineUsers = (onlineUsers) => ({
	type: types.USERS,
	onlineUsers
})

//action creators for room creation, joining and listing  rooms
export const userRooms = (rooms) => ({
	type: types.USER_ROOMS,
	 rooms
})

export const createRoom = (roomName, uid, name) => ({
	type: types.CREATE_ROOM,
	id: uid,
	roomName: roomName,
	roomUsers: [name]
})

export const joinRoom = (uid, name) => ({
	type: types.JOIN_ROOM,
	id: uid,
	newUser: name
})

//action creators for call feeds
export const feeds = (feeds) => ({
	type: types.FEEDS,
	 feeds
})

export const addFeed = (stream, sender, roomid) => ({
	type: types.ADD_FEED,
	src: stream,
	sender: sender,
	roomid: roomid
})
