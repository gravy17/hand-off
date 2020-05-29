import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Call extends Component {

	//willunmount fn for cleanup
  render() {
    return (
      <div className=" page call">
        <Link to="/"><button className="closebtn"><i className="fas fa-times"></i></button></Link>

				{/*conditionally render buttons and feedss*/}
				<div className="row callbtns">
				<button className="mutebtn"><i className="fas fa-volume-mute"></i></button>

				<button className="novideo-btn"><i className="fas fa-video-slash"></i></button>

				<button className="endcall-btn"><i className="fas fa-phone-slash"></i></button>
				</div>
      </div>
    );
  }
}

export default Call;
