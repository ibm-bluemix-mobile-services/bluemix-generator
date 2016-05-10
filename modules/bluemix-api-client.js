/*
 Copyright 2016 IBM Corp.
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
        http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

(function (module) {
	var request = require('superagent');

	function HttpClient(endpoint) {
		this.endpoint = endpoint;
		this.token = null;
	}

	HttpClient.prototype.setOAuthToken = function (token) {
		this.token = token;
	};

	HttpClient.prototype.delete = function (path) {
		if (!this.token) {
			return Promise.reject('Missing OAuth token.');
		}

		return new Promise(function (resolve, reject) {
			request.delete(this.endpoint + path).set('Content-Type', 'application/json;charset=utf-8')
				.set('Accept', 'application/json;charset=utf-8')
				.set('Authorization', 'bearer ' + this.token)
				.end(function (err, res) {
					if (!err) {
						resolve(res);
					}
					else {
						reject(err);
					}
				});
		}.bind(this));

	};

	HttpClient.prototype.post = function (path, payload) {
		if (!this.token) {
			return Promise.reject('Missing OAuth token.');
		}

		return new Promise(function (resolve, reject) {
			request.post(this.endpoint + path).set('Content-Type', 'application/json;charset=utf-8')
				.set('Accept', 'application/json;charset=utf-8')
				.set('Authorization', 'bearer ' + this.token)
				.send(payload)
				.end(function (err, res) {
					if (!err) {
						resolve(res);
					}
					else {
						reject(err);
					}
				});
		}.bind(this));

	};

	HttpClient.prototype.get = function (path) {
		if (!this.token) {
			return Promise.reject('Missing OAuth token.');
		}

		return new Promise(function (resolve, reject) {
			request.get(this.endpoint + path).set('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8')
				.set('Accept', 'application/json;charset=utf-8')
				.set('Authorization', 'bearer ' + this.token)
				.end(function (err, res) {
					if (!err) {
						resolve(res);
					}
					else {
						reject(err);
					}
				});
		}.bind(this));
	};

	module.exports = HttpClient;
})(module);
