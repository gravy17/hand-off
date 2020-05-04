import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Error extends Component {
  render() {
    return (
      <div>
        <p>
        	Error
            <Link to="/">Home</Link>
        </p>
      </div>
    );
  }
}

export default Error;
