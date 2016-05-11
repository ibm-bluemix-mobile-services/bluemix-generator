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

	var _ = require("lodash"),
		request = require('superagent'),
		Cache = require('./cache'),
		BluemixApiClient = require('./bluemix-api-client.js'),
		BluemixServiceApi = require('./bluemix-service-api.js');

	module.exports = function (config) {

		if (!_.has(config, 'endpoint.url')) {
			throw  new Error('missing `url` object');
		} else if (!_.has(config, 'endpoint.url.auth')) {
			throw new Error('missing `url.auth` key');
		} else if (!_.has(config, 'endpoint.url.api')) {
			throw new Error('missing `url.api` key');
		} else if (!_.has(config, 'endpoint.host')) {
			throw new Error('missing `host` key');
		} else if (!_.has(config, 'root')) {
			throw new Error('missing `root` key');
		}


		var api = new BluemixServiceApi(new BluemixApiClient(config.endpoint.url));

		var authenticationCache = new Cache(config.root + '/.generator/token');

		return {
			authenticateWithToken: function () {
				return authenticationCache.exists().then(function () {
					return authenticationCache.load();
				}).then(function (auth) {
					api.setOAuthToken(auth.access_token);

					return api.getOrganizations();
				});
			},
			refreshToken: function () {
				return authenticationCache.exists().then(function () {
					return authenticationCache.load();
				}).then(function (auth) {
					return api.authorize(auth.refresh_token);
				}).then(function (response) {
					api.setOAuthToken(response.access_token);

					return authenticationCache.save(response);
				});
			},
			exist: function (name) {
				return new Promise(function (resolve) {
					request.get("http://" + name + "." + config.endpoint.host).end(function (err, res) {
						if (!err && res.statusCode === 200) {
							return resolve(false);
						}
						resolve(name);
					});
				});
			},

			login: function (username, password) {
				return api.login(username, password).then(function (response) {
					api.setOAuthToken(response.access_token);

					return authenticationCache.save(response).then(function () {
						return password;
					}).catch(function () {
						// error caching tokens
						return password;
					});
				}).catch(function () {
					return false;
				})
			},

			api: function () {
				return api;
			}
		};
	};
})(module);
