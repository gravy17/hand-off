import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {addFeed, joinRoom} from '../actions';

let media = {};
const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
let dimensions = [vw*8/10, vh*2/5];

class Call extends Component {
	constructor(props) {
		super(props);
		var n = 1;
		if(props.room){
		n = props.room.roomUsers.length;}
		var visibility = false;
		if(props.location.state.type==="video"){
			visibility = true;
		}
		// const newGrid = this.calcGrid(vh, vw, n);
		this.state = {self: props.user.name, visible: visibility, audible: true, n: n, feedDimension: dimensions, stream: null, loading: false};
		this.toggleMute = this.toggleMute.bind(this);
		this.toggleVideo = this.toggleVideo.bind(this);
		media = {audio: true, video: visibility}
		this.localVideo = React.createRef();
		this.remoteFeeds = React.createRef();
	}

	componentDidMount() {
		if (!this.props.room){
			let curr = prompt("Confirm room id below:\n ", this.props.location.state.room );
			if(curr && this.props.location.state.room !== curr){
				this.props.enter(curr, this.props.user.name);
				setTimeout(this.props.history.push(
					{ pathname: '/call/'+curr,
						state: {
							room: curr,
							type: this.props.location.state.type
						}
					}
				), 500);
			}
		}else {
			if (!this.props.room.roomUsers.length || !this.props.room.roomUsers.includes(this.props.user.name)){
				this.props.enter(this.props.location.state.room, this.props.user.name);
				setTimeout(this.forceUpdate(), 500);
			}
		}
		this.setState({ loading: true}, async()=> {
			let usrMedia = await navigator.mediaDevices.getUserMedia(media);
			console.log(this.localVideo.current);
			alert("streaming may fail if following is '{}':\n\n"+JSON.stringify(navigator.mediaDevices))
			alert("About to set media\n" +JSON.stringify(this.localVideo.current));
			this.localVideo.current.srcObject = usrMedia;
			this.props.dispatch(usrMedia, this.state.self, this.props.room.roomid);
			this.setState({
				loading: false,
				stream: usrMedia
			})
		})
	}

	// componentDidUpdate() {
	// }

	handleVideo(stream) {

	}

	videoError(err) {
		console.log("error: "+err);
	}

	componentWillUnmount () {
		if(this.localVideo.current.srcObject){	this.localVideo.current.srcObject.getTracks().forEach(track => track.stop());
		this.localVideo.current.srcObject = null;}

		if(this.remoteFeeds.current?.length){
			this.remoteFeeds.current.forEach(feed => {
				feed.srcObject.getTracks().forEach(track => track.stop());
				feed.srcObject = null
			})
		}
	}

	toggleMute () {
		media.audio = !this.state.audible
		this.setState((state)=> ({
			audible: !state.audible
		}))
		if(this.localVideo.current.srcObject){	this.localVideo.current.srcObject.getAudioTracks().forEach(track => track.applyConstraints(media));}
	}

	toggleVideo () {
		media.video = !this.state.visible
		this.setState((state)=> ({
			visible : !state.visible
		}))
		if(this.localVideo.current.srcObject){	this.localVideo.current.srcObject.getVideoTracks().forEach(track => track.applyConstraints(media));}
	}

  render() {
		let videoFeeds;
		if(this.props.feeds.length){
			videoFeeds = this.props.feeds.map((feed, index) =>
				{ return (
					<Feed feed={feed} index={index} dimensions={this.state.feedDimension} key={feed.sender} self={this.state.self}/>
				); }
			);
			this.remoteFeeds= Array(this.props.feeds.length).fill().map((_, i)=> this.remoteFeeds[i] || React.createRef())
			if(this.remoteFeeds.current.length){
				this.props.feeds.forEach((feed, i) => {
						this.remoteFeeds.current[i].srcObject = feed.src
				})
			}
		}
    return (
      <div className="page call">
				<div className="feedLayer">
				<div className="feed"><video id="myFeed" autoPlay ref={this.localVideo} width={this.state.feedDimension[0]} height={this.state.feedDimension[1]}>
				</video><h5 className="feedtitle">"Me"</h5>
				</div>
				{videoFeeds}
				</div>
        <Link to="/"><button className="closebtn"><i className="fas fa-times"></i></button></Link>
				<div className="row callbtns">
				<button onClick={this.toggleMute} className={this.state.audible?"mutebtn":"mutebtn activeCallCtrl"}><i className="fas fa-volume-mute"></i></button>

				<button onClick={this.toggleVideo} className={this.state.visible?"novideo-btn":"novideo-btn activeCallCtrl"}><i className="fas fa-video-slash"></i></button>

				<Link to="/"><button className="endcall-btn"><i className="fas fa-phone-slash"></i></button></Link>
				</div>
      </div>
    );
  }
}

const Feed = (prop) => {
	return (<div className="feed"><video autoPlay ref={this.remoteFeeds[prop.index]} width={prop.dimensions[0]} height={prop.dimensions[1]}>
	</video><h5 className="feedtitle">{prop.feed.sender}</h5></div>)
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

const mapStateToProps = (state, ownProps) => {
	return({
		room: state.rooms.find(call => call.id === ownProps.location.state.room),

		feeds: state.feeds//.filter(feed => feed.roomid === ownProps.location.state.room)
	});
}

const mapDispatchToProps = (dispatch, ownProps) => ({
	dispatch: (stream, sender, roomid) => {
		dispatch(addFeed(stream, sender, roomid))
	},
	enter: () => {
		dispatch(joinRoom(ownProps.location.state.room, ownProps.user.name))
	}
})

export const CallContainer = connect(mapStateToProps, mapDispatchToProps)(Call);

	// calcGrid (vh, vw, n) {
	// 	if (n === 1){
	// 		return [1, 1];//w*h
	// 	}
	// 	//Deriving grid by highest common factor of n obtained via remainder method for a*b =c, where n is c and a and b are factors
	// 	var a = 2; var c = n;
	// 	while(a<c){
	// 		if (c%a === 0){
	// 			c/=a;
	// 		} else {
	// 			a++;
	// 		}
	// 	} var b = c/a;
	// 	if (b < a){
	// 		c = b;
	// 		b = a;
	// 		a = c;
	// 	}
	// 	if (vh > vw) {
	// 		return [a,b];
	// 	} else {
	// 		return [b,a];
	// 	}
	// }

 	// static getDerivedStateFromProps (props, state) {
	// 	if(props.room){
	// 		if(state.n !== props.room.roomUsers.length){
	// 			const newN = props.room.roomUsers.length;
	// 			const newGrid = this.calcGrid(vh, vw, newN);
	// 			dimensions = [(vw/newGrid[0]), (vh/newGrid[1])];
	// 			return ({...state, grid: newGrid, n: newN, feedDimension: dimensions});
	// 		}
	// 		else
	// 		{return state}
	// 	}
	// }
