import * as types from '../constants/ActionTypes';
import {DEFAULT_ROOM} from '../constants/Namespace';

const rooms = (state = [{id: DEFAULT_ROOM, roomUsers: [], roomName:'General Chat'}], action) => {
		switch (action.type) {
			case types.PEER_CREATE:
			case types.CREATE_ROOM:
				return state.concat([{
					id: action.id,
					roomUsers: action.roomUsers,
					roomName: action.roomName }]);
			case types.PEER_JOIN:
			case types.JOIN_ROOM: //find room by id
				const index = state.findIndex(room => room.id === action.id);
				const room = state[index];
				if (!room){
					return state.concat([{
					id: action.id,
					roomUsers: [action.newUser],
					roomName: "Room-".concat(action.newUser) }])
				}
				if (!room.roomUsers.includes(action.newUser)){
				room.roomUsers.push(action.newUser); //modify room
				const newState = state.splice(index, 1, room); //create new state with modified room
				return newState;} else {return state;}
			case types.RM_FROM_ROOMS:
				let newstate = JSON.parse(JSON.stringify(state))
				newstate.forEach(room => {
					if (room.roomUsers.length){
						if (room.roomUsers.includes(action.name)){
						let index = room.roomUsers.findIndex(user => user === action.name)
						room.roomUsers.splice(index, 1);
						}
					}
				})
				return newstate;
			case types.USER_ROOMS:
				return action.rooms;
			default:
				return state;
		}
}

export default rooms;
