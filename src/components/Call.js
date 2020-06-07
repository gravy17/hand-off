import React, { useEffect, useState, useRef} from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { v5 as uuidv5 } from 'uuid';
import Peer from "simple-peer";

import * as uid from '../constants/Namespace';
import io from "socket.io-client";
const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
const ENDPOINT = 'https://hand-off-server.herokuapp.com/';

const PeerFeed = ({peer, sender, dimensions}) => {
	const peerRef = useRef();

	useEffect(() => {
		try {
		peer.on("stream", pstream => {
			peerRef.current.srcObject = pstream;
		}) } catch (err) {console.log(err)}
	});

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

const Call = ({ location, user, room, room: { id, roomUsers, roomName}} ) => {
	const [visible, setVisible] = useState((location.state?.type==="video")?true:false);
	const [audible, setAudible] = useState(true);
	const [dimensions, setDimensions] = useState([vw, vh]);
	const [constraints, setConstraints] = useState({
		video: !visible || {facingMode:"user", width: dimensions[0], height: dimensions[1]},
		audio: audible})
	const [peers, setPeers] = useState([])
	const peersRef = useRef([])
	const myStream = useRef();
	const mountedRef = useRef(true);
	const socketRef = useRef();

	useEffect(() => {
		if(!mountedRef.current){
			return
		}
		socketRef.current = io.connect(ENDPOINT);
		navigator.mediaDevices.getUserMedia(constraints).then(stream => {
			myStream.current.srcObject = stream;

			socketRef.current.emit("join room", id);

			socketRef.current.on("all users", users => {
				const peers = [];
				users.forEach(userID => {
					const peer = createPeer(userID, socketRef.current.id, stream);
					peersRef.current.push({
						peerID: userID,
						peer,
					})
					peers.push(peer);
				})
				setPeers(peers);
				setDimensions([vw, vh/peers.length]);
			})

			socketRef.current.on("user joined", payload => {
				const peer = addPeer(payload.signal, payload.callerID, stream);
				peersRef.current.push({
					peerID: payload.callerID,
					peer,
				})
				setPeers(peers => [...peers, peer]);
			});

			socketRef.current.on("receiving returned signal", payload => {
				const item = peersRef.current.find(peer => peer.peerID === payload.id);
				item.peer.signal(payload.signal);
			});
		})

	}, [constraints, id, peersRef])

	function createPeer(neighbor, newPeer, feed) {
		const peer = new Peer({
			initiator: true,
			trickle: false,
			feed,
		});

		peer.on("signal", signal => {
			socketRef.current.emit("sending signal", { neighbor, newPeer, signal })
		})

		return peer;
	}

	function addPeer(neighborSignal, newPeer, feed) {
		const peer = new Peer({
			initiator: false,
			trickle: false,
			feed,
		});

		peer.on("signal", signal => {
			socketRef.current.emit("returning signal", { signal, newPeer })
		})

		peer.signal(neighborSignal);

		return peer;
	}

	useEffect(() => {
		setConstraints({
			video: visible && {facingMode: "user", width: dimensions[0], height: dimensions[1]},
			audio: audible
		});
	}, [dimensions, audible, visible]);

	useEffect(() => {
    if(myStream.current?.srcObject){
		myStream.current.srcObject.getTracks().forEach(track => track.applyConstraints(constraints))}
	}, [constraints]);

	useEffect(() => () => {
		myStream.current.srcObject.getTracks().forEach(track => track.stop());
		socketRef.current.close();
		mountedRef.current = false;
		return;
	}, []);

	function toggleMute() {
		setAudible(current => !current);
		if(myStream.current?.srcObject){	myStream.current.srcObject.getAudioTracks().forEach(track => track.applyConstraints({ video: visible, audio: audible}));
		}
	}

	function toggleVideo() {
		setVisible(current => !current);
		if(myStream.current?.srcObject){
			myStream.current.srcObject.getVideoTracks().forEach(track => track.applyConstraints({ video: visible, audio: audible}));
		}
	}

	let MyFeed;
	// if (stream) {
		MyFeed = (
			<video className="my-feed" playsInline muted ref={myStream} autoPlay width={dimensions[0]} height={dimensions[1]}/>
		);
	// }

	let RemoteFeeds;
	if (peers.length) {
		RemoteFeeds = peers.map((peer, index) =>
		{return (
			<PeerFeed key={uuidv5((index+peer),uid.NAMESPACE)} peer={peer} sender={peersRef[index].current.peerID} dimensions={dimensions}/>	)
		}
		);
	}

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
	room: PropTypes.shape({
		id: PropTypes.string.isRequired,
		roomUsers: PropTypes.arrayOf(PropTypes.string).isRequired ,
		roomName: PropTypes.string
	}).isRequired,
	user: PropTypes.shape({
		id: PropTypes.string.isRequired,
		name: PropTypes.string.isRequired
	}).isRequired
}

const mapStateToProps = (state, ownProps) => {
	return({
		room: state.rooms.find(call => call.id === ownProps.location.state.room) || {
			id: '',
			roomUsers: [],
			roomName: '' }
	});
}

export const CallContainer = connect(mapStateToProps, null)(Call)
