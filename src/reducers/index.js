import { combineReducers } from "redux";
import messages from "./messages";
import users from "./users";
import rooms from "./rooms";

const combinedReducer = combineReducers({
	messages,
	users,
	rooms
});

export default combinedReducer;
