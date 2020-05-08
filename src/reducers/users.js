import * as types from '../constants/ActionTypes';

const users = (state = [], action) => {
		switch (action.type) {
			case types.USERS:
				return action.onlineUsers;
			case types.REGISTER_USR:
				return state.concat([{ id: action.id, name: action.name }]);
			case types.RENAME_USR:
				let index = state.find(user => user.id === action.id)
					return state.splice(index, 1, [{ id: action.id, name: action.name }]);
			default:
				return state;
		}
}

export default users;
