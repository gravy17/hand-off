import React, {Component} from 'react';
import {Link} from 'react-router-dom';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {addFeed, createRoom, joinRoom} from '../actions';

let media = {};
const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
let dimensions = [vw, vh];

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
		const newGrid = this.calcGrid(vh, vw, n);
		dimensions = [(vw/newGrid[0]), (vh/newGrid[1])];

		this.state = {self: props.user.name, visible: visibility, audible: true, n: n, grid:newGrid, feedDimension: dimensions, stream: null};
		this.toggleMute = this.toggleMute.bind(this);
		this.toggleVideo = this.toggleVideo.bind(this);
		if(visibility){
			media = {audio: true,
			video: {width: dimensions[0], height: dimensions[1]}
			}
		} else {
			media = {audio: true,
			video: false}
		}
		// console.log(JSON.stringify(this.props));
	}

	componentDidMount() {
		try {
	 		navigator.mediaDevices.getUserMedia(media, this.handleVideo, this.videoError);

		}
		catch (err) {
			console.log("error: "+err);
		}
		if (!this.props.room){
			let curr = prompt("Confirm room id below:\n ", this.props.location.state.room );
			if(curr && this.props.location.state.room !== curr){
				this.props.enter(curr, this.props.user.name);
				this.forceUpdate();
				setTimeout(this.props.history.push(
					{ pathname: '/call/'+curr,
						state: {
							room: curr,
							type: this.props.location.state.type
						}
					}
				), 1000);
			}
		}else {
			if (!this.props.room.roomUsers.length || !this.props.room.roomUsers.includes(this.props.user.name)){
				this.props.enter(this.props.location.state.room, this.props.user.name);this.forceUpdate();
			}
		}
	}

	handleVideo(stream) {
		console.log(stream);
		this.setState({ stream: stream}); this.props.dispatch(stream, this.state.self, this.props.room.roomid);
	}

	videoError(err) {
		console.log("error: "+err);
	}

	componentDidUpdate (){
		let visibility = (typeof media.video !== 'object');
		if(media.audio !== this.state.audible||visibility !== this.state.visible){
			if(this.state.visible){
				media = {audio: this.state.audible,
				video: {width: this.state.feedDimension[0], height: this.state.feedDimension[1]}}
			} else {
				media = {audio: this.state.audible,
				video: false};
			}
			try {
		 		navigator.mediaDevices.getUserMedia(media, this.handleVideo, this.videoError);
			}
			catch (err) {
				console.log("error: "+err);
			}
		}
	}

	calcGrid (vh, vw, n) {
		if (n === 1){
			return [1, 1];//w*h
		}
		//Deriving grid by highest common factor of n obtained via remainder method for a*b =c, where n is c and a and b are factors
		var a = 2; var c = n;
		while(a<c){
			if (c%a === 0){
				c/=a;
			} else {
				a++;
			}
		} var b = c/a;
		if (b < a){
			c = b;
			b = a;
			a = c;
		}
		if (vh > vw) {
			return [a,b];
		} else {
			return [b,a];
		}
	}

 	static getDerivedStateFromProps (props, state) {
		if(props.room){
			if(state.n !== props.room.roomUsers.length){
				const newN = props.room.roomUsers.length;
				const newGrid = this.calcGrid(vh, vw, newN);
				dimensions = [(vw/newGrid[0]), (vh/newGrid[1])];
				return ({...state, grid: newGrid, n: newN, feedDimension: dimensions});
			}
			else
			{return state}
		}
	}

	componentWillUnmount () {
		if(this.state.stream){	this.state.stream.getTracks().forEach(track => track.stop());}

		if(this.props.feeds.length){
			this.props.feeds.forEach(feed => {
				feed.src.getTracks().forEach(track => track.stop());
			})
		}
	}

	toggleMute () {
		this.setState({
			audible: !this.state.audible
		})
	}

	toggleVideo () {
		this.setState({
			visible : !this.state.visible
		})
	}

  render() {
		let videoFeeds;
		if(this.props.feeds.length){
			videoFeeds = this.props.feeds.map((feed) =>
				{ return (
					<Feed feed={feed} dimensions={this.state.feedDimension} key={feed.sender} self={this.state.self}/>
				); }
			);
		}
    return (
      <div className="page call">
				<div className="feedLayer">
				<div className="feed"><video id="myFeed" autoPlay width={this.state.feedDimension[0]} height={this.state.feedDimension[1]}>
					<source src={this.state.stream}/>
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
	return (<div className="feed"><video autoPlay src={prop.feed.src} width={prop.dimensions[0]} height={prop.dimensions[1]}>
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

		feeds: state.feeds.filter(feed => feed.roomid === ownProps.location.state.room)
	});
}

const mapDispatchToProps = (dispatch, ownProps) => ({
	dispatch: (stream, sender, roomid) => {
		dispatch(addFeed(stream, sender, roomid))
	},
	create: () => {
		dispatch(createRoom("Room-".concat(ownProps.user.name), ownProps.location.state.room, ownProps.user.name))
	},
	enter: () => {
		dispatch(joinRoom(ownProps.location.state.room, ownProps.user.name))
	}
})

export const CallContainer = connect(mapStateToProps, mapDispatchToProps)(Call);
