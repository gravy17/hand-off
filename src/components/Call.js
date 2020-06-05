import React, { useEffect, useState, useRef } from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { v5 as uuidv5 } from 'uuid';

import {addFeed, joinRoom} from '../actions';
import * as uid from '../constants/Namespace';

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
const user = JSON.parse(localStorage.getItem("handoff-user"));
let feed;

const PeerFeed = (props) => {
	const peerRef = useRef();

	useEffect(() => {
		console.log(props.feed)
		peerRef.current.srcObject = props.feed.src;
	}, [props.feed]);

	return (
		<div className="feed" style=
		{{width: props.dimensions[0], height: props.dimensions[1]}}>
			<video className="remote-feed" playsInline
			ref={peerRef} autoPlay
			width={props.dimensions[0]} height={props.dimensions[1]}/>
			<h5 className="feedtitle" >{props.feed.sender?props.feed.sender:null}</h5>
		</div>
	);
}

function Call(props) {
	props.enter(props.location.pathname.split(/call\//, 2)[1], user.name);
	const [visible, setVisible] = useState((props.location.state?.type==="video")?true:false);
	const [audible, setAudible] = useState(true);
	const [dimensions, setDimensions] = useState([vw, vh]);
	const [constraints, setConstraints] = useState({
		video: !visible || {width: dimensions[0], height: dimensions[1]},
		audio: audible})
	const [peers, setPeers] = useState(props.room?.roomUsers?.filter((caller) => caller !== user.name)||[])
	const [remoteFeeds, setRemoteFeeds] = useState([])
	const myFeed = useRef();
	const mountedRef = useRef(true);

	async function getFeed() {
		try {
			feed = await navigator.mediaDevices.getUserMedia(constraints);
			props.dispatch(feed, props.user?.name, props.location.pathname.split(/call\//, 2)[1])
			myFeed.current.srcObject = feed;
			console.log(feed)
		} catch(err){
			console.log(err);
		}
	}

	useEffect(() => {
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
		}

		getFeed();
	}, [])

	useEffect(() => {
		console.log('dimensions: '+dimensions)
		//new dimensions/change in audible/visible: set constraints
		setConstraints({
			video: visible && {width: dimensions[0], height: dimensions[1]},
			audio: audible
		});
	}, [dimensions, audible, visible]);

	useEffect(() => {
		console.log('constraints: '+JSON.stringify(constraints))
		//new constraints: replace feed
		getFeed();
	}, [constraints]);

	useEffect(() => {
		//track peers
		if((props.room.roomUsers.length-1) > peers.length){
			//new user: form peerlist, resize videos
			console.log(props.room.roomUsers)
			setPeers(props.room.roomUsers.filter((caller) => caller !== user.name));
			setDimensions([vw, (vh/props.room.roomUsers.length)]);
		}
		if(peers.length){
			//peerlist contains some peer: set refs for peers
			console.log('peers: ' + peers)
			setRemoteFeeds( Array(peers.length).fill().map((_, i) => remoteFeeds[i] || React.createRef()) );
		}
	}, [props.room, peers]);

	useEffect(()=> {
		//track feeds
		peers.forEach((peer, i) => {
			console.log(peer);
			console.log(props.feeds)
			let peerFeeds = props.feeds.filter(feed => feed.sender === peer);

			let latestFeed = peerFeeds[peerFeeds.length-1];
			console.log('feed ref:'+ latestFeed)
			remoteFeeds[i].current = latestFeed
		})
	}, [props.feeds]);

	useEffect(() => () => {
		setConstraints({video: false, audio: false});
		mountedRef.current = false;
		feed = null;
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
	if (peers.length & props.feeds.length) {
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
		feeds: state.feeds.filter(feed => ((feed.roomid === ownProps.location.state.room) & (feed.sender !== ownProps.user.name)))
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
