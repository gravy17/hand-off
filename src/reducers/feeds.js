import * as types from '../constants/ActionTypes';

const feeds = (state = [], action) => {
		switch (action.type) {
			case types.ADD_FEED:
				return state.concat([{
					src: action.src,
					sender: action.sender,
					roomid: action.roomid }]);

			default:
				return state;
		}
}

export default feeds;
