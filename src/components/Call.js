import React, { useEffect, useState, useRef } from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {addFeed, joinRoom} from '../actions';

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
const user = JSON.parse(localStorage.getItem("handoff-user"));

function Call(props) {
	props.enter(props.location.state?.room, user.name);
	const [visible, setVisible] = useState((props.location.state?.type==="video")?true:false);
	const [audible, setAudible] = useState(true);
	const [stream, setStream] = useState();
	const [dimensions, setDimensions] = useState([vw, vh]);
	const roomid = useState(props.location.state?.room)
	const [peers, setPeers] = useState([])
	const [remoteFeeds, setRemoteFeeds] = useState([])
	const myFeed = useRef();
	const mountedRef = useRef(true);

	useEffect(()=> {
		if(!mountedRef.current) {return};

		if (!props.room){
			let id = props.location.pathname.split(/call\//, 2)[1]
			props.enter(id, user.name);
			setTimeout(props.history.push(
				{ pathname: '/call/'+id,
					state: {
						room: id,
						type: (visible?'video':'audio')
					}
				}
			), 1000);
			return
		}

		if (!props.room?.roomUsers?.includes(user.name)){
			let id = props.location.pathname.split(/call\//, 2)[1]
			props.enter(id, user.name);
			return
		}

		navigator.mediaDevices.getUserMedia({ video: visible, audio: audible}).then(stream => {
			if(!mountedRef.current) {
				return null
			}
			setStream(stream);
			if(myFeed.current) {
				myFeed.current.srcObject = stream;
				props.dispatch(stream, props.user?.name, roomid)
			}
		}).catch((err) => {
			console.log(err);
			return;
		});
	}, [props, visible, audible, roomid, mountedRef]);

	useEffect(()=> {
		if((props.room?.roomUsers.length-1) !== peers.length){
		//if new users join
			setPeers(props.room?.roomUsers.filter(peer => peer !== user.name));
			setRemoteFeeds( Array(peers.length).fill().map((_, i) => remoteFeeds[i] || React.createRef()) );
			setDimensions([vw, vh/(peers.length+1)]);
		}

		if(peers.length){
			peers.forEach((peer, i) => {
				let peerFeeds = props.feeds.filter(feed => feed.sender = peer);
				let latestFeed = peerFeeds[peerFeeds.length-1];
				remoteFeeds.current[i].srcObject = latestFeed
			})
		}
	}, [props.room, props.feeds, remoteFeeds, peers, dimensions]);

	useEffect(() => () => {
		myFeed.current.srcObject = null;
		mountedRef.current = false
	}, []);

	function toggleMute() {
		setAudible(current => !current);
		if(myFeed.current?.srcObject){	myFeed.current.srcObject.getAudioTracks().forEach(track => track.applyConstraints({ video: visible, audio: audible}));
		}
	}

	function toggleVideo() {
		setVisible(current => !current);
		if(myFeed.current?.srcObject){	myFeed.current.srcObject.getVideoTracks().forEach(track => track.applyConstraints({ video: visible, audio: audible}));
		}
	}

	let MyFeed;
	if (stream) {
		MyFeed = (
			<video className="my-feed" playsInline muted ref={myFeed} autoPlay width={dimensions[0]} height={dimensions[1]}/>
		);
	}

	let RemoteFeeds;
	if (peers.length) {
		RemoteFeeds = peers.map((peer, index) =>
			{ return (
				<div className="feed">
					<video className="remote-feed" playsInline ref={remoteFeeds[index]} autoPlay key={index} width={dimensions[0]} height={dimensions[1]}/>
					<h5 className="feedtitle">{peer?peer:null}</h5>
				</div>
			); }
		);
	}

	return (
		<div className="call">
			<div className="feedLayer">
				<div className="feed">
				{MyFeed}
				<h5 className="feedtitle">{MyFeed?"Me":null}</h5>
				</div>
				{RemoteFeeds}
			</div>
			<Link to="/"><button className="closebtn"><i className="fas fa-times"></i></button></Link>
			<div className="row callbtns">
			<button onClick={toggleMute} className={audible?"mutebtn":"mutebtn activeCallCtrl"}><i className="fas fa-volume-mute"></i></button>

			<button onClick={toggleVideo} className={visible?"novideo-btn":"novideo-btn activeCallCtrl"}><i className="fas fa-video-slash"></i></button>

			<Link to="/"><button className="endcall-btn"><i className="fas fa-phone-slash"></i></button></Link>
			</div>
		</div>
	);
}

Call.propTypes = {
	dispatch: PropTypes.func.isRequired,
	enter: PropTypes.func.isRequired,
	feeds: PropTypes.arrayOf(PropTypes.shape({
		src: PropTypes.string.isRequired,
		sender: PropTypes.string.isRequired,
		roomid: PropTypes.string.isRequired
	})).isRequired,
	room: PropTypes.shape({
		id: PropTypes.string.isRequired,
		roomUsers: PropTypes.arrayOf(PropTypes.string).isRequired ,
		roomName: PropTypes.string
	}).isRequired,
	user: PropTypes.shape({
		id: PropTypes.string.isRequired,
		name: PropTypes.string
	}).isRequired
}

const mapStateToProps = (state, ownProps) => {
	return({
		room: state.rooms.find(call => call.id === ownProps.location.state.room),
		feeds: state.feeds.filter(feed => ((feed.roomid === ownProps.location.state.room) && (feed.sender !== ownProps.user.name)))
	});
}

const mapDispatchToProps = (dispatch, ownProps) => ({
	dispatch: (stream, sender, roomid) => {
		dispatch(addFeed(stream, sender, roomid))
	},
	enter: (uid, name) => {
		dispatch(joinRoom(uid, name))
	}
})

export const CallContainer = connect(mapStateToProps, mapDispatchToProps)(Call)
