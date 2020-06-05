import React, {Component} from 'react';
var WebTorrent = require('webtorrent');
var client = new WebTorrent();

class FileShare extends Component {
	constructor(props) {
		super(props);
		this.state = {downfile: null, torrId: '', upfiles: null, seedURI: '', seedHash: ''};
		this.handleSeed = this.handleSeed.bind(this);
		this.share = this.share.bind(this);
		this.handleDl = this.handleDl.bind(this);
		this.torrIdChange = this.torrIdChange.bind(this);

		this.seedInput = React.createRef();
	}

	handleSeed(event) {
		if(event.target.files){
			client.seed(event.target.files, (torrent) => {
				this.setState({seedURI: torrent.magnetURI, seedHash: torrent.infoHash})
				prompt("Seeding...\nCopy and share the magnetURI below to peers through the chat: ", torrent.magnetURI)
			})
			this.setState({upfiles: event.target.files});
		}
	}

	share() {
		this.seedInput.current.click();
	}

	handleDl() {
		alert("Downloading. Please wait...");
			client.add(this.state.torrId, (torrent) => {
				torrent.files.forEach((file) => {
					file.appendTo('#file-container');
					alert('download complete')
				})
			});
	}

	torrIdChange(event) {
		this.setState({torrId: event.target.value})
	}

  render() {

    return (
      <div className="page">
				<input type="text" id="dlInput" placeholder="Type/Paste Download Link" className="dl-input" onChange={this.torrIdChange}/>
				<button className="dlbtn" onClick={this.handleDl}><i className="fas fa-download"></i>Download</button>
				<div id="file-container"></div>

				<input type="file" id="file-input" style={{display: 'none'}} name="file-input" ref={this.seedInput} onChange={this.handleSeed}/>

				<button className="sharebtn" onClick={this.share}><i className="fas fa-share-square"></i>Share</button>
      </div>
    );
  }
}

export default FileShare;
