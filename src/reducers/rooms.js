import * as types from '../constants/ActionTypes';

const rooms = (state = [], action) => {
		switch (action.type) {
			case types.CREATE_ROOM:
				return state.concat([{
					id: action.id,
					roomUsers: action.roomUsers,
					roomName: action.roomName }]);
			case types.JOIN_ROOM: //find room by id
				let index = state.findIndex(room => room.id === action.id);
				if (index < 0){return state;}
				let roomUpdate = JSON.parse(JSON.stringify(state[index])); //create copy of room
				roomUpdate.roomUsers = roomUpdate.roomUsers.concat(action.newUser); //modify room copy
				let newState = state.splice(index, 1, roomUpdate); //create new state with modified room
				return newState;
			case types.USER_ROOMS:
				return action.rooms;
			default:
				return state;
		}
}

export default rooms;
