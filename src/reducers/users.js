import * as types from '../constants/ActionTypes';

const users = (state = [], action) => {
		switch (action.type) {
			case types.USERS:
				return action.onlineUsers;
			case types.REGISTER_USR:
				return state.concat([{ id: action.id, name: action.name }]);
			case types.RENAME_USR:
				let newstate = [...state];
				let index = newstate.indexOf(user => user.id === action.id);
				newstate.splice(index, 1, [{ id: action.id, name: action.name }])
				return newstate;
			default:
				return state;
		}
}

export default users;
