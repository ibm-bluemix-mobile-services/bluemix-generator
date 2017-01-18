/*
 * Copyright 2016, 2017 IBM Corp.
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

	function BluemixServiceApi(apiClient) {
		this.api = apiClient;
	}

	BluemixServiceApi.prototype.setOAuthToken = function (token) {
		this.api.setOAuthToken(token);
	};

	BluemixServiceApi.prototype.updateEndpoint = function (endpoint) {
		this.api.updateEndpoint(endpoint);
	};

	BluemixServiceApi.prototype.login = function (username, password) {
		return this.api.authenticate('password', username, password);
	};

	BluemixServiceApi.prototype.authorize = function (token) {
		return this.api.authenticate('refresh_token', token);
	};

	BluemixServiceApi.prototype.checkName = function (name, guid) {
		return this.api.get('/v2/routes/reserved/domain/' + guid + '/host/' + name).then(function(response) {
			return -3;
		}).catch(function(error) {
			return name;
		});
	};

	BluemixServiceApi.prototype.getSpaceSummary = function (space_guid) {
		return this.api.get('/v2/spaces/' + space_guid + '/summary').then(function (response) {
			return Promise.resolve(response.body);
		});
	};

	BluemixServiceApi.prototype.getOrganizations = function () {
		return this.api.get('/v2/organizations').then(function (response) {
			return Promise.resolve(response.body.resources.map(function (e) {
				return {
					guid: e.metadata.guid,
					name: e.entity.name
				};
			}));
		});
	};

	BluemixServiceApi.prototype.getSpaces = function (org) {
		return this.api.get('/v2/organizations/' + org + '/spaces').then(function (response) {
			return Promise.resolve(response.body.resources.map(function (e) {
				return {
					guid: e.metadata.guid,
					name: e.entity.name
				};
			})).catch(function () {
				return Promise.reject(false);
			});
		});
	};

	BluemixServiceApi.prototype.getServiceLevels = function (label) {
		return this.api.get('/v2/services?q=label:' + label).then(function (response) {
			if (response.body.total_results == 1) {
				return Promise.resolve(response.body.resources[0].metadata.guid);
			} else if (response.body.total_results == 0) {
				return Promise.reject('Can\'t find service on Bluemix -> ' + label);
			} else {
				return Promise.reject('Multiple services with label -> ' + label);
			}
		}).then(function (guid) {
			return this.api.get('/v2/services/' + guid + '/service_plans').then(function (response) {
				return Promise.resolve(response.body.resources.map(function (plan) {
					return {
						guid: plan.metadata.guid,
						name: plan.entity.name
					}
				}));
			});
		}.bind(this));
	};

	BluemixServiceApi.prototype.getServiceDetails = function (service_guid) {
		return this.api.get('/v2/services/' + service_guid).then(function (response) {
			return Promise.resolve({
				guid: response.body.metadata.guid,
				label: response.body.entity.label
			});
		}.bind(this));
	};

	BluemixServiceApi.prototype.getServicePlanDetails = function (service_plan_guid) {
		return this.api.get('/v2/service_plans/' + service_plan_guid).then(function (response) {
			return Promise.resolve({
				guid: response.body.metadata.guid,
				name: response.body.entity.name,
				service_guid: response.body.entity.service_guid
			});
		}.bind(this));
	};

	BluemixServiceApi.prototype.getServiceInstanceDetails = function (service_guid) {
		return this.api.get('/v2/service_instances/' + service_guid).then(function (response) {
			return Promise.resolve({
				guid: response.body.metadata.guid,
				name: response.body.entity.name
			});
		}.bind(this));
	};

	BluemixServiceApi.prototype.getServiceInstances = function (space_guid) {
		return this.api.get('/v2/service_instances?q=space_guid:' + space_guid).then(function (response) {
			var services = response.body.resources.map(function (service) {
				return {
					guid: service.metadata.guid,
					name: service.entity.name,
					service_plan_guid: service.entity.service_plan_guid,
					space_guid: service.entity.space_guid
				};
			});

			return Promise.resolve(services);
		}.bind(this));
	};

	BluemixServiceApi.prototype.getServiceKeys = function (service_instance_guid) {
		return this.api.get('/v2/service_keys?q=service_instance_guid:' + service_instance_guid).then(function (response) {
			return Promise.resolve(response.body.resources);
		});
	};

	BluemixServiceApi.prototype.createServiceKeys = function (service_guid, name) {
		return this.api.post('/v2/service_keys', {
			"service_instance_guid": service_guid,
			"name": name
		}).then(function (response) {
			return Promise.resolve(response.body);
		});
	};


	BluemixServiceApi.prototype.createServiceInstance = function (space_guid, plan_guid, name) {
		return this.api.post('/v2/service_instances', {
			"space_guid": space_guid,
			"name": name,
			"service_plan_guid": plan_guid,
			"parameters": {},
			"tags": []
		}).then(function (response) {
			return response.body;
		}.bind(this));
	};

	BluemixServiceApi.prototype.deleteService = function (service_guid, cascade) {
		return this.api.delete('/v2/service_instances/' + service_guid + '?accepts_incomplete=true' + (cascade ? '&recursive=true' : ''));
	};

	module.exports = BluemixServiceApi;
})(module);
