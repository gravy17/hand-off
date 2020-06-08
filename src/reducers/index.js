import { combineReducers } from "redux";
import messages from "./messages";
import users from "./users";
import rooms from "./rooms";
import feeds from "./feeds";

const combinedReducer = combineReducers({
	messages,
	feeds,
	users,
	rooms
});

export default combinedReducer;
