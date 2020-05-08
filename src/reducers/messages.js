import * as types from '../constants/ActionTypes';

const messages = (state = [], action) => {
		switch (action.type) {
			case types.INCOMING_MSG:
			case types.OUTGOING_MSG:
				return state.concat([{
					id: action.id,
					msg: action.msg,
					sender: action.sender,
					roomid: action.roomid }]);
			default:
				return state;
		}
}

export default messages;
