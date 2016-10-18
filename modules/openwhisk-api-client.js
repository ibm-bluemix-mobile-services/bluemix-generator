/*
 * Copyright 2016 IBM Corp.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (module) {
	var request = require('superagent'),
		_ = require('lodash');

	function OpenWhiskHttpClient(endpoint) {
		this.api = endpoint;
	}

	OpenWhiskHttpClient.prototype.setCredentials = function (username, password) {
		this.authCredentials = new Buffer(username + ':' + password).toString('base64');

		return Promise.resolve(this.authCredentials);
	};

	OpenWhiskHttpClient.prototype.authenticate = function (tokens) {
		return new Promise(function (resolve, reject) {
			request.post(this.api + '/bluemix/v1/authenticate')
				.send({
					accessToken: _.get(tokens, 'access_token'),
					refreshToken: _.get(tokens, 'refresh_token')
				})
				.set('Content-Type', 'application/json')
				.end(function (err, res) {
					if (!err && res.statusCode === 200) {
						return resolve(res.body);
					}

					reject('authorization failed');

				});
		}.bind(this));
	};

	OpenWhiskHttpClient.prototype.delete = function (path) {
		if (!this.authCredentials) {
			return Promise.reject('Missing Login Credentials.');
		}

		return new Promise(function (resolve, reject) {
			request.delete(this.api + path).set('Content-Type', 'application/json;charset=utf-8')
				.set('Accept', 'application/json;charset=utf-8')
				.set('Authorization', 'Basic ' + this.authCredentials)
				.end(function (err, res) {
					if (!err) {
						resolve(res);
					} else {
						reject(err);
					}
				});
		}.bind(this));

	};

	OpenWhiskHttpClient.prototype.post = function (path, payload) {
		if (!this.authCredentials) {
			return Promise.reject('Missing Login Credentials.');
		}

		return new Promise(function (resolve, reject) {
			request.post(this.api + path).set('Content-Type', 'application/json;charset=utf-8')
				.set('Accept', 'application/json;charset=utf-8')
				.set('Authorization', 'Basic ' + this.authCredentials)
				.send(payload)
				.end(function (err, res) {
					if (!err) {
						resolve(res);
					} else {
						reject(err);
					}
				});
		}.bind(this));
	};

	OpenWhiskHttpClient.prototype.put = function (path, payload) {
		if (!this.authCredentials) {
			return Promise.reject('Missing Login Credentials.');
		}

		return new Promise(function (resolve, reject) {
			request.put(this.api + path).set('Content-Type', 'application/json;charset=utf-8')
				.set('Accept', 'application/json;charset=utf-8')
				.set('Authorization', 'Basic ' + this.authCredentials)
				.send(payload)
				.end(function (err, res) {
					if (!err) {
						resolve(res);
					} else {
						reject(err);
					}
				});
		}.bind(this));
	};

	OpenWhiskHttpClient.prototype.get = function (path) {
		if (!this.authCredentials) {
			return Promise.reject('Missing Login Credentials.');
		}

		return new Promise(function (resolve, reject) {
			request.get(this.api + path).set('Content-Type', 'application/x-www-form-urlencoded;charset=utf-8')
				.set('Accept', 'application/json;charset=utf-8')
				.set('Authorization', 'Basic ' + this.authCredentials)
				.end(function (err, res) {
					if (!err) {
						resolve(res);
					} else {
						reject(err);
					}
				});
		}.bind(this));
	};

	module.exports = OpenWhiskHttpClient;
})(module);
