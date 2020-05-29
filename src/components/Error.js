import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Error extends Component {
  render() {
    return (
      <div className=" page row">
				<div className="error-page">
        <h1>
        	Error: 404
        </h1>
				<h2>Page Not Found</h2>
				<p><Link to="/">Back</Link></p>
				</div>
      </div>
    );
  }
}

export default Error;
