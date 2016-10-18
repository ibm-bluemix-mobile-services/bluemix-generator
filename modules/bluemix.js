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
		Cache = require('./cache'),
		BluemixApiClient = require('./bluemix-api-client.js'),
		BluemixServiceApi = require('./bluemix-service-api.js');

	module.exports = function (config) {

		if (!_.has(config, 'endpoint.api')) {
			throw  new Error('missing `api` endpoint');
		} else if (!_.has(config, 'endpoint.auth')) {
			throw new Error('missing `auth` endpoint');
		} else if (!_.has(config, 'root')) {
			throw new Error('missing `root` key');
		}

		var api = new BluemixServiceApi(new BluemixApiClient(config.endpoint));

		var authenticationCache = new Cache(config.root + '/.generator/token');

		return {
			getAuthTokens: function () {
				return authenticationCache.load();
			},
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
