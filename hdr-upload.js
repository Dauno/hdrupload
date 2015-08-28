/*
	HDRUpload v0.0.1
	Updated: enero 21, 2015
	Author: Dauno Martínez
	Usage:
	$('#content').hdrupload({
        messageDropArea: '#content',
        elementError: '#content',
        urlUploadFile: 'uploadImage.php',
        progressBar: '#content',
        classes: {
            dragOver: 'drag-hover',
            dragDrop: 'drag-drop',
            loaded: '',
			loading: ''
        },
        success: function(data, error, element) {
			if (data.code == 200) {
				readURL(data.response.fileUrl);
			}
			else {
				error(element, data.message);
			}
		}
    });
*/

(function($) {
	'use strict';

	if (!Function.prototype.bind) {
		Function.prototype.bind = function(scope)
		{
			var fn = this;
			return function()
			{
				return fn.apply(scope);
			};
		};
	}

	var uuid = 0;


	// Plugin
	$.fn.hdrupload = function(options) {
		var val = [];
		var args = Array.prototype.slice.call(arguments, 1);

		if (typeof options === 'string') {
			this.each(function() {
				var instance = $.data(this, 'hdrupload');
				var func;

				if (options.search(/\./) != '-1') {
					func = options.split('.');
					if (typeof instance[func[0]] != 'undefined')
					{
						func = instance[func[0]][func[1]];
					}
				}
				else {
					func = instance[options];
				}

				if (typeof instance !== 'undefined' && $.isFunction(func)) {
					var methodVal = func.apply(instance, args);
					if (methodVal !== undefined && methodVal !== instance)
					{
						val.push(methodVal);
					}
				}
				else {
					$.error('No such method "' + options + '" for hdrupload');
				}
			});
		}
		else {
			this.each(function() {
				$.data(this, 'hdrupload', {});
				$.data(this, 'hdrupload', new HDRUpload(this, options));
			});
		}

		if (val.length === 0) return this;
		else if (val.length === 1) return val[0];
		else return val;

	};

	// Initialization
	function HDRUpload(el, options) {
		return new HDRUpload.prototype.init(el, options);
	}

	// Functionality
	$.HDRUpload = HDRUpload;
	$.HDRUpload.VERSION = '0.0.1';
	$.HDRUpload.modules = ['build','core','upload'];

	$.HDRUpload.opts = {
		// settings
		elementError: '',
		elementErrorMessage: '',
		contentDropAreaProgress: '',
		urlUploadFile: '',
		progressBar: '',
		thumbs: false,
		classes: {
			dragOver: '',
			dragDrop: '',
			loaded: '',
			loading: ''
		},
		success: function() {}
	};

	// Functionality
	HDRUpload.fn = $.HDRUpload.prototype = {

		// Initialization
		init: function(el, options) {
			this.$element = $(el);
			this.uuid = Math.floor(Math.random() * 1000000);
			this.inputName = this.$element.find('input[type=file]').attr('name');
			this.inputId = this.$element.find('input[type=file]').attr('id');
			this.loadOptions(options);
			this.loadModules();
			// build
			this.start = true;
			this.build.run();
		},
		loadOptions: function(options) {
			this.opts = $.extend(
				{},
				$.extend(true, {}, $.HDRUpload.opts),
				this.$element.data(),
				options
			);
		},
		getModuleMethods: function(object) {
			return Object.getOwnPropertyNames(object).filter(function(property)
			{
				return typeof object[property] == 'function';
			});
		},
		loadModules: function() {
			var len = $.HDRUpload.modules.length;
			for (var i = 0; i < len; i++)
			{
				this.bindModuleMethods($.HDRUpload.modules[i]);
			}
		},
		bindModuleMethods: function(module) {
			if (typeof this[module] == 'undefined') return;

			// init module
			this[module] = this[module]();

			var methods = this.getModuleMethods(this[module]);
			var len = methods.length;

			// bind methods
			for (var z = 0; z < len; z++) {
				this[module][methods[z]] = this[module][methods[z]].bind(this);
			}
		},
		build: function() {
			return {
				run: function() {
					this.filetype = this.opts.filetype;
					this.thumbs = this.opts.thumbs;
					this.contentDropAreaProgress = this.opts.contentDropAreaProgress;
					this.$elementerror = this.build.elementError();
					this.$progressbar = this.build.progressBar();
					this.$messagedroparea = this.build.messageDropArea();

					if (this.core.isDraggable()) {
						this.build.drag(this,this.opts.classes);
					}
					else {
						this.$messagedroparea.remove();
					}

					this.build.changeForm(this);
				},
				form: function() {
					this.$form = this.build.createForm();
					this.$inputTypeFile = this.build.createInput();
					this.$inputThumbs = this.build.createInputThumbs();
					this.$element.find('input[type=file]').attr({
						name: 'data[File][file]',
						id: 'FileFile'
					});
					this.kids = this.$element.children();
					this.$form.append(this.$inputTypeFile);
					this.$form.append(this.$inputThumbs);
					this.$form.append(this.kids);
					this.$element.append(this.$form);
				},
				createForm: function() {
					return $('<form></form>').attr({
						id: 'form-' + this.uuid,
						method: 'post',
						action: this.core.action(),
						enctype: 'multipart/form-data'
					});
				},
				destroyForm: function() {
					this.$inputTypeFile.remove();
					this.$inputThumbs.remove();
					this.$form.find('input[type=file]').attr({
						name: this.inputName,
						id: this.inputId
					});
					this.kids = this.$form.children();
					this.$element.append(this.kids);
					this.$form.remove();
				},
				elementError: function() {
					return $(this.opts.elementError).hide();
				},
				messageDropArea: function() {
					return $(this.opts.messageDropArea);
				},
				createInput: function() {
					return $('<input>').attr({
						type: 'hidden',
						id: 'fileType' + this.uuid,
						value: this.filetype,
						name: 'data[File][fileType]'
					});
				},
				createInputThumbs: function() {
					return $('<input>').attr({
						type: 'hidden',
						id: 'thumbs' + this.uuid,
						value: this.thumbs,
						name: 'data[File][thumbs]'
					});
				},
				progressBar: function() {
					return $(this.opts.progressBar);
				},
				changeForm: function(el) {
					el.$element.on('change','input' , function() {
						el.$element.parent().removeClass(el.opts.classes.loaded).addClass(el.opts.classes.loading);
						el.upload.jqueryForm(el);
					});
				},
				progressBarPercent: function(percent) {
					this.percentVal = percent + '%';
					this.$progressbar.css('width', this.percentVal);
					this.$progressbar.attr('aria-valuenow', percent);
					this.$progressbar.html(this.percentVal);
				},
				drag: function(el,classes) {
					el.$element.on('dragover', function(e) {
						e.preventDefault();
						e.stopPropagation();
						el.$element.parent().addClass(classes.dragOver);
					});
					el.$element.on('dragenter', function(e) {
						e.preventDefault();
						e.stopPropagation();
					});
					el.$element.on('dragleave', function(e) {
						e.preventDefault();
						e.stopPropagation();
						el.$element.parent().removeClass(classes.dragOver);
					});
					el.$element.on('drop', function(e){
						el.$element.parent().removeClass(classes.loaded).addClass(classes.loading);
						el.$element.parent().removeClass(classes.dragOver).addClass(classes.dragDrop);
						if(e.originalEvent.dataTransfer){
							if(e.originalEvent.dataTransfer.files.length) {
								e.preventDefault();
								e.stopPropagation();
								el.upload.ajax(el,e.originalEvent.dataTransfer.files[0]);
							}
						}
					});
				}
			};
		},
		upload: function() {
			return {
				ajax: function(el, file) {
					this.$messagedroparea.text(this.contentDropAreaProgress);
					var action = el.core.action();

					var form_data = new FormData();
					form_data.append("data[File][file]", file);
					form_data.append("data[File][fileType]", el.filetype);
					form_data.append("data[File][thumbs]", el.thumbs);
					var xhr = new XMLHttpRequest();

					xhr.upload.addEventListener('progress', function(e) {
						if (e.lengthComputable) {
							var percent = Math.round((e.loaded * 100) / e.total);
							el.build.progressBarPercent(percent);
						}
					}, false);

					xhr.upload.addEventListener("error", function(e) {
						el.upload.error(el);
					}, false);

					xhr.upload.addEventListener("abort", function(e) {
						el.upload.error(el);
					}, false);

					xhr.open('post', action, true);

					xhr.onreadystatechange = function() {
						if (xhr.readyState == 4 && xhr.status == 200) {
							el.upload.success(xhr.responseText);
						}
					};
					xhr.send(form_data);
				},
				jqueryForm: function(el) {
					this.build.form();
					this.$messagedroparea.text(this.contentDropAreaProgress);

					this.$form.ajaxForm({
						beforeSend: function() {
							el.build.progressBarPercent(0);
						},
						uploadProgress: function(event, position, total, percentComplete) {
							el.build.progressBarPercent(percentComplete);
						},
						success: function(response) {
							el.build.progressBarPercent(100);
						},
						error: function() {
							el.upload.error(el);
						},
						complete: function(xhr) {
							el.upload.success(xhr.responseText);
						}
					});
					this.$form.submit();
					this.build.destroyForm();
				},
				success: function(response) {
					this.response = $.parseJSON(response);
					this.element = {
						$element: this.$element,
						$elementerror: this.$elementerror,
						$progressbar: this.$progressbar,
						$messagedroparea: this.$messagedroparea,
						build: {
							progressBarPercent: this.build.progressBarPercent
						},
						opts: {
							classes: {
								dragDrop: this.opts.classes.dragDrop
							}
						}
					};
					this.opts.success(this.response,this.upload.error, this.element);
					this.$element.parent().removeClass(this.opts.classes.dragDrop);
					this.$element.parent().removeClass(this.opts.classes.loading).addClass(this.opts.classes.loaded);
				},
				error: function(el, message) {
					el.$progressbar.html('Error');
					setTimeout(function(){
						el.build.progressBarPercent(0);
						el.$element.parent().removeClass(el.opts.classes.dragDrop);
						el.$element.parent().removeClass(el.opts.classes.loaded);
					}, 3000);
					setInterval(function(){
						if (el.$element.parent().hasClass(el.opts.classes.loaded)) {
							el.$element.parent().removeClass(el.opts.classes.loaded);
						}
					}, 100);
					if (message) {
						el.$elementerror.find(this.opts.elementErrorMessage).html(message);
						el.$elementerror.delay(1000).fadeIn();
					}
					else{
						el.$elementerror.delay(1000).fadeIn();
					}
				}
			};
		},
		core: function() {
			return {
				isDraggable: function() {
					return (window.FormData && window.File) ? true : false;
				},
				action: function() {
					return window.location.origin + '/' + this.opts.urlUploadFile;
				}
			};
		}
	};

	// constructor
	HDRUpload.prototype.init.prototype = HDRUpload.prototype;

})(jQuery);
