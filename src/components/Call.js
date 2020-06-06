import React, { useEffect, useState, useRef, useCallback } from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { v5 as uuidv5 } from 'uuid';

import {addFeed, joinRoom} from '../actions';
import * as uid from '../constants/Namespace';

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
let feed;
let chunks = [];

const PeerFeed = ({feed, dimensions}) => {
	const peerRef = useRef();

	useEffect(() => {
		try {
			var blob = new Blob(feed.src, {type: "video/webm"});
		peerRef.current.src = window.URL.createObjectURL(blob); } catch (err) {console.log(err)}
	}, [feed]);

	return (
		<div className="feed" style=
		{{width: dimensions[0], height: dimensions[1]}}>
			<video className="remote-feed" playsInline
			ref={peerRef} autoPlay
			width={dimensions[0]} height={dimensions[1]}/>
			<h5 className="feedtitle" >{feed.sender?feed.sender:null}</h5>
		</div>
	);
}

function Call({ dispatch, room: { id, roomUsers, roomName}, location, feeds, user}) {
	const [visible, setVisible] = useState((location.state?.type==="video")?true:false);
	const [audible, setAudible] = useState(true);
	const [dimensions, setDimensions] = useState([vw, vh]);
	const [constraints, setConstraints] = useState({
		video: !visible || {width: dimensions[0], height: dimensions[1]},
		audio: audible})
	const [peers, setPeers] = useState(roomUsers.filter((caller) => caller !== user.name)||[])
	const [remoteFeeds, setRemoteFeeds] = useState([])
	const myFeed = useRef();
	const mountedRef = useRef(true);

	const handleDataAvailable = useCallback((event) => {
		if (event.data.size > 0) {
			chunks.push(event.data)
		}
		if (chunks.length > 15) {
			dispatch(chunks, user.name, location.state.room);
			chunks = []
		}
	}, [dispatch, user.name, location.state.room])

	const getFeed = useCallback(async() => {
			try {
				feed = await navigator.mediaDevices.getUserMedia(constraints);
				const mediaRecorder = new MediaRecorder(feed, {mimeType: "video/webm; codecs=vp9" });
				mediaRecorder.ondataavailable = handleDataAvailable;
				myFeed.current.srcObject = feed;
				mediaRecorder.start();
			} catch(err){
				console.log(err);
			}
	}, [constraints, handleDataAvailable])

	useEffect(() => {
		if(!mountedRef.current){
			return
		}
	}, [])

	useEffect(() => {
		//new dimensions/change in audible/visible: set constraints
		setConstraints({
			video: visible && {width: dimensions[0], height: dimensions[1]},
			audio: audible
		});
	}, [dimensions, audible, visible]);

	useEffect(() => {
		//new constraints: replace feed
		getFeed();
	}, [constraints, getFeed]);

	useEffect(() => {
		//track peers
		try{
			if((roomUsers.length-1) > peers.length){
				//new user: form peerlist, resize videos
				setPeers(roomUsers.filter((caller) => caller !== user.name));
				setDimensions([vw, (vh/roomUsers.length)]);
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
				const latestFeed = feeds.find(feed => feed.sender === peer);
				remoteFeeds[i].current = latestFeed
			})
			} catch(err) {console.log(err);}
		}
	}, [feeds, peers, remoteFeeds]);

	useEffect(() => () => {
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
	if (peers.length && feeds.length && remoteFeeds[0] && remoteFeeds[0].current) {
		RemoteFeeds = peers.map((peer, index) =>
			// pass PeerFeed component a feed and dimensions
			{ return (
				<PeerFeed key={uuidv5((index+peer),uid.NAMESPACE)} feed={remoteFeeds[index].current} dimensions={dimensions}/>
			); }
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
	dispatch: PropTypes.func.isRequired,
	enter: PropTypes.func.isRequired,
	feeds: PropTypes.arrayOf(PropTypes.shape({
		src: PropTypes.arrayOf(PropTypes.instanceOf(Blob)),
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
		room: state.rooms.find(call => call.id === ownProps.location.state.room) || {
			id: '',
			roomUsers: [],
			roomName: '' },
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
