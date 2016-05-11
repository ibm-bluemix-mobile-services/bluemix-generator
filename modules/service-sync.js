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
	var BluemixServiceApi = require('./bluemix-service-api'),
		_ = require('lodash');

	function ServiceSync(api) {
		if (!(api instanceof BluemixServiceApi)) {
			throw {msg: 'api must be an instance of BluemixServiceApi'};
		}

		this.api = api;
	}

	ServiceSync.prototype.pullServices = function (services, space_guid) {
		var serviceMap = {},
			api = this.api;


		services.forEach(function (service) {
			serviceMap[service.type] = service;
		});

		return api.getSpaceSummary(space_guid).then(function(summary){

			summary.services.forEach(function(instance){
				var serviceLabel = _.get(instance, 'service_plan.service.label');

				if (_.has(serviceMap, serviceLabel)) {
					var bound = serviceMap[serviceLabel];
					if (!(bound.services instanceof Array)) {
						bound.services = [];
					}

					bound.services.push(instance);
				}
			});


			return Promise.resolve(serviceMap);
		});
	};

	module.exports = ServiceSync;
})(module);
