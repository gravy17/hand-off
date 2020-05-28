import { takeEvery } from 'redux-saga/effects'
import * as types from '../constants/ActionTypes'

const handleNewMessage = function* handleNewMessage(params) {
	yield takeEvery(types.OUTGOING_MSG, (action) => {
		params.socket.send(JSON.stringify(action))
	})
}

export default handleNewMessage
