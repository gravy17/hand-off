import * as types from '../constants/ActionTypes';

const users = (state = [], action) => {
		switch (action.type) {
			case types.USERS:
				return action.onlineUsers;
			case types.PEER_REGISTER:
			case types.REGISTER_USR:
				if(state.some(usr => usr.id === action.id)) {
					return state;
				} else {
					return state.concat([{ id: action.id, name: action.name }]);
				}
			case types.REMOVE_USR:
				let newstate = [...state];
				let index = newstate.indexOf(user => user.id === action.id);
				newstate.splice(index, 1);
				return newstate;
			default:
				return state;
		}
}

export default users;
