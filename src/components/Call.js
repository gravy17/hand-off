import React, { useEffect, useState, useRef } from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Peer from "simple-peer";
import io from "socket.io-client";

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
const ENDPOINT = 'https://hand-off-server.herokuapp.com/';

const Call = ({ location, user, room, room: { id, roomUsers, roomName}} ) => {
	const [visible, setVisible] = useState((location.state?.type==="video")?true:false);
	const [audible, setAudible] = useState(true);
	const [dimensions, setDimensions] = useState([vw, vh]);
	const [constraints, setConstraints] = useState({
		video: visible?{facingMode: "user"}:'false',
		audio: audible})
	const [peers, setPeers] = useState({});
	const [receivingCall, setReceivingCall] = useState(false)
	const [caller, setCaller] = useState("");
	const [callerSignal, setCallerSignal] = useState();
	const [callAccepted, setCallAccepted]= useState(false);
	const [stream, setStream] = useState();
	const [yourID, setYourID] = useState("");
	const remoteFeed = useRef();
	const myStream = useRef();
	const mountedRef = useRef(true);
	const socketRef = useRef();

	useEffect(() => {
		socketRef.current = io.connect(ENDPOINT);

		if (!mountedRef?.current){
			console.log("call should have ended");setStream(null);
			return;
		}

		navigator.mediaDevices.getUserMedia(constraints).then(newstream => {
			if (!mountedRef?.current){
				newstream.getTracks().forEach(track => track.stop());
				return;
			}

			setStream(newstream);

			if (myStream.current) {
				myStream.current.srcObject = newstream;
			}
		})

		socketRef.current.on("yourID", (data) => {
			setYourID(data);
		})

		socketRef.current.on("allUsers", users => {
			setPeers(users);
		})

		socketRef.current.on("hey", data => {
			setReceivingCall(true);
			setCaller(data.from);
			setCallerSignal(data.signal);
		})

	}, []) //eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		setConstraints({
			video: visible?{facingMode: "user"}:'false',
			audio: audible
		});
	}, [audible, visible]);

	useEffect(() => () => {
		if(socketRef.current)
		{socketRef.current.close();}
		if(mountedRef.current)
		{mountedRef.current = false;}
		return;
	}, []);

	function callPeer(id) {
		const peer = new Peer({
			initiator: true,
			trickle: false,
			config: {
				iceServers: [
					{
						urls: ["stun:Stun.l.google.com:19302"]
					}
				]
			},
			stream: stream
		});

		peer.on("signal", data => {
			socketRef.current.emit("callUser", { userToCall: id, signalData: data, from: yourID })
		})

		peer.on("stream", feed => {
			if (remoteFeed.current) {
				remoteFeed.current.srcObject = feed;
			}
		});

		socketRef.current.on("callAccepted", signal => {
			setCallAccepted(true);
			peer.signal(signal);
		})
	}

	function acceptCall() {
		setCallAccepted(true);
		setReceivingCall(false);
		const peer = new Peer({
			initiator: false,
			trickle: false,
			stream: stream,
		});
		peer.on("signal", data => {
			socketRef.current.emit("acceptCall", {signal: data, to: caller})
		});
		peer.on("stream", feed => {
			remoteFeed.current.srcObject = feed;
		});
		peer.signal(callerSignal)
	}

	useEffect(() => {
		if (receivingCall) {
			acceptCall();
		}
	}, [receivingCall])//eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if(callAccepted)
		{setDimensions([vw, vh/2]);}
	}, [remoteFeed, callAccepted])

	function toggleMute() {
		myStream.current.srcObject.getAudioTracks().forEach(track => track.enabled = !audible)
		setAudible(current => !current);
	}

	function toggleVideo() {
		myStream.current.srcObject.getVideoTracks().forEach(track => track.enabled = !visible)
		setVisible(current => !current);
	}

	let MyFeed;
	if (stream) {
		MyFeed = (
			<video className="my-feed" playsInline muted ref={myStream} autoPlay width={dimensions[0]} height={dimensions[1]}/>
		);
	}

	let RemoteFeed;
	if (callAccepted) {
		RemoteFeed =
		<div className="feed" style=
		{{width: dimensions[0], height: dimensions[1]}}>
			<video className="remote-feed" playsInline
			ref={remoteFeed} autoPlay
			width={dimensions[0]} height={dimensions[1]}/>
		</div>
	}

	return (
		<div className="call">
			<div className="feedLayer vertical-row">
				<div className="feed" style=
				{{width: dimensions[0], height: dimensions[1]}}>
					{MyFeed}
					<h5 className="feedtitle">{MyFeed?"Me":null}</h5>
				</div>
				{RemoteFeed}
			</div>
			<Link to="/"><button className="closebtn"><i className="fas fa-times"></i></button></Link>
			<div className="row callbtns">
			{Object.keys(peers).map( (key,i) => {
				return (peers[key] !== yourID)?
				(<button className="peerlist" key={key} onClick={() => callPeer(key)}>{i}</button>)
				:null
			})}

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
