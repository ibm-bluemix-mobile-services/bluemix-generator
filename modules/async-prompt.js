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
	var util = require("util"),
		chalk = require("chalk"),
		runAsync = require('run-async'),
		figures = require("figures"),
		cliCursor = require("cli-cursor"),
		Base = require("inquirer/lib/prompts/base"),
		observe = require("inquirer/lib/utils/events"),
		Paginator = require("inquirer/lib/utils/paginator"),
		Choices = require('inquirer/lib/objects/choices');

	function Prompt() {
		Base.apply(this, arguments);

		this.showHint = true;
		this.paginator = new Paginator();

		this.errorMsg = null;
		this.selected = 0;

		this.opt.choices = new Choices([], this.answers);

		var pull = this.opt.pull;

		if (typeof pull === 'function') {
			var pullOptions = pull();

			if (pullOptions instanceof Array) {
				this.opt.choices = new Choices(pullOptions, this.answers);

				this.showHint = false;

				this.render();
			} else {
				pullOptions.then(function (data) {
					this.showHint = false;
					this.opt.choices = new Choices(data, this.answers);

					this.render();
				}.bind(this)).catch(function (msg) {
					this.showError(msg);
				}.bind(this));
			}
		} else {
			this.throwParamError("pull");
		}
	};

	util.inherits(Prompt, Base);

	Prompt.prototype._run = function (cb) {
		var events = observe(this.rl);

		this.done = cb;

		var keyUps = events.keypress.filter(function (e) {
			return e.key.name === 'up';
		}).share();

		var keyDowns = events.keypress.filter(function (e) {
			return e.key.name === 'down';
		}).share();


		var outcome = this.handleSubmit(events.line);

		keyUps.takeUntil(outcome.success).forEach(this.onUpKey.bind(this));
		keyDowns.takeUntil(outcome.success).forEach(this.onDownKey.bind(this));

		outcome.success.forEach(this.onSubmit.bind(this));

		// Init the prompt
		cliCursor.hide();

		this.render();
	};


	Prompt.prototype.showError = function (error) {
		this.showHint = false;
		this.errorMsg = error;
		this.render(error);
	};

	Prompt.prototype.render = function (error) {
		var bottomContent = '';

		var message = this.getQuestion();

		if (this.showHint) {
			message += chalk.dim(typeof this.opt.hint !== 'undefined' ? this.opt.hint : '');
		}

		if (this.answered) {
			message += chalk.cyan(this.answer.name);
		} else {
			var choiceList = listRender(this.opt.choices, this.selected);

			if (choiceList.length > 0) {
				message += "\n" + this.paginator.paginate(choiceList, this.selected, this.opt.pageSize);
			}
		}

		if (error || this.errorMsg) {
			if (!error) {
				error = this.errorMsg;
			}

			bottomContent = chalk.red('>> ') + error;
		}

		this.screen.render(message, bottomContent);

		return this;
	};

	Prompt.prototype.handleSubmit = function (submit) {
		var validate = runAsync(this.opt.validate);
		var filter = runAsync(this.opt.filter);
		var validation = submit.flatMap(function () {
			var value = this.answer = this.opt.choices.getChoice(this.selected);

			var validator = function (filteredValue) {
				return validate(filteredValue, this.answers).then(function (isValid) {
					return {isValid: isValid, value: filteredValue};
				});
			}.bind(this);

			var filterInstance = filter(value);

			if (filterInstance instanceof Object && typeof filterInstance.then === 'function') {
				return filterInstance.then(validator);
			}

			return validator(filterInstance);
		}.bind(this)).share();

		var success = validation.filter(function (state) {
			return state.isValid === true && typeof this.answer !== 'undefined';
		}.bind(this)).take(1);

		var error = validation.filter(function (state) {
			return state.isValid !== true;
		}).takeUntil(success);


		return {
			success: success,
			error: error
		};
	};

	Prompt.prototype.onSubmit = function () {
		this.answered = true;

		this.render();

		this.screen.done();

		cliCursor.show();

		this.done(this.answer);
	};


	Prompt.prototype.onUpKey = function () {
		var len = this.opt.choices.realLength;
		this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
		this.render();
	};

	Prompt.prototype.onDownKey = function () {
		var len = this.opt.choices.realLength;
		this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
		this.render();
	};

	function listRender(choices, pointer) {
		var output = '';

		choices.forEach(function (choice, i) {
			var line = '  ' + choice.name;

			if (i === pointer) {
				line = chalk.cyan(figures.pointer + ' ' + line.trim());
			}

			output += line + ' \n';
		});

		return output.replace(/\n$/, '');
	}

	module.exports = Prompt;

})(module);
