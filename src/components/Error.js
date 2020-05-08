import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Error extends Component {
  render() {
    return (
      <div className="container page">
        <p>
        	Error: 404 Not Found
            <Link to="/">Home</Link>
        </p>
      </div>
    );
  }
}

export default Error;
