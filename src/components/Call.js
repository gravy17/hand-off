import React, { useEffect, useState, useRef} from 'react';
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
		video: !visible || {facingMode:"user", width: dimensions[0], height: dimensions[1]},
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
		navigator.mediaDevices.getUserMedia(constraints).then(stream => {
			if(!mountedRef?.current)
			{stream.getTracks().forEach(track => track.stop());
			return}
			setStream(stream);
			if (myStream.current)
			{myStream.current.srcObject = stream;}
		})

		socketRef.current.on("yourID", (data) => {
			setYourID(data.id);
		})

		socketRef.current.on("allUsers", users => {
			setPeers(users);
			console.log(JSON.stringify(users));
		})

		socketRef.current.on("hey", data => {
			setReceivingCall(true);
			setCaller(data.from);
			setCallerSignal(data.signal);
		})

	}, []);

	useEffect(() => {
		setConstraints({
			video: visible && {facingMode: "user", width: dimensions[0], height: dimensions[1]},
			audio: audible
		});
	}, [dimensions, audible, visible]);

	useEffect(() => {
    if(myStream.current){
		myStream.current.srcObject.getTracks().forEach(track => track.applyConstraints(constraints))}
	}, [constraints, myStream.current]);

	useEffect(() => () => {
		if(socketRef.current)
		{socketRef.current.close();}
		if(mountedRef.current)
		{mountedRef.current = false;}
		return;
	}, []);

	useEffect(() => {
		if (receivingCall && caller){
			acceptCall();
		}
	}, [receivingCall, caller])

	useEffect(() => {
		console.log(peers);
		console.log("your id"+ yourID)
	}, [peers])

	useEffect(() => {
		setDimensions([vw, vh/2]);
	}, [remoteFeed])

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

	function acceptCall(){
		setCallAccepted(true);
		setDimensions([vw, vh/2]);
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
				if (peers[key].id !== yourID && !roomUsers.includes(peers[key].name) ) {
					return (<button className="peerlist" key={key} onClick={() => callPeer(key)}>peers[key].name</button>);
				}
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
