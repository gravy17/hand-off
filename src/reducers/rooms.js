import * as types from '../constants/ActionTypes';
import {DEFAULT_ROOM} from '../constants/Namespace';

const rooms = (state = [{id: DEFAULT_ROOM, roomUsers:[], roomName:'General'}], action) => {
		switch (action.type) {
			case types.CREATE_ROOM:
				return state.concat([{
					id: action.id,
					roomUsers: action.roomUsers,
					roomName: action.roomName }]);
			case types.JOIN_ROOM: //find room by id
				let index = state.findIndex(room => room.id === action.id);
				let roomUpdate = JSON.parse(JSON.stringify(state[index])); //create copy of room
				roomUpdate.roomUsers.concat(action.newUser); //modify room copy
				// Modify copy with const roomUpdate = Object.assign(room, {roomUsers: [...room.roomUsers, action.newUser]});
				let newState = state.splice(index, 1, roomUpdate); //create new state with modified room
				return newState;
			case types.USER_ROOMS:
				return action.rooms;
			default:
				return state;
		}
}

export default rooms;
