import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Details extends Component {
  render() {
    return (
      <div className="container page">
        <p>
          Details
            <Link to="/">Contacts</Link>
        </p>
      </div>
    );
  }
}

export default Details;
