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

	var cliCursor = require('cli-cursor'),
		interval = null,
		i = 0,
		progress = false;

	function clear() {
		//noinspection JSUnresolvedFunction
		process.stdout.clearLine();  // clear current text
		//noinspection JSUnresolvedFunction
		process.stdout.cursorTo(0);  // move cursor to beginning of line
	}

	module.exports = {
		stop: function () {
			clearInterval(interval);
			clear();

			//noinspection JSUnresolvedFunction
			cliCursor.show();
			progress = false;
		},
		log: function (message) {
			this.stop();

			console.log(message);
		},
		progress: function (message) {
			//noinspection JSUnresolvedFunction
			if(progress) {
				this.stop();
				progress = true;
			}

			cliCursor.hide();

			interval = setInterval(function () {

				clear();

				var dots = new Array(i++ % 5).join('.');

				process.stdout.write(message + ' ' + dots);
			}, 200);
		}
	};

})(module);
