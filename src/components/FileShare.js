import React, {Component} from 'react';

class FileShare extends Component {
  render() {
    return (
      <div className="page">
				<input type="text" id="dlInput" placeholder="Type/Paste Download Link" className="dl-input"/>

				<button className="dlbtn"><i className="fas fa-download"></i>Download</button>

				<button className="sharebtn"><i className="fas fa-share-square"></i>Share</button>
      </div>
    );
  }
}

export default FileShare;
