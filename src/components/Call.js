import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Call extends Component {
  render() {
    return (
      <div className="container page">
        <p>
          Calls
            <Link to="/">Contacts</Link>
        </p>
      </div>
    );
  }
}

export default Call;
