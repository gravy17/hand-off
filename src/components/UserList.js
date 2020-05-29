import React from 'react';
import { v5 as uuidv5 } from 'uuid';
import * as uid from '../constants/Namespace';



export const UserList = (prop) => {
	return (prop.visible)?
		(<section className="userlist-view">
			<ul className="userlist">
				{prop.users.map((user) => {
					return <User name={(typeof(user)=='string')?user:user.name}
					id = {(typeof(user)=='string')?null:user.id}
					me={(user === prop.self)?'(Me)':null} key={(typeof(user)=='string')?uuidv5(user, uid.NAMESPACE):user.id}/> }
				)}
			</ul>
		</section>):null;
	}

const User = (prop) => {
	return (<li className="userlist__name"><span className="online-dot"></span>{prop.name} {prop.me}<br/>{prop.id}</li>)
}
