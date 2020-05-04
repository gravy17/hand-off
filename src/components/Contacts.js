import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Contacts extends Component {
  render() {
    return (
      <div>
        <p>
          Contacts
            <Link to="/call">Calls</Link>
            <Link to="/details">Details</Link>
        </p>
      </div>
    );
  }
}

export default Contacts;
