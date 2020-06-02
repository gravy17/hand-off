import { takeEvery } from 'redux-saga/effects'
import * as types from '../constants/ActionTypes'

const handleNewMessage = function* handleNewMessage(params) {
	yield takeEvery(types.OUTGOING_MSG, (action) => {
		params.socket.emit('action', action)
	})
	yield takeEvery(types.REGISTER_USR, (action) => {
		params.socket.emit('action', action)
	})
	yield takeEvery(types.ADD_FEED, (action) => {
		params.socket.emit('action', action)
	})
	yield takeEvery(types.CREATE_ROOM, (action) => {
		params.socket.emit('action', action)
	})
	yield takeEvery(types.JOIN_ROOM, (action) => {
		params.socket.emit('action', action)
	})
}

export default handleNewMessage
