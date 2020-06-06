import * as types from '../constants/ActionTypes';

const feeds = (state = [], action) => {
		switch (action.type) {
			case types.PEER_FEED:
			case types.ADD_FEED:
				let newState = [...state];
				newState.unshift({
					src: action.src,
					sender: action.sender,
					roomid: action.roomid });
				return newState
			default:
				return state;
		}
}

export default feeds;
