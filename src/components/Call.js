import React, { useEffect, useState, useRef } from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {addFeed} from '../actions';

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

function Call(props) {
	const [visible, setVisible] = useState((props.location.state?.type==="video")?true:false);
	const [audible, setAudible] = useState(true);
	const [stream, setStream] = useState();
	const [dimensions, setDimensions] = useState([vw, vh/2]);

	const [remoteFeeds, setRemoteFeeds] = useState([]);
	const myFeed = useRef();

	useEffect(()=> {
		navigator.mediaDevices.getUserMedia({ video: visible, audio: audible}).then(stream => {
			setStream(stream);
			if(myFeed.current) {
				myFeed.current.srcObject = stream;
			}
			props.dispatch(stream, props.user?.name, props.room?.roomid)
		})
	});

	useEffect(()=> {
		if(props.feeds.length){
			setDimensions(current => [vw, vh/props.feeds.length])
			setRemoteFeeds(remoteFeeds => Array(props.feeds.length).fill().map((_, i) => remoteFeeds[i] || React.createRef()) )
			if(remoteFeeds.current.length){
				props.feeds.forEach((feed, i) => {
						remoteFeeds.current[i].srcObject = feed.src
				})
			}
		}
		console.log(props.room.roomUsers)
		console.log(props.feeds.length)
	}, [props.feeds, remoteFeeds, props.room.roomUsers]);

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

	function killStreams(){
		if (myFeed.current) {
			myFeed.current.srcObject.getTracks().forEach(track => track.stop());
			myFeed.current.srcObject = null;
		}
		if (remoteFeeds.current?.length) {
			remoteFeeds.current.forEach(feed => {
				feed.srcObject.getTracks().forEach(track => track.stop());
				feed.srcObject = null
			})
		}
		remoteFeeds.current = null
	}

	let MyFeed;
	if (stream) {
		MyFeed = (
			<video className="my-feed" playsInline muted ref={myFeed} autoPlay width={dimensions[0]} height={dimensions[1]}/>
		);
	}

	let RemoteFeeds;
	if (props.feeds.length) {
		RemoteFeeds = props.feeds.map((feed, index) =>
			{ return (
				<video className="remote-feed" playsInline ref={remoteFeeds[index]} autoPlay key={index} width={dimensions[0]} height={dimensions[1]}/>
			); }
		);
	}

	return (
		<div className="call">
			<div className="feedLayer">
				<div className="feed">
				{MyFeed}
				<h5 className="feedtitle">"Me"</h5>
				</div>
				<div className="row">
				{RemoteFeeds}
				</div>
			</div>
			<Link to="/"><button onClick={killStreams} className="closebtn"><i className="fas fa-times"></i></button></Link>
			<div className="row callbtns">
			<button onClick={toggleMute} className={audible?"mutebtn":"mutebtn activeCallCtrl"}><i className="fas fa-volume-mute"></i></button>

			<button onClick={toggleVideo} className={visible?"novideo-btn":"novideo-btn activeCallCtrl"}><i className="fas fa-video-slash"></i></button>

			<Link to="/"><button onClick={killStreams} className="endcall-btn"><i className="fas fa-phone-slash"></i></button></Link>
			</div>
		</div>
	);
}

Call.propTypes = {
	dispatch: PropTypes.func.isRequired,
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

Call.defaultProps = {
	feeds: []
};

const mapStateToProps = (state, ownProps) => {
	return({
		room: state.rooms.find(call => call.id === ownProps.location.state.room),

		feeds: state.feeds.filter(feed => feed.roomid === ownProps.location.state.room)
	});
}

const mapDispatchToProps = (dispatch, ownProps) => ({
	dispatch: (stream, sender, roomid) => {
		dispatch(addFeed(stream, sender, roomid))
	}
})

export const CallContainer = connect(mapStateToProps, mapDispatchToProps)(Call)
