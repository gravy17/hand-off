import React, { useEffect, useState, useRef, useCallback } from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { v5 as uuidv5 } from 'uuid';

import {/*addFeed,*/ joinRoom} from '../actions';
import * as uid from '../constants/Namespace';

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
let feed;
let stream;
const ENDPOINT = 'https://hand-off-server.herokuapp.com/';

var io = require('socket.io-client')
const socket = io.connect(ENDPOINT);

const peerConnections = {}
let subscriber;
const config = {
	iceServers: [
		{
			urls: ["stun:stun.l.google.com:19302"]
		}
	]
}

socket.on("watcher", id => {
	const peerConnection = new RTCPeerConnection(config);
	peerConnections[id] = peerConnection;

	feed.getTracks().forEach(track => peerConnection.addTrack(track, feed))

	peerConnection.onicecandidate = event => {
		if (event.candidate) {
			socket.emit("candidate", id, event.candidate);
		}
	};

	peerConnection.createOffer()
	.then(sdp => peerConnection.setLocalDescription(sdp))
	.then(() => {
		socket.emit("offer", id, peerConnection.localDescription);
	});
});

socket.on("answer", (id, description) => {
	peerConnections[id].setRemoteDescription(description);
});

socket.on("candidate", (id, candidate) => {
	peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
	subscriber
	.addIceCandidate(new RTCIceCandidate(candidate))
	.catch(e => console.error(e))
})

socket.on("disconnectPeer", id => {
	peerConnections[id].close();
	delete peerConnections[id];
	subscriber.close()
})

socket.on("offer", (id, description) => {
	subscriber = new RTCPeerConnection(config);
	subscriber
	.setRemoteDescription(description)
	.then(() => subscriber.createAnswer())
	.then(sdp => subscriber.setLocalDescription(sdp))
	.then(() => {
		socket.emit("answer", id, subscriber.localDescription);
	});
	subscriber.ontrack = event => {
		stream = event.streams[0];
	};
	subscriber.onicecandidate = event => {
		if (event.candidate) {
			socket.emit("candidate", id, event.candidate);
		}
	};
});

socket.on("connect", () => {
	socket.emit("watcher");
});

socket.on("broadcaster", () => {
	socket.emit("watcher");
})

const PeerFeed = ({/*feed*/ sender, dimensions}) => {
	const peerRef = useRef();

	useEffect(() => {
		try {
		peerRef.current.srcObject = stream; } catch (err) {console.log(err)}
	}, [dimensions]);

	return (
		<div className="feed" style=
		{{width: dimensions[0], height: dimensions[1]}}>
			<video className="remote-feed" playsInline
			ref={peerRef} autoPlay
			width={dimensions[0]} height={dimensions[1]}/>
			<h5 className="feedtitle" >{sender?sender:null}</h5>
		</div>
	);
}

function Call({ /*dispatch, enter, */room: { id, roomUsers, roomName}, location, /*feeds,*/user}) {
	const [visible, setVisible] = useState((location.state?.type==="video")?true:false);
	const [audible, setAudible] = useState(true);
	const [dimensions, setDimensions] = useState([vw, vh]);
	const [constraints, setConstraints] = useState({
		video: !visible || {facingMode:"user", width: dimensions[0], height: dimensions[1]},
		audio: audible})
	const [peers, setPeers] = useState(roomUsers.filter((caller) => caller !== user.name)||[])
	const [remoteFeeds, setRemoteFeeds] = useState([])
	const myFeed = useRef();
	const mountedRef = useRef(true);

	const getFeed = useCallback(async() => {
			try {
				feed = await navigator.mediaDevices.getUserMedia(constraints);
				// dispatch(feed, user.name, location.state.room)
				myFeed.current.srcObject = feed;
				socket.emit("broadcaster");
			} catch(err){
				console.log(err);
			}
	}, [constraints/*, dispatch, location.state.room, user.name*/])

	useEffect(() => {
		if(!mountedRef.current){
			return
		}
	}, [])

	useEffect(() => {
		//new dimensions/change in audible/visible: set constraints
		setConstraints({
			video: visible && {facingMode: "user", width: dimensions[0], height: dimensions[1]},
			audio: audible
		});
	}, [dimensions, audible, visible]);

	useEffect(() => {
		//new constraints: change tracks
		feed?.getTracks().forEach(track => track.applyConstraints(constraints))
	}, [constraints]);

	useEffect(() => {
		//track peers
		try{
			if((roomUsers.length-1) > peers.length){
				//new user: form peerlist, resize videos
				setPeers(roomUsers.filter((caller) => caller !== user.name));
				setDimensions([vw, (vh/roomUsers.length)]);
				console.log("new caller recognized")
			}
			if(peers.length){
				//peerlist contains some peer: set refs for peers
				setRemoteFeeds(Array(peers.length).fill().map((_, i) => remoteFeeds[i] || React.createRef()) );
			}
		} catch (err) {console.log(err)}
	}, [roomUsers, peers, remoteFeeds, user.name]);

	useEffect(()=> {
		//track feeds
		if(remoteFeeds && remoteFeeds[0]){
			try{
			peers.forEach((peer, i) => {
				remoteFeeds[i].current = peer
				// const latestFeed = feeds.find(feed => feed.sender === peer);
				// console.log('feed ref:'+ latestFeed)
				// remoteFeeds[i].current = latestFeed
			})
			} catch(err) {console.log(err);}
		}
	}, [/*feeds,*/ peers, remoteFeeds]);

	useEffect(() => () => {
		feed.getTracks().forEach(track => track.stop());
		socket.close();
		mountedRef.current = false;
		return;
	}, []);

	function toggleMute() {
		setAudible(current => !current);
		if(myFeed.current?.srcObject){	myFeed.current.srcObject.getAudioTracks().forEach(track => track.applyConstraints({ video: visible, audio: audible}));
		}
	}

	function toggleVideo() {
		setVisible(current => !current);
		if(myFeed.current?.srcObject){
			myFeed.current.srcObject.getVideoTracks().forEach(track => track.applyConstraints({ video: visible, audio: audible}));
		}
	}

	let MyFeed;
	if (feed) {
		MyFeed = (
			<video className="my-feed" playsInline muted ref={myFeed} autoPlay width={dimensions[0]} height={dimensions[1]}/>
		);
	}

	let RemoteFeeds;
	// if (peers.length && feeds.length && remoteFeeds[0] && remoteFeeds[0].current) {
	if (peers.length) {
		RemoteFeeds = peers.map((peer, index) =>
			// pass PeerFeed component a feed and dimensions
			{ return (
				<PeerFeed key={uuidv5((index+peer),uid.NAMESPACE)} {/*feed*/}sender={remoteFeeds[index].current} dimensions={dimensions}/>
			); }
		);
	}
	// }

	return (
		<div className="call">
			<div className="feedLayer vertical-row">
				<div className="feed" style=
				{{width: dimensions[0], height: dimensions[1]}}>
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
	// dispatch: PropTypes.func.isRequired,
	// enter: PropTypes.func.isRequired,
	// feeds: PropTypes.arrayOf(PropTypes.shape({
	// 	src: PropTypes.any.isRequired,
	// 	sender: PropTypes.string.isRequired,
	// 	roomid: PropTypes.string.isRequired
	// })).isRequired,
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
		room: state.rooms.find(call => call.id === ownProps.location.state.room) || {
			id: '',
			roomUsers: [],
			roomName: '' }
		//, feeds: state.feeds.filter(feed => ((feed.roomid === ownProps.location.state.room) && (feed.sender !== ownProps.user.name)))
	});
}

// const mapDispatchToProps = (dispatch, ownProps) => ({
	// dispatch: (stream, sender, roomid) => {
	// 	dispatch(addFeed(stream, sender, roomid))
	// },
	// enter: (uid, name) => {
	// 	dispatch(joinRoom(uid, name))
	// }
// })

export const CallContainer = connect(mapStateToProps, /*mapDispatchToProps*/null)(Call)
