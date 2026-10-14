(function() {

	// Ref:
	// https://coolaj86.com/articles/webcrypto-encrypt-and-decrypt-with-aes/
	// https://coolaj86.com/articles/typedarray-buffer-to-base64-in-javascript/

	let CryptoSuite = {

		ivLen : 16,

		initialize : function()
		{
			return this;
		},

		isCryptoSupported : function()
		{
			return window.crypto != undefined;
		},

		generateUUIDV4 : function()
		{
			return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
				(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
			);
		},

		convertStringToArrayBuffer : function(string)
		{
			var bytes = new Uint8Array(string.length);

			for (var iii = 0; iii < string.length; iii++)
				bytes[iii] = string.charCodeAt(iii);

			return bytes;
		},

		convertArrayBufferToString : function(buffer)
		{
			var string = "";

			for (var iii = 0; iii < buffer.byteLength; iii++)
				string += String.fromCharCode(buffer[iii]);

			return string;
		},

		generateKeyForUUID : function(uuid)
		{
			let arrayBuffer = this.convertStringToArrayBuffer(uuid);

			return crypto.subtle.digest({name: "SHA-256"}, arrayBuffer)
				.then(function(result){

				return crypto.subtle.importKey(
					"raw",
					result,
					{name: "AES-CBC"},
					false,
					["encrypt", "decrypt"])
					.finally(function(e){
						return e;
						}, function(e){
							console.log(e);
						}
					 );
				}
			);
		},

		joinIvAndData : function(iv, data)
		{
			var buf = new Uint8Array(iv.length + data.length);
			Array.prototype.forEach.call(iv, (byte, i) => {
				buf[i] = byte;
			});
			Array.prototype.forEach.call(data, (byte, i) => {
				buf[this.ivLen + i] = byte;
			});
			return buf;
		},

		bufferToBase64: function(buf)
		{
			var binstr = Array.prototype.map.call(buf, function (ch) {
				return String.fromCharCode(ch);
			}).join('');
			return btoa(binstr);
		},

		base64ToBuffer: function(base64)
		{
			var binstr = atob(base64);
			var buf = new Uint8Array(binstr.length);
			Array.prototype.forEach.call(binstr, function (ch, i) {
				buf[i] = ch.charCodeAt(0);
			});
			return buf;
		},

		separateIvFromData: function (buf)
		{
			var iv = new Uint8Array(this.ivLen);
			var data = new Uint8Array(buf.length - this.ivLen);
			Array.prototype.forEach.call(buf, (byte, i) => {
				if (i < this.ivLen) {
					iv[i] = byte;
				} else {
					data[i - this.ivLen] = byte;
				}
			});
			return { iv: iv, data: data };
		},

		encrypt : function(contents, uuidKey)
		{
			return this.generateKeyForUUID(uuidKey)
				.then((key) => {

					let initializationVector = new Uint8Array(this.ivLen);

					crypto.getRandomValues(initializationVector);

					let data = this.convertStringToArrayBuffer(contents);

					return crypto.subtle.encrypt(
						{ name: 'AES-CBC', iv: initializationVector }
						, key
						, data
					).then((encrypted) => {

						let encryptedData = new Uint8Array(encrypted);
						let ciphered = this.joinIvAndData(initializationVector, encryptedData)

						return this.bufferToBase64(ciphered);
					});
			});
		},

		decrypt: function(encrypted, uuidKey)
		{
			let buffer = this.base64ToBuffer(encrypted);
			var parts = this.separateIvFromData(buffer);

			return this.generateKeyForUUID(uuidKey)
				.then((key) => {

					return crypto.subtle.decrypt(
						{ name: 'AES-CBC', iv: parts.iv }
						, key
						, parts.data
						).then((decrypted) => {

						let buffer = new Uint8Array(decrypted);
						let base64 = this.bufferToBase64(buffer);

						let string = atob(base64);

						return string;

					}, function(error)
					{
						console.log(error);
					});
				});
		}
	}

	let Inspector = {

		inspectorElement : null,
		inspectorButton: null,
		hovering : false,
		tabElements : null,
		activeTabElement : null,
		graphSettings : '',
		nodeSettings : '',

		initialize : function(inspectorElement, inspectorButton)
		{
			this.inspectorElement = inspectorElement;
			this.inspectorButton = inspectorButton;

			this.tabElements = this.inspectorElement.querySelectorAll('nav li');
			this.activeTabElement = this.inspectorElement.querySelector('nav .active');

			this.tabElements.forEach((element) => { 
				element.addEventListener('click', () => {
					this.switchTab(element);
				});
			});

			this.inspectorElement.addEventListener('mouseenter', () => {
				this.hovering = true;
			});

			this.inspectorElement.addEventListener('mouseleave', () => {
				this.hovering = false;
			});
			this.inspectorButton.addEventListener('click', (e) => {

				e.preventDefault();

				if(this.inspectorButton.disabled)
					return;

				this.toggle();
			});

			this.isEmbedded = (document.body.className == 'page-embed');

			if(!this.isEmbedded)
				PannerDragger.enableTranslate(this.inspectorElement,
											  this.inspectorElement.querySelector('h5'));

			return this;
		},

		switchTab : function(tabElement)
		{
			if (tabElement != this.activeTabElement)
			{
				this.activeTabElement.className = '';
				tabElement.className = 'active';

				this.activeTabElement = tabElement;
			}

			if (this.activeTabElement.dataset.type == 'node')
				this.inspectorElement.querySelector('.body').innerHTML = this.nodeSettings;
			else
				this.inspectorElement.querySelector('.body').innerHTML = this.graphSettings;
		},

		toggleNav : function(show)
		{
			this.inspectorElement.querySelector('nav').style.display = (show ? 'block' : 'none');
		},

		setInnerHTML : function(innerHTML, isGraphSettings = false)
		{
			if (isGraphSettings)
				this.graphSettings = innerHTML;
			else
				this.nodeSettings = innerHTML;

			this.switchTab(this.inspectorElement.querySelector(isGraphSettings ? 'nav li[data-type="graph"]' : 'nav li[data-type="node"]'));
		},

		reset : function()
		{
			this.inspectorButton.setAttribute('disabled', true);

			this.hovering = false;
			this.inspectorElement.querySelector('.body').innerHTML = '';

			this.hide();
		},

		hide : function()
		{
			this.hovering = false;
			this.inspectorButton.dataset['opened'] = '0';
			this.inspectorElement.className = 'close';
			this.inspectorElement.style.transform = 'translate3d(0, 0, 0)';
		},

		show : function()
		{
			this.inspectorButton.dataset['opened'] = '1';
			this.inspectorElement.className = 'open';
		},


		toggle : function()
		{
			if(this.inspectorElement.className == 'open')
				this.hide();
			else
				this.show();
		}
	}

	let Blackboard = {

		blackboardElement : null,
		blackboardButton : null,
		hovering : false,

		initialize : function(blackboardElement, blackboardButton)
		{
			this.blackboardElement = blackboardElement;
			this.blackboardButton = blackboardButton;

			this.blackboardElement.addEventListener('mouseenter', () => {
				this.hovering = true;
			});

			this.blackboardElement.addEventListener('mouseleave', () => {
				this.hovering = false;
			});
			this.blackboardButton.addEventListener('click', (e) => {

				e.preventDefault();

				if(this.blackboardButton.disabled)
					return;

				this.toggle();
			});

			this.isEmbedded = (document.body.className == 'page-embed');

			if(!this.isEmbedded)
				PannerDragger.enableTranslate(this.blackboardElement,
											  this.blackboardElement.querySelector('h5'));

			return this;
		},

		reset : function()
		{
			this.blackboardButton.setAttribute('disabled', true);

			this.hovering = false;
			this.blackboardElement.querySelector('h5').innerHTML = '';
			this.blackboardElement.querySelector('ul').innerHTML = '';
			this.blackboardElement.querySelector('h6').style.display = 'block';

			this.hide();
		},

		hide : function()
		{
			this.hovering = false;
			this.blackboardButton.dataset['opened'] = '0';
			this.blackboardElement.style.display = 'none';
			this.blackboardElement.style.transform = 'translate3d(0, 0, 0)';
		},

		show : function()
		{
			this.blackboardButton.dataset['opened'] = '1';
			this.blackboardElement.style.display = 'block';

			document.getElementById('library').className = '';
			document.getElementById('library-container').className ='close';
		},


		toggle : function()
		{
			let existingDisplay = this.blackboardElement.style.display;

			if(existingDisplay == 'block')
				this.hide();
			else
				this.show();
		}
	}

	let PannerDragger = {

		pageFocused: true,
		isExtension: false,
		containerElement : null,
		blackboard: null,
		draggedNode : null,
		inspector: null,
		zoomElement : null,

		scaleFactor : 1.0,
		scaleStep : 0.1,
		minScaleFactor : 0.3,
		maxScaleFactor : 5.0,
		startScrollPosition : null,
		mouseDown : false,

		translateX : 0,
		translateY : 0,
		lastTranslateX : 0,
		lastTranslateY : 0,

		mouseX : 0,
		mouseY : 0,
		originX : 0,
		originY : 0,
		translateOriginX: 0,
		translateOriginY: 0,

		shaderLoaded: false,
		isEmbedded : false,
		isHoveringHeader : false,
		isPresenting: false,

		initialize : function(containerElement, zoomElement, blackboard, inspector)
		{
			this.blackboard = blackboard;
			this.inspector = inspector;
			this.zoomElement = zoomElement;
			this.containerElement = containerElement;
			this.isEmbedded = (document.body.className == 'page-embed');

			document.body.dataset['panning'] = 0;
			document.body.dataset['dragging'] = 0;

			window.addEventListener('focus', () => {
				this.pageFocused = true;
			});
			window.addEventListener('blur', () => {
				this.pageFocused = false;
			});

			let header = document.querySelector('body > header');

			header.addEventListener('mouseenter', (event) => {
				this.isHoveringHeader = true;
			});
			header.addEventListener('mouseleave', (event) => {
				this.isHoveringHeader = false;
			});

			document.addEventListener('mousedown', (event) => {
				this.panStarted(event);
			});

			document.addEventListener('mousemove', (event) => {
				this.panChanged(event);
			});

			document.addEventListener('mouseup', (event) => {
				this.panEnded(event);
			});

			window.addEventListener('wheel', (event) => {
				let resized = this.resize(event.deltaY, event.clientX, event.clientY);

				if(resized)
					event.preventDefault();
			});

			document.addEventListener('mousemove', this.onDragChanged.bind(this));
			document.addEventListener('mouseup', this.onDragEnded.bind(this));

			return this;
		},

		enableTranslate : function(element, anchorElement = null, useScaleFactor = false) {
			if (anchorElement == null)
				anchorElement = element;

			anchorElement.onmousedown = function(event) {
				if (event.button != 0)
					return;
				element.setAttribute('data-dragging', true);
				document.body.dataset['dragging'] = 1;
				return false;
			}
			anchorElement.onmouseenter = function(event) {
				element.dataset['hovering'] = true;
				document.body.dataset['hovering'] = 1;
			}
			anchorElement.onmouseleave = function(event) {
				element.dataset['hovering'] = false;
				document.body.dataset['hovering'] = 0;
			}

			let mouseUpFunc = (event) => {
				if (element.parentNode == null)
				{
					document.removeEventListener('mouseup', mouseUpFunc);
					return;
				}

				if(element.dataset['dragging'] != "true")
					return;
				element.setAttribute('data-dragging', false);
				document.body.dataset['panning'] = 0;
			};

			document.addEventListener('mouseup', mouseUpFunc);

			let mouseMovFunc = (event) => {
				if (element.parentNode == null)
				{
					document.removeEventListener('mousemove', mouseMovFunc);
					return;
				}

				if(element.dataset['dragging'] != "true")
					return;

				let matrix = this.getMatrix(element);

				let scaleFactor = (useScaleFactor ? this.scaleFactor : 1.0);

				let newX = matrix.x + (event.movementX / scaleFactor);
				let newY = matrix.y + (event.movementY / scaleFactor);

				element.style.transform = 'translate3d(' + newX +'px,' + newY + 'px, 0)';
			};

			document.addEventListener('mousemove',mouseMovFunc);
		},

		getMatrix : function(element) {
			const values = element.style.transform.split(/\w+\(|\);?/);

			if (values.length == 1) {
				return {
					x: 0,
					y: 0,
					z: 0
				};
			}

			const transform = values[1].split(/,\s?/g).map(numStr => parseInt(numStr));

			return {
				x: transform[0],
				y: transform[1],
				z: transform[2]
			};
		},

		isPanGestureValid : function(event)
		{
			// For embedded graphs, we only accept left mouse click
			if(this.isEmbedded)
			{
				if(event.which == 2)
				{
					// Don't allow any scrolling via the middle click
					// for embedded graphs.
					event.preventDefault();
				}

				return event.which == 1;
			}

			// For not embedded graphs, either left or middle clicks
			// will do.
			return event.which == 1 || event.which == 2;
		},

		panStarted : function(event)
		{
			if(!this.shaderLoaded)
				return;

			if(this.draggedNode != null)
				return;

			if (document.body.dataset.dragging == 1)
				return;
			
			if(!this.isPanGestureValid(event))
				return;

			if(this.blackboard.hovering
				|| this.inspector.hovering
				|| this.isHoveringHeader
				|| this.isPresenting)
				return;

			this.mouseDown = true;

			document.body.dataset['panning'] = 1;

			this.startScrollPosition = {
				x: event.screenX,
				y: event.screenY
			};

			event.preventDefault();
		},

		panChanged : function(event)
		{
			if(this.draggedNode != null)
				return;

			if(!this.isPanGestureValid(event))
				return;

			if(this.startScrollPosition == null)
				return;

			if(!this.mouseDown)
				return;

			this.translateX = this.lastTranslateX - (this.startScrollPosition.x - event.screenX) / this.scaleFactor;
			this.translateY = this.lastTranslateY - (this.startScrollPosition.y - event.screenY) / this.scaleFactor;

			this.updateTransform();
		},

		panEnded : function(event)
		{
			if(this.draggedNode != null)
				return;

			this.mouseDown = false;
			this.lastTranslateX = this.translateX;
			this.lastTranslateY = this.translateY;

			document.body.dataset['panning'] = 0;
		},

		resize : function(delta, x, y)
		{
			if(!this.isExtension && !this.pageFocused)
				return false;

			if(this.blackboard.hovering
				|| this.inspector.hovering
				|| this.isHoveringHeader
				|| this.isPresenting) {
				console.log('<- is hovering: ',this.blackboard.hovering,this.inspector.hovering,this.isHoveringHeader,this.isPresenting);
				return false;
			}

			if(!this.shaderLoaded)
				return false;

			let oldScale = this.scaleFactor;
			let zoom = Math.exp((delta < 0 ? 1 : -1) * this.scaleStep)
			this.scaleFactor = this.scaleFactor * zoom;

			if(this.scaleFactor < this.minScaleFactor)
				this.scaleFactor = this.minScaleFactor;
			else if(this.scaleFactor > this.maxScaleFactor)
				this.scaleFactor = this.maxScaleFactor;

			let oldMouseX = this.mouseX;
			let oldMouseY = this.mouseY;

			this.mouseX = (x - this.containerElement.offsetLeft);
			this.mouseY = (y - this.containerElement.offsetTop);

			this.originX += ((this.mouseX - oldMouseX) / oldScale);
			this.originY += ((this.mouseY - oldMouseY) / oldScale);

			this.translateOriginX = (this.mouseX - this.originX) / this.scaleFactor;
			this.translateOriginY = (this.mouseY - this.originY) / this.scaleFactor;

			this.zoomElement.style.display = 'block';
			this.zoomElement.innerHTML = 'Zoom: ' + (parseFloat(this.scaleFactor).toFixed(1)) + 'x';

			this.updateTransform();

			return true;
		},

		reset : function()
		{
			this.zoomElement.style.display = 'none';
			this.scaleFactor = 1.0;
			this.translateX = 0.0;
			this.translateY = 0.0;
			this.translateOriginX = 0;
			this.translateOriginY = 0;
			this.mouseX = 0.0;
			this.mouseY = 0.0;
			this.originX = 0.0;
			this.originY = 0.0;
			this.startScrollPosition = null;
		},

		panTo : function(x, y)
		{
			this.reset();

			this.translateX = x;
			this.translateY = y;
			this.lastTranslateX = this.translateX;
			this.lastTranslateY = this.translateY;

			this.updateTransform();
		},

		updateTransform : function()
		{
			let scale = 'scale3d('+this.scaleFactor+','+this.scaleFactor+','+this.scaleFactor+')';
			let translateOrigin = 'translate3d(' + (this.translateOriginX) + 'px,' + (this.translateOriginY) + 'px, 0)';
			let translate = 'translate3d(' + (this.translateX) + 'px,' + (this.translateY) + 'px, 0)';

			this.containerElement.style.transformOrigin = this.originX + 'px ' + this.originY + 'px';
			this.containerElement.style.transform = scale + ' ' +translateOrigin + ' ' + translate;
		},

		onDragChanged : function(event)
		{
			if(event.target != this.containerElement)
				return;

			if(this.draggedNode == null)
				return;

			let invScaleFactor = 1.0 / this.scaleFactor;

			let currentX = parseInt(this.draggedNode.style.left);
			let currentY = parseInt(this.draggedNode.style.top);
			let currentWidth = this.draggedNode.offsetWidth;
			let currentHeight= this.draggedNode.offsetHeight;

			let movementX = event.movementX * invScaleFactor;
			let movementY = event.movementY * invScaleFactor;

			let finalX = currentX + movementX;
			let finalY = currentY + movementY;

			let containerWidth = parseInt(this.containerElement.style.width);
			let containerHeight = parseInt(this.containerElement.style.height);

			if(finalX < 0
				|| finalY < 0
				|| finalX + currentWidth >= containerWidth
				|| finalY + currentHeight >= containerHeight)
				return;

			this.draggedNode.style.left = finalX + 'px';
			this.draggedNode.style.top = finalY + 'px';

			ShaderGraphExtractor.recalculateElements(this.draggedNode,
				movementX,
				movementY);
		},

		onDragStarted : function(event, draggedNode)
		{
			if(event.target.className == 'chevron' || event.target.className == 'settings')
				return;

			if(event.buttons != 1)
				return;

			this.draggedNode = draggedNode;
			this.draggedNode.setAttribute('data-dragging', true);

			document.body.dataset['dragging'] = 1;
			return false;
		},

		onDragEnded : function(event)
		{
			if(this.draggedNode != null)
			{
				this.draggedNode.setAttribute('data-dragging', false);
			}

			this.draggedNode = null;
			document.body.dataset['dragging'] = 0;
			return false;
		}
	}

	let OverlaidForm = {

		button: undefined,
		element : undefined,
		opened : false,
		closeCallback : undefined,

		initialize : function(button, element, closeCallback)
		{
			if(element == undefined || button == undefined)
				return this;

			this.element = element;
			this.button = button;
			this.closeCallback = closeCallback;
			this.element.querySelector('h5 em').addEventListener('click', this.close.bind(this));

			return this;
		},

		setInnerHTML : function(innerHTML)
		{
			this.inspectorElement.querySelector('.body').innerHTML = innerHTML;
		},

		reset : function()
		{
			this.close();
		},

		close : function()
		{
			if(this.element == undefined)
				return;

			this.opened = false;
			this.element.style.display = 'none';

			this.closeCallback();
		},

		open : function()
		{
			if(this.element == undefined)
				return;

			this.opened = true;
			this.element.style.display = 'block';
		}
	}

	let FileLoader = {

		fileButton : null,
		fileInputElement : null,
		pannerDragger : null,
		containerElement : null,
		blackboard : null,
		inspector : null,
		isSubgraph : false,
		cryptoSuite : null,
		shaderGraphText : null,
		shaderGraphFilename : null,
		embedder : null,

		leftMostPoint : { x: 0, y: 0},

		initialize : function(
							fileButton,
							fileInputElement,
							containerElement,
							blackboard,
							pannerDragger,
							inspector,
							cryptoSuite,
							embedder)
		{
			this.cryptoSuite = cryptoSuite;
			this.blackboard = blackboard;
			this.containerElement = containerElement;
			this.pannerDragger = pannerDragger;
			this.fileButton = fileButton;
			this.fileInputElement = fileInputElement;
			this.inspector = inspector;
			this.embedder = embedder;

			document.addEventListener('keydown', (event) => {

				if(event.keyCode == 27)
				{
					this.hideLibrary();
					this.hideSubmission();
					this.hidePreview();
					this.embedder.close();
					this.inspector.hide();
				}
			});

			if(document.querySelector('button[data-openlibrary') != undefined)
			{
				document.querySelector('button[data-openlibrary').addEventListener('click', this.showLibrary.bind(this));
			}

			if(document.getElementById('library') != undefined)
			{
				document.getElementById('library').addEventListener('click', (event) => {
					let className = document.getElementById('library-container').className;

					this.hideSubmission();
					this.hidePreview();
					this.blackboard.hide();
					this.embedder.close();
					this.inspector.hide();

					if(className == 'open')
						this.hideLibrary();
					else
						this.showLibrary();
				});
			}

			if(this.embedder.element != undefined)
			{
				this.embedder.element.querySelector('button').addEventListener('click', () => {

					let embedElement = this.embedder.element.querySelector('input');

					this.copyTextFromElement(embedElement);
				});

				this.embedder.button.addEventListener('click', () => {

					document.body.dataset['presenting'] = '1';
					this.pannerDragger.isPresenting = true;

					this.hidePreview();
					this.hideLibrary();
					this.blackboard.hide();
					this.inspector.hide();

					this.embedder.element.style.display = 'block';
				});
			}

			if(document.getElementById('open-form') != undefined)
			{
				document.getElementById('open-form').addEventListener('click', (e) => {
					e.stopPropagation();
					e.preventDefault();

					this.hidePreview();
					this.hideLibrary();
					this.blackboard.hide();
					this.inspector.hide();

					document.body.dataset['presenting'] = '1';
					this.pannerDragger.isPresenting = true;

					document.getElementById('submission-form').style.display = 'block';
					return false;
				});
			}

			if(document.getElementById('close-submission') != undefined)
			{
				document.getElementById('close-submission').addEventListener('click', this.hideSubmission.bind(this));
			}

			if(document.getElementById('download') != undefined)
			{
				document.getElementById('download').addEventListener('click', () => {
					window.location = shaderGraphfilePath;
				});
			}

			if(document.getElementById('preview') != undefined)
			{
				let form = document.querySelector('#preview-form form');
				let formSubmit = document.querySelector('#preview-form form button[type="submit"]');

				document.getElementById('preview').addEventListener('click', () => {

					if(!this.cryptoSuite.isCryptoSupported())
					{
						alert('Sorry, your browser does not support the ability to encrypt the shadergraph! :(');
						return;
					}

					formSubmit.innerText = 'Generate preview link';
					formSubmit.removeAttribute('disabled');
					form.style.display = 'block';
					document.querySelector('#preview-link').style.display = 'none';

					this.hideSubmission();
					this.hideLibrary();
					this.blackboard.hide();
					this.inspector.hide();

					document.body.dataset['presenting'] = '1';
					this.pannerDragger.isPresenting = true;

					document.getElementById('preview-form').style.display = 'block';
				});

				form.addEventListener('submit', (event) => {

					event.preventDefault();

					formSubmit.innerText = 'Loading...';
					formSubmit.setAttribute('disabled', true);

					this.generatePreviewURL(
						this.shaderGraphFilename,
						this.shaderGraphText,
						(previewURL) => {

						if(previewURL == null)
						{
							formSubmit.innerText = 'Generate preview link';
							formSubmit.removeAttribute('disabled');
							return;
						}

						form.style.display = 'none';

						document.querySelector('#preview-link').style.display = 'block';
						document.querySelector('#preview-link').setAttribute('href', previewURL);
						document.querySelector('#preview-link').innerText = previewURL;
					});
				});
			}

			if(document.getElementById('close-preview') != undefined)
			{
				document.getElementById('close-preview').addEventListener('click', this.hidePreview.bind(this));
			}

			document.getElementById('reset').addEventListener('click', (e) => {
				e.preventDefault();

				this.hideLibrary();
				this.panToOrigin();
			});

			document.getElementById('fullscreen').addEventListener('click', (e) => {
				e.preventDefault();
				this.toggleFullScreen();
			});

			document.body.ondragenter = (e) => {
				e.preventDefault();
				e.stopPropagation();
			};

			document.body.ondragleave = (e) => {
				e.preventDefault();
				e.stopPropagation();
			};

			document.body.ondragover = (e) => {
				e.preventDefault();
				e.stopPropagation();
			};

			document.body.ondrop = (e) => {
				e.preventDefault();
				e.stopPropagation();

				if (document.body.className == 'page-libraryitem')
					return;

				let files = e.dataTransfer.files;

				if (files.length == 0)
					return;

				let file = e.dataTransfer.files[0];

				this.loadFile(file);
			}

			window.addEventListener("message", event => {
				if (event.origin != "https://github.com"
					&& event.origin != "https://gist.github.com") {
					return;
				}
				if (event.data.length == 2) {
					let shaderGraphBlob = event.data[0];
					let filename = event.data[1];

					shaderGraphBlob.text().then((text) => {
						let binString = atob(text);
						let bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
						let rawResult = new TextDecoder().decode(bytes);

						this.fileButton.style.display = 'none';
						document.body.dataset.extension = 1;
						this.isExtension = true;

						this.inspector.reset();
						this.pannerDragger.shaderLoaded = false;
						this.pannerDragger.reset();
						this.blackboard.reset();

						this.loadShaderGraph(filename, rawResult, false, false);

						this.blackboard.hide();
						this.inspector.hide();
						window.parent.postMessage("loaded", "*");
					});
				}
			}, false);

			this.reset();
			this.blackboard.reset();
			this.inspector.reset();
			this.pannerDragger.reset();

			if(typeof storedShaderGraphName != 'undefined'
				&& typeof storedShaderGraphBody != 'undefined')
			{
				this.loadShaderGraph(storedShaderGraphName, storedShaderGraphBody, false, false);
			}

			if(this.fileButton != undefined)
			{
				this.fileButton.addEventListener('click', () => {
					this.fileInputElement.click();
				});
			}

			if(this.fileInputElement != undefined)
			{
				if(this.fileInputElement.files.length > 0)
					this.loadFile(this.fileInputElement.files[0]);

				this.fileInputElement.addEventListener('change', (event) => {

					if(event.target.files.length > 0)
						this.loadFile(event.target.files[0]);
				}, false);
			}

			this.parsePreviewHash();

			return this;
		},

		hidePreview : function()
		{
			if(document.getElementById('preview-form') == undefined)
				return;

			document.body.dataset['presenting'] = '0';
			this.pannerDragger.isPresenting = false;

			document.getElementById('preview-form').style.display = 'none';
		},

		showLibrary : function()
		{
			if(document.getElementById('library') != undefined)
				document.getElementById('library').className = 'open';

			if(document.getElementById('library-container') != undefined)
				document.getElementById('library-container').className = 'open';
		},

		hideLibrary : function()
		{
			if(document.getElementById('library') != undefined)
				document.getElementById('library').className = '';

			if(document.getElementById('library-container') != undefined)
				document.getElementById('library-container').className ='close';
		},

		hideSubmission : function()
		{
			if(document.getElementById('submission-form') == undefined)
				return;

			document.body.dataset['presenting'] = '0';
			this.pannerDragger.isPresenting = false;

			document.getElementById('submission-form').style.display = 'none';
		},

		parsePreviewHash : function()
		{
			let hash = location.hash;

			if(hash.indexOf('#preview|') != 0)
				return;

			let hashComponents = hash.split('|');

			let previewID = hashComponents[1];
			let uuidKey = hashComponents[2];

			this.extractShaderGraphFromPreviewURL(previewID, uuidKey);
		},

		reset : function()
		{
			this.isSubgraph = false;
			this.shaderGraphText = null;
			this.shaderGraphFilename = null;

			document.getElementById('reset').setAttribute('disabled', true);
			document.getElementById('fullscreen').setAttribute('disabled', true);
		},

		toggleFullScreen : function()
		{
			if(document.fullscreenEnabled)
			{
				if (!document.fullscreenElement)
					document.body.requestFullscreen();
				else
					document.exitFullscreen();
			}
			else if(document.webkitFullscreenEnabled)
			{
				if (!document.webkitFullscreenElement)
					document.body.webkitRequestFullscreen();
				else
					document.webkitExitFullscreen();
			}
		},

		loadFile : function(file)
		{
			console.log('---');

			this.inspector.reset();
			this.pannerDragger.shaderLoaded = false;
			this.pannerDragger.reset();
			this.blackboard.reset();

			console.log('Loading ' + file.name + '...');

			var reader = new FileReader();
			reader.onerror = (event) => {
				console.log('Error loading! Try again.', event);
			}
			reader.onload = (event) => {

				console.log(file.name + ' loaded! Parsing...');

				this.loadShaderGraph(file.name, event.target.result, true, true);
			}

			reader.readAsText(file);
		},

		removeFake : function() {

			if (this.fakeHandler) {

				document.body.removeEventListener('click', this.fakeHandlerCallback);
				this.fakeHandler = null;
				this.fakeHandlerCallback = null;
			}

			if (this.fakeElem) {

				document.body.removeChild(this.fakeElem);
				this.fakeElem = null;
			}
		},

		copyTextFromElement : function(element)
		{
			element.select();
			element.setSelectionRange(0, element.value.length);

			var succeeded = false;

			try {
				succeeded = document.execCommand('copy');
			}
			catch (err) {
				succeeded = false;
			}

			return succeeded;
		},

		copyTextToClipboard : function(text)
		{
			this.removeFake();

			var self = this;

			this.fakeHandlerCallback = function() { self.removeFake(); };

			this.fakeHandler = document.body.addEventListener('click', this.fakeHandlerCallback) || true;

			this.fakeElem = document.createElement('textarea');
			this.fakeElem.style.fontSize = '12pt';
			this.fakeElem.style.border = '0';
			this.fakeElem.style.padding = '0';
			this.fakeElem.style.margin = '0';
			this.fakeElem.style.position = 'absolute';
			this.fakeElem.style[ document.documentElement.getAttribute('dir') == 'rtl' ? 'right' : 'left' ] = '-9999px';
			this.fakeElem.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
			this.fakeElem.setAttribute('readonly', '');
			this.fakeElem.value = text;

			document.body.appendChild(this.fakeElem);

			return this.copyTextFromElement(this.fakeElem);
		},

		loadNewShaderGraph : function(shaderGraphText)
		{
			let jsonComponents = shaderGraphText.replace(/[\n\r]/g, '').split(/}{/);
			var jsonElements = [];

			for (var i = 0; i < jsonComponents.length; i++) {

				var finalJsonString = '';

				if (i == 0)
					finalJsonString = jsonComponents[i] + '}';
				else if (i == jsonComponents.length - 1)
					finalJsonString = '{' + jsonComponents[i];
				else
					finalJsonString = '{' + jsonComponents[i] + '}';

				var serializedGraph;

				try {
					serializedGraph = JSON.parse(finalJsonString);
				}
				catch(e) {
					throw new Error("This is not a valid new ShaderGraph");
					return;
				}

				jsonElements.push(serializedGraph);
			}

			return jsonElements;
		},

		loadShaderGraph : function(fileName, shaderGraphText, showPreview, showLibrary)
		{
			var isNewGraph = false;
			var attemptLoadNew = false;
			try {
				serializedGraph = JSON.parse(shaderGraphText);
			}
			catch(e) { 
				attemptLoadNew = true;
			}

			if (attemptLoadNew)
			{
				isNewGraph = true;
				try {
					serializedGraph = this.loadNewShaderGraph(shaderGraphText);
				}
				catch(e) {
					alert('Error: ' + e);
					return;
				}
			}

			this.shaderGraphFilename = fileName;
			this.shaderGraphText = shaderGraphText;

			this.pannerDragger.shaderLoaded = true;

			if(document.getElementById('readme') != undefined)
				document.getElementById('readme').style.display = 'none';

			if(document.getElementById('download') != undefined)
				document.getElementById('download').style.display = 'flex';

			this.inspector.inspectorButton.removeAttribute('disabled');
			this.blackboard.blackboardButton.removeAttribute('disabled');
			document.getElementById('reset').removeAttribute('disabled');

			if(document.fullscreenEnabled === true || document.webkitFullscreenEnabled === true)
				document.getElementById('fullscreen').removeAttribute('disabled');

			let name = fileName.split('.')[0];

			this.isSubgraph = fileName.split('.')[1] == 'shadersubgraph';

			if(showLibrary && document.getElementById('open-form') != undefined)
			{
				[...document.querySelectorAll('#submission-form form input')].forEach((element) => {

					if(element.name != 'full-name' && element.name != 'form-name')
						element.value = '';
				});

				document.getElementById('open-form').style.display = 'flex';

				document.getElementById('form-subgraph').style.display = (this.isSubgraph ? 'flex' : 'none');
				document.getElementById('shadergraph-sub').value = (this.isSubgraph ? 1 : 0);
				document.getElementById('shadergraph-body').value = shaderGraphText;
				document.getElementById('form-filename').value = name;
			}

			if(showPreview && document.getElementById('preview') != undefined)
			{
				document.getElementById('preview').style.display = 'flex';
			}

			this.leftMostPoint = ShaderGraphExtractor.initialize(
				name,
				serializedGraph,
				this.containerElement,
				this.blackboard,
				this.inspector,
				(event, draggedElement) => {
					return this.pannerDragger.onDragStarted(event, draggedElement);
				},
				isNewGraph);

			if(this.leftMostPoint == null)
			{
				alert('No nodes found!');
				return;
			}

			console.log('---');

			this.panToOrigin();
		},

		panToOrigin : function()
		{
			this.pannerDragger.panTo(window.innerWidth / 2 - this.leftMostPoint.x,
									 window.innerHeight / 2 - this.leftMostPoint.y);
		},

		extractShaderGraphFromPreviewURL(previewID, uuidKey)
		{
			let request = new XMLHttpRequest();
			let url = '/.netlify/functions/shadergraph-action';

			let payload = {
				'actions' : [
				{
					'name': 'extractPreview',
					'value': previewID
				}
				]
			};

			request.onreadystatechange = () => {

				if(request.readyState == 4 && request.status == 200)
				{
					let encrypted = request.responseText;

					this.cryptoSuite.decrypt(encrypted, uuidKey)
						.then((decrypted) => {

							let shaderGraphStruct = JSON.parse(decrypted);

							this.loadShaderGraph(shaderGraphStruct.name, shaderGraphStruct.body, false, false);
					});
				}
			}
			request.overrideMimeType("application/json");
			request.open("POST", url);
			request.send('payload=' + JSON.stringify(payload));
		},

		generatePreviewURL(fileName, shaderGraphText, callback)
		{
			let uuidKey = this.cryptoSuite.generateUUIDV4();

			let shaderGraphStruct = {
				'name' : fileName,
				'body' : shaderGraphText
			};

			let message = JSON.stringify(shaderGraphStruct);

			this.cryptoSuite.encrypt(message, uuidKey)
				.then((encrypted) => {

					let params = [
					{
						'name': 'form-name',
						'value': 'previews'
					},
					{
						'name': 'name',
						'value': 'Preview'
					},
					{
						'name': 'shadergraph',
						'value': encrypted
					}
					].map((el) => {
						return encodeURIComponent(el.name) + '=' + encodeURIComponent(el.value);
					}).join('&');

					let req = new XMLHttpRequest();
					req.onreadystatechange = function() {

						if(req.readyState != 4)
							return;

						if(req.status != 200)
						{
							alert('Error, try again.');
							callback(null);
							return;
						}

						let encryptedShort = encrypted.substring(0, 32);
						var xhr = new XMLHttpRequest();
						xhr.open('GET', '/.netlify/functions/preview?encrypted=' + encodeURIComponent(encryptedShort), true);
						xhr.onload = function() {
							if(req.status != 200)
							{
								alert('Error, try again.');
								callback(null);
								return;
							}
							let response = JSON.parse(xhr.responseText);
							let previewID = response.message;
							let previewURL = location.protocol + '//' + location.host + '/#preview|' + previewID + '|' + uuidKey;
							callback(previewURL);
						};
						xhr.onerror = function() {
							alert('Error, try again.');
							callback(null);
						};
						xhr.send();
					}
					req.open("POST", "/");
					req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
					req.send(params);
			});
		}
	}

	let ShaderGraphExtractor = {
		graphDataType : 'UnityEditor.ShaderGraph.GraphData',
		propertyNodeType : 'UnityEditor.ShaderGraph.PropertyNode',
		customFunctionNodeType : 'UnityEditor.ShaderGraph.CustomFunctionNode',
		vector3NodeType : 'UnityEditor.ShaderGraph.Vector3Node',
		randomRangeNodeType : 'UnityEditor.ShaderGraph.RandomRangeNode',
		gradientNodeType: 'UnityEditor.ShaderGraph.SampleGradient',
		blendNodeType: 'UnityEditor.ShaderGraph.BlendNode',
		addNodeType : 'UnityEditor.ShaderGraph.AddNode',
		gradientNoiseNodeType : 'UnityEditor.ShaderGraph.GradientNoiseNode',
		remapNodeType : 'UnityEditor.ShaderGraph.RemapNode',
		subtractNodeType : 'UnityEditor.ShaderGraph.SubtractNode',
		multiplyNodeType : 'UnityEditor.ShaderGraph.MultiplyNode',
		divideNodeType : 'UnityEditor.ShaderGraph.DivideNode',
		unlitMasterNodeType: 'UnityEditor.ShaderGraph.UnlitMasterNode',
		subgraphNodeType: 'UnityEditor.ShaderGraph.SubGraphNode',
		blockNodeType: 'UnityEditor.ShaderGraph.BlockNode',
		redirectNodeType: 'UnityEditor.ShaderGraph.RedirectNodeData',
		shaderKeyword: 'UnityEditor.ShaderGraph.ShaderKeyword',
		comparisonNodeType: 'UnityEditor.ShaderGraph.ComparisonNode',
		colorNodeType: 'UnityEditor.ShaderGraph.ColorNode',
		dropdownNodeType: 'UnityEditor.ShaderGraph.DropdownNode',
		keywordNodeType: 'UnityEditor.ShaderGraph.KeywordNode',

		vector1ShaderProperty: 'UnityEditor.ShaderGraph.Vector1ShaderProperty',
		vector1ShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.Vector1ShaderProperty',

		vector2ShaderProperty: 'UnityEditor.ShaderGraph.Vector2ShaderProperty',
		vector2ShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.Vector2ShaderProperty',

		vector3ShaderProperty: 'UnityEditor.ShaderGraph.Vector3ShaderProperty',
		vector3ShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.Vector3ShaderProperty',

		vector4ShaderProperty: 'UnityEditor.ShaderGraph.Vector4ShaderProperty',
		vector4ShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.Vector4ShaderProperty',

		colorShaderProperty: 'UnityEditor.ShaderGraph.ColorShaderProperty',
		colorShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.ColorShaderProperty',

		booleanShaderProperty: 'UnityEditor.ShaderGraph.BooleanShaderProperty',
		booleanShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.BooleanShaderProperty',

		gradientShaderProperty: 'UnityEditor.ShaderGraph.GradientShaderProperty',

		textureShaderProperty: 'UnityEditor.ShaderGraph.TextureShaderProperty',
		textureShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.Texture2DShaderProperty',

		texture2DArrayShaderProperty: 'UnityEditor.ShaderGraph.Texture2DArrayShaderProperty',
		texture2DArrayShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.Texture2DArrayShaderProperty',

		texture3DShaderProperty: 'UnityEditor.ShaderGraph.Texture3DShaderProperty',
		texture3DShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.Texture3DShaderProperty',

		cubemapShaderProperty: 'UnityEditor.ShaderGraph.CubemapShaderProperty',
		cubemapShaderPropertyInternal: 'UnityEditor.ShaderGraph.Internal.CubemapShaderProperty',

		virtualTextureShaderProperty: 'UnityEditor.ShaderGraph.VirtualTextureShaderProperty',

		matrix2ShaderProperty: 'UnityEditor.ShaderGraph.Matrix2ShaderProperty',
		matrix3ShaderProperty: 'UnityEditor.ShaderGraph.Matrix3ShaderProperty',
		matrix4ShaderProperty: 'UnityEditor.ShaderGraph.Matrix4ShaderProperty',

		samplerStateShaderProperty: 'UnityEditor.ShaderGraph.SamplerStateShaderProperty',

		shaderDropdown: 'UnityEditor.ShaderGraph.ShaderDropdown',

		tangentSlot: 'UnityEditor.ShaderGraph.TangentMaterialSlot',
		normalSlot: 'UnityEditor.ShaderGraph.NormalMaterialSlot',
		positionSlot: 'UnityEditor.ShaderGraph.PositionMaterialSlot',
		colorSlot: 'UnityEditor.ShaderGraph.ColorRGBMaterialSlot',

		materialSlotNames : {
			'UnityEditor.ShaderGraph.Vector1MaterialSlot': '1',
			'UnityEditor.ShaderGraph.Vector2MaterialSlot': '2',
			'UnityEditor.ShaderGraph.Vector3MaterialSlot': '3',
			'UnityEditor.ShaderGraph.Vector4MaterialSlot': '4',
			'UnityEditor.ShaderGraph.BooleanMaterialSlot': 'B',
			'UnityEditor.ShaderGraph.GradientMaterialSlot': 'G',
			'UnityEditor.ShaderGraph.GradientInputMaterialSlot': 'G',
			'UnityEditor.ShaderGraph.Texture2DMaterialSlot': 'T2',
			'UnityEditor.ShaderGraph.Texture2DInputMaterialSlot': 'T2',
			'UnityEditor.ShaderGraph.Texture2DArrayMaterialSlot': 'T2A',
			'UnityEditor.ShaderGraph.Texture3DMaterialSlot': 'T3',
			'UnityEditor.ShaderGraph.CubemapMaterialSlot': 'C',
			'UnityEditor.ShaderGraph.VirtualTextureMaterialSlot': 'VT',
			'UnityEditor.ShaderGraph.Matrix2MaterialSlot': '2x2',
			'UnityEditor.ShaderGraph.Matrix3MaterialSlot': '3x3',
			'UnityEditor.ShaderGraph.Matrix4MaterialSlot': '4x4',
			'UnityEditor.ShaderGraph.SamplerStateMaterialSlot': 'SS',
		},

		// NOTE: Update CSS vars as well when updating this
		materialSlotColors: {
			'UnityEditor.ShaderGraph.Vector1MaterialSlot' : 'rgb(155,226,229)',
			'UnityEditor.ShaderGraph.Vector2MaterialSlot' : 'rgb(173,237,155)',
			'UnityEditor.ShaderGraph.Vector3MaterialSlot' : 'rgb(248,255,166)',
			'UnityEditor.ShaderGraph.Vector4MaterialSlot' : 'rgb(243,205,242)',
			'UnityEditor.ShaderGraph.BooleanMaterialSlot' : 'rgb(119,107,178)',

			'UnityEditor.ShaderGraph.GradientMaterialSlot' : 'rgb(200,200,200)',
			'UnityEditor.ShaderGraph.GradientInputMaterialSlot' : 'rgb(200,200,200)',
			'UnityEditor.ShaderGraph.VirtualTextureMaterialSlot' : 'rgb(200,200,200)',
			'UnityEditor.ShaderGraph.SamplerStateMaterialSlot' : 'rgb(200,200,200)',

			'UnityEditor.ShaderGraph.Texture2DMaterialSlot' : 'rgb(229,140,137)',
			'UnityEditor.ShaderGraph.Texture2DInputMaterialSlot' : 'rgb(229,140,137)',
			'UnityEditor.ShaderGraph.Texture2DArrayMaterialSlot' : 'rgb(229,140,137)',
			'UnityEditor.ShaderGraph.Texture3DMaterialSlot' : 'rgb(229,140,137)',
			'UnityEditor.ShaderGraph.CubemapMaterialSlot' : 'rgb(229,140,137)',
	
			'UnityEditor.ShaderGraph.Matrix2MaterialSlot' : 'rgb(153,192,220)',
			'UnityEditor.ShaderGraph.Matrix3MaterialSlot' : 'rgb(153,192,220)',
			'UnityEditor.ShaderGraph.Matrix4MaterialSlot' : 'rgb(153,192,220)',
		},

		keywordStages : {
			Default : 0,
			Vertex : (1 << 0),
			Fragment : (1 << 1),
			Geometry : (1 << 2),
			Hull : (1 << 3),
			Domain : (1 << 4),
			RayTracing : (1 << 5)
		},

		debugEnableSlotDimensions: false,

		mode : {
			0: "Default",
			1: "Slider",
			2: "Integer",
			3: "Enum"
		},

		precision : {
			0 : "Inherit",
			1 : "Float",
			2 : "Half"
		},

		previewMode : {
			0 : "Inherit",
			1 : "Preview 2D",
			2 : "Preview 3D"
		},

		colorMode : {
			0: "Default",
			1: "HDR"
		},

		positionSource : {
			0: "Default",
			1: "Predisplacement"
		},

		graphPrecision : {
			0: "Single",
			1: "Graph",
			2: "Half"
		},

		litWorkflowMode : {
			0: "Metallic",
			1: "Specular"
		},

		universalWorkflowMode : {
			0: "Specular",
			1: "Metallic"
		},

		surfaceType : {
			0: "Opaque",
			1: "Transparent",
		},

		zWriteControl : {
			0: "Auto",
			1: "ForceEnabled",
			2: "ForceDisabled"
		},

		zTestMode : {
			1: "Never",
			2: "Less",
			3: "Equal",
			4: "LEqual",
			5: "Greater",
			6: "NotEqual",
			7: "GEqual",
			8: "Always",
		},

		alphaMode : {
			0: "Alpha",
			1: "Premultiply",
			2: "Additive",
			3: "Multiply",
		},

		renderFace : {
			2: "Front",
			1: "Back",
			0: "Both"
		},

		normalDropOffSpace: {
			0: "Tangent",
			1: "Object",
			2: "World"
		},

		keywordType: {
			0: "Boolean",
			1: "Enum"
		},

		edgeTable : {},
		edgeElements : {},
		slotInputs : {},
		slotOutputs : {},
		serializedProperties : {},
		groupTable : {},

		canvasSize : {
			width : 0,
			height: 0
		},
		extraHorizontalPadding: 500,
		extraVerticalPadding: 500,

		svgElement : null,
		containerElement: null,
		dragStartCallback: null,
		filename: null,
		blackboard: null,
		inspector: null,

		isEmbedded : false,

		isNewGraph : false,

		initialize : function(filename, serializedGraph, containerElement, blackboard, inspector, dragStartCallback, isNewGraph)
		{
			this.isEmbedded = (document.body.className == 'page-embed');
			this.inspector = inspector;
			this.filename = filename;
			this.blackboard = blackboard;
			this.dragStartCallback = dragStartCallback;
			this.containerElement = containerElement;
			this.isNewGraph = isNewGraph;

			this.keywordStages.FragmentAndRaytracing = (this.keywordStages.Fragment | this.keywordStages.RayTracing);
			this.keywordStages.VertexFragmentAndRaytracing = (this.keywordStages.Vertex | this.keywordStages.Fragment | this.keywordStages.RayTracing);
			this.keywordStages.All = (this.keywordStages.Vertex | this.keywordStages.Fragment | this.keywordStages.Geometry | this.keywordStages.Hull | this.keywordStages.Domain | this.keywordStages.RayTracing);

			if (isNewGraph)
				return this.parseNew(serializedGraph);
			else
				return this.parse(serializedGraph);
		},

		getPosition : function(el)
		{
			var xPos = 0;
			var yPos = 0;

			while (el != document.body) {

				if (el.tagName == "BODY") {
					// deal with browser quirks with body/window/document and page scroll
					var xScroll = el.scrollLeft || document.documentElement.scrollLeft;
					var yScroll = el.scrollTop || document.documentElement.scrollTop;

					xPos += (el.offsetLeft - xScroll + el.clientLeft);
					yPos += (el.offsetTop - yScroll + el.clientTop);
				} else {
					// for all other non-BODY elements
					xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
					yPos += (el.offsetTop - el.scrollTop + el.clientTop);
				}

				el = el.offsetParent;
			}

			return {
				x: xPos,
				y: yPos
			};
		},

		moveGroupWithGuid : function(groupGuid, movementX, movementY)
		{
			this.groupTable[groupGuid].forEach((nodeGUID) => {
				let nodeElement = document.getElementById(nodeGUID);
				let currentX = parseInt(nodeElement.style.left);
				let currentY = parseInt(nodeElement.style.top);

				nodeElement.style.left = (currentX + movementX) + 'px';
				nodeElement.style.top = (currentY + movementY) + 'px';

				if(this.edgeElements[nodeGUID] != undefined)
				{
					this.edgeElements[nodeGUID].forEach((serializedEdge) => {
						this.updateOrCreateEdge(serializedEdge);
					});
				}
			});

			if (groupGuid == 'fragment-context' || groupGuid == 'vertex-context')
				this.updateEdge(this.contextEdge[0], 
								undefined, 
								this.contextEdge[1], 
								this.contextEdge[2], 
								undefined, 
								this.contextEdge[3],
								true);
		},

		moveStickyWithGuid : function(guid)
		{
			let groupGuid = document.getElementById(guid).dataset['groupguid'];

			if(groupGuid == undefined)
				return;

			if(groupGuid.length == 0)
				return;

			let group = document.getElementById(groupGuid);

			if(group == undefined)
				return;

			this.resizeGroup(group);
		},

		moveNodeWithGuid : function(guid)
		{
			if (this.edgeElements[guid] == undefined)
				return;

			this.edgeElements[guid].forEach((serializedEdge) => {
				this.updateOrCreateEdge(serializedEdge);
			});

			let groupGuid = document.getElementById(guid).dataset['groupguid'];

			if(groupGuid == undefined)
				return;

			if(groupGuid.length == 0)
				return;

			let group = document.getElementById(groupGuid);

			if(group == undefined)
				return;

			this.resizeGroup(group);
		},

		recalculateElements : function(draggedNode, movementX, movementY)
		{
			let guid = draggedNode.id;

			if(draggedNode.className == 'group')
				this.moveGroupWithGuid(guid, movementX, movementY);
			else if(draggedNode.className == 'sticky')
				this.moveStickyWithGuid(guid);
			else
				this.moveNodeWithGuid(guid);
		},

		disableChevronIfNeededForNode : function(nodeElement)
		{
			if (nodeElement == undefined)
				return;

			if([...nodeElement.querySelectorAll('.slot-container li.filled')].length != [...nodeElement.querySelectorAll('.slot-container li')].length)
				return;

			let chevron = nodeElement.querySelector('.chevron');

			if(chevron == undefined)
				return;

			chevron.dataset['disabled'] = '1';
		},

		updateOrCreateEdge : function(serializedEdge)
		{
			let inputSlot = serializedEdge['m_InputSlot'];
			let inputGuid = (this.isNewGraph ? inputSlot['m_Node']['m_Id'] : inputSlot['m_NodeGUIDSerialized']);
			let inputSlotId = inputSlot['m_SlotId'];
			let inputElement = this.edgeTable[inputGuid]['i'][inputSlotId];

			let outputSlot = serializedEdge['m_OutputSlot'];
			let outputGuid = (this.isNewGraph ? outputSlot['m_Node']['m_Id'] : outputSlot['m_NodeGUIDSerialized']);
			let outputSlotId = outputSlot['m_SlotId'];
			let outputElement = this.edgeTable[outputGuid]['o'][outputSlotId];

			this.updateEdge(inputGuid, inputSlotId, inputElement, outputGuid, outputSlotId, outputElement);
		},

		updateEdge : function(inputGuid, inputSlotId, inputElement, outputGuid, outputSlotId, outputElement, isContextEdge = false)
		{
			if(inputElement == null
				|| outputElement == null)
				return;

			inputElement.className = 'filled';

			if (!isContextEdge)
				inputElement.parentNode.className = 'filled';

			outputElement.className = 'filled';

			if (!isContextEdge)
				outputElement.parentNode.className = 'filled';

			let outputSlotName = outputElement.dataset.slotname;
			let outputSlotColor = this.materialSlotColors[outputSlotName];
			let inputNodeElement = document.getElementById(inputGuid);
			let outputNodeElement = document.getElementById(outputGuid);

			this.disableChevronIfNeededForNode(inputNodeElement);
			this.disableChevronIfNeededForNode(outputNodeElement);

			// Convert actual port centers from viewport to SVG coordinates. The
			// original fixed offsets depended on body padding and port dimensions.
			// This also handles graph zoom/pan and context ports without exceptions.
			const inverseMatrix = this.svgElement.getScreenCTM().inverse();
			const portPosition = (element) => {
				const bounds = element.getBoundingClientRect();
				const point = this.svgElement.createSVGPoint();
				point.x = bounds.left + bounds.width / 2;
				point.y = bounds.top + bounds.height / 2;
				return point.matrixTransform(inverseMatrix);
			};
			var positionIn = portPosition(inputElement);
			var positionOut = portPosition(outputElement);
			
			let width = Math.abs(positionIn.x - positionOut.x);
			let height= Math.abs(positionIn.y - positionOut.y);

			let threshold = 50;

			let isBXFirst = positionOut.x < positionIn.x;

			let svgX1 = (isBXFirst ? positionOut.x : positionIn.x);
			let svgY1 = (isBXFirst ? positionOut.y : positionIn.y);
			let svgX2 = (!isBXFirst ? positionOut.x : positionIn.x);
			let svgY2 = (!isBXFirst ? positionOut.y : positionIn.y);

			let centerY = (positionIn.y < positionOut.y ? positionIn.y + (positionOut.y - positionIn.y)/2 : positionOut.y + (positionIn.y - positionOut.y)/2);

			var edgeIdElements = [ inputGuid, outputGuid ];

			if (inputSlotId != undefined)
				edgeIdElements.push(inputSlotId);

			if (outputSlotId != undefined)
				edgeIdElements.push(outputSlotId);
			
			let edgeId = edgeIdElements.join('|');
			var groupElement = this.svgElement.getElementById(edgeId);

			if(groupElement == undefined)
			{
				groupElement = document.createElementNS("http://www.w3.org/2000/svg", "g");
				groupElement.setAttribute('id', edgeId);
				this.svgElement.appendChild(groupElement);
			}

			let strokeWidth = 4;
			let lineWidth = (isBXFirst ? 1 : -1) * (isContextEdge ? 10.0 : 30.0);

			let vectorColors = {
				'-1': 'rgb(193,193,193)',
				'1': 'rgb(122,223,226)',
				'2': 'rgb(144,236,138)',
				'3': 'rgb(244,255,149)',
				'4': 'rgb(250,197,241)'
			};

			let otherColor = 'rgb(244,125,125)';

			var inputColor = undefined;
			var outputColor = undefined;

			if (outputSlotColor != undefined)
			{
				inputColor = outputSlotColor;
				outputColor = outputSlotColor;
			}
			else if(isContextEdge)
			{
				inputColor = 'rgb(255,255,255)';
				outputColor = 'rgb(255,255,255)';
			}
			else if(this.debugEnableSlotDimensions)
			{
				inputColor = otherColor;
				outputColor = otherColor;

				if(inputElement.parentNode.dataset['value'] != undefined
					&& outputElement.parentNode.dataset['value'] != undefined)
				{
					let inputValue = inputElement.parentNode.dataset['value'];
					let outputValue = outputElement.parentNode.dataset['value'];

					if(vectorColors[inputValue] != undefined)
						inputColor = vectorColors[inputValue];
					else
						console.log(inputValue, inputElement);

					if(vectorColors[outputValue] != undefined)
						outputColor = vectorColors[outputValue];
					else
						console.log(outputValue, outputElement);
				}
			}
			else
			{
				inputColor = vectorColors[1];
				outputColor = vectorColors[1];
			}

			let gradient = this.svgGradient(outputColor, inputColor);

			if(this.svgElement.querySelector('defs #' + gradient.id) == undefined)
				this.svgElement.querySelector('defs').appendChild(gradient);

			if(svgY2 - svgY1 == 0)
				svgY2 += 0.1;

			if(svgX2 - svgX1 == 0)
				svgX2 += 0.1;

			if (isContextEdge)
			{
				if(width == 0 || height == Math.abs(lineWidth) * 2.0)
				{
					groupElement.innerHTML = '<path fill="transparent" stroke-linejoin="round" stroke-linecap="round" fill="transparent" d="M' + svgX1 +' ' + svgY1 + ' L' + svgX2 + ' ' + svgY2 + '" stroke="url(#' + gradient.id + ')" stroke-width="' + strokeWidth + '"/>';
				}
				else
				{
					groupElement.innerHTML = '<path fill="transparent" stroke-linejoin="round" stroke-linecap="round" d="M' + svgX1 +' ' + svgY1 + ' L' + svgX1 + ' ' + (svgY1 + lineWidth) + ' L' + svgX2 + ' ' + (svgY2 - lineWidth) + ' L' + svgX2 + ' ' + svgY2 + '" stroke="' + outputColor + '" stroke-width="' + strokeWidth + '" />';
				}
			}
			else
			{
				if(height == 0 || width == Math.abs(lineWidth) * 2.0)
				{
					groupElement.innerHTML = '<path fill="transparent" stroke-linejoin="round" stroke-linecap="round" fill="transparent" d="M' + svgX1 +' ' + svgY1 + ' L' + svgX2 + ' ' + svgY2 + '" stroke="url(#' + gradient.id + ')" stroke-width="' + strokeWidth + '"/>';
				}
				else
				{
					groupElement.innerHTML = '<path fill="transparent" stroke-linejoin="round" stroke-linecap="round" d="M' + svgX1 +' ' + svgY1 + ' L' + (svgX1 + lineWidth) + ' ' + svgY1 + ' L' + (svgX2 - lineWidth) + ' ' + svgY2 + ' L' + svgX2 + ' ' + svgY2 + '" stroke="url(#' + gradient.id + ')" stroke-width="' + strokeWidth + '" />';
				}
			}
		},

		svgGradient : function(fromColor, toColor)
		{
			let element = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
			element.id = 'gradient-' + fromColor.replace(/\(|\)|\,/g, "") + '-' + toColor.replace(/\(|\)|\,/g, "");
			element.setAttribute('x1', '0%');
			element.setAttribute('y1', '0%');
			element.setAttribute('x2', '100%');
			element.setAttribute('y2', '0%');
			element.innerHTML = '<stop offset="0%" style="stop-color:' + fromColor + ';" /><stop offset="100%" style="stop-color:' + toColor + ';" />';

			return element;
		},

		calculateEdges : function(edges)
		{
			this.svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			this.svgElement.setAttribute('version', '1.1');
			this.svgElement.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
			this.containerElement.appendChild(this.svgElement);

			this.svgElement.setAttribute('width', this.canvasSize.width);
			this.svgElement.setAttribute('height', this.canvasSize.height);

			this.svgElement.innerHTML = '<defs></defs>';

			if(edges == undefined || edges.length == 0)
				return;

			console.log('Calculating node slot dimensions...');

			var outputNodes = [];
			var inputNodes = [];

			edges.forEach((edge) => {
				var serializedEdge = null;
				var inputSlot = null;
				var outputSlot = null;
				var inputGuid = null;
				var outputGuid = null;

				if (this.isNewGraph)
				{
					serializedEdge = edge;
					inputSlot = serializedEdge['m_InputSlot'];
					inputGuid = inputSlot['m_Node']['m_Id'];

					outputSlot = serializedEdge['m_OutputSlot'];
					outputGuid = outputSlot['m_Node']['m_Id'];
				}
				else
				{
					let edgeData = edge['JSONnodeData'];
					serializedEdge = JSON.parse(edgeData);

					inputSlot = serializedEdge['m_InputSlot'];
					inputGuid = inputSlot['m_NodeGUIDSerialized'];

					outputSlot = serializedEdge['m_OutputSlot'];
					outputGuid = outputSlot['m_NodeGUIDSerialized'];
				}

				if(this.edgeElements[inputGuid] == undefined)
					this.edgeElements[inputGuid] = [];

				if(this.edgeElements[outputGuid] == undefined)
					this.edgeElements[outputGuid] = [];

				this.edgeElements[inputGuid].push(serializedEdge);
				this.edgeElements[outputGuid].push(serializedEdge);

				if(!outputNodes.includes(outputGuid))
					outputNodes.push(outputGuid);

				if(!inputNodes.includes(inputGuid))
					inputNodes.push(inputGuid);
			});

			// Nodes with no inputs but with filled outputs
			if (this.debugEnableSlotDimensions)
			{
				var startingNodes = [];

				outputNodes.forEach((outputGuid) => {

					if(!inputNodes.includes(outputGuid))
						startingNodes.push(outputGuid);
				});

				startingNodes.forEach((guid) => {
					this.recursivelyUpdateEdges(guid, true);
				});
			}

			console.log('Drawing edges...');

			this.drawEdges();
		},

		renderStickyNotes : function(stickyNotes)
		{
			if(stickyNotes == undefined || stickyNotes.length == 0)
				return;

			console.log('Drawing sticky notes...');

			stickyNotes.forEach((stickyNote) => {
				let stickyPosition = stickyNote['m_Position'];
				let stickyGuid = (this.isNewGraph ? stickyNote['m_ObjectId'] : stickyNote['m_GuidSerialized']);
				let groupGuid = (this.isNewGraph ? stickyNote['m_Group']['m_Id'] : stickyNote['m_GroupGuidSerialized']);

				if(this.groupTable[groupGuid] == undefined)
					this.groupTable[groupGuid] = [];

				this.groupTable[groupGuid].push(stickyGuid);

				let stickyTitle = stickyNote['m_Title'];
				let stickyContents = '<h5>' + stickyTitle + '</h5>';
				stickyContents += '<p>' + stickyNote['m_Content'] + '</p>';

				let stickyElement = document.createElement('div');
				stickyElement.className = "sticky";
				stickyElement.setAttribute('id', stickyGuid);
				stickyElement.innerHTML = stickyContents;
				stickyElement.dataset['groupguid'] = groupGuid;

				if(!this.isEmbedded)
				{
					let self = this;

					stickyElement.onmousedown = function(event) {
						self.dragStartCallback(event, this);
					}
					stickyElement.onmouseenter = function(event) {
						this.dataset['hovering'] = true;
						document.body.dataset['hovering'] = 1;
					}
					stickyElement.onmouseleave = function(event) {
						this.dataset['hovering'] = false;
						document.body.dataset['hovering'] = 0;
					}
				}

				let nodePositionX = stickyPosition.x - this.startX;
				let nodePositionY = stickyPosition.y - this.startY;

				stickyElement.style.top = nodePositionY + 'px';
				stickyElement.style.left = nodePositionX + 'px';
				stickyElement.style.width = stickyPosition.width + 'px';
				stickyElement.style.minHeight = stickyPosition.height + 'px';

				this.containerElement.appendChild(stickyElement);
			});
		},

		renderGroups : function(groups)
		{
			if (groups == undefined || groups.length == 0)
				return;

			console.log('Drawing groups...');

			groups.forEach((serializedGroup) => {
				let isContext = (serializedGroup['is_simulated'] != undefined && serializedGroup['is_simulated'] == true);

				let groupTitle = serializedGroup['m_Title'];

				let groupPosition = serializedGroup['m_Position'];
				let groupGuid = (this.isNewGraph ? serializedGroup['m_ObjectId'] : serializedGroup['m_GuidSerialized']);

				let groupElement = document.createElement('div');
				groupElement.className = 'group';
				groupElement.setAttribute('title', groupTitle);
				groupElement.setAttribute('id', groupGuid);

				let nodePositionX = groupPosition.x - this.startX;
				let nodePositionY = groupPosition.y - this.startY;

				groupElement.style.top = nodePositionY + 'px';
				groupElement.style.left = nodePositionX + 'px';
				groupElement.style.minWidth = '200px';

				if (!isContext)
					groupElement.style.minHeight = '200px';

				let headerElement = document.createElement('h5');
				headerElement.innerText = groupTitle;
				groupElement.appendChild(headerElement);

				this.containerElement.appendChild(groupElement);

				if (isContext) 
				{
					let knotElement = document.createElement('em');
					groupElement.appendChild(knotElement);
				}

				if(!this.isEmbedded)
				{
					let self = this;

					headerElement.onmousedown = function(event) {
						self.dragStartCallback(event, this.parentNode);
					}
					headerElement.onmouseenter = function(event) {
						this.parentNode.dataset['hovering'] = true;
						document.body.dataset['hovering'] = 1;
					}
					headerElement.onmouseleave = function(event) {
						this.parentNode.dataset['hovering'] = false;
						document.body.dataset['hovering'] = 0;
					}
				}

				this.resizeGroup(groupElement, isContext);
			});

			if (this.fragmentContext != null
				&& this.vertexContext != null)
			{
				this.contextEdge = [
					'fragment-context',
					document.querySelector('#fragment-context em'),
					'vertex-context',
					document.querySelector('#vertex-context em')
				];

				this.updateEdge(this.contextEdge[0], 
								undefined, 
								this.contextEdge[1], 
								this.contextEdge[2], 
								undefined, 
								this.contextEdge[3],
								true);
			}
		},

		renderSlots : function(nodeElement, slots, guid, isProperty)
		{
			let slotContainer = document.createElement('div');
			slotContainer.className = 'slot-container';

			nodeElement.appendChild(slotContainer);

			var inputs = [];
			var outputs = [];

			this.edgeTable[guid] = {
				'i' : {},
				'o' : {}
			};

			slots.forEach((slot) => {
				var serializedSlot = null;
				var fullSlotName = null;

				if (this.isNewGraph)
				{
					fullSlotName = slot['m_Type'];
					serializedSlot = slot;
				}
				else
				{
					let slotData = slot['JSONnodeData'];
					let typeInfo = slot['typeInfo'];
					fullSlotName = typeInfo.fullName;
					serializedSlot = JSON.parse(slotData);
				}

				let type = serializedSlot['m_SlotType'];
				let id = serializedSlot['m_Id'];
				let defaultValue = serializedSlot['m_DefaultValue'];
				var name = serializedSlot['m_DisplayName'];

				if (this.materialSlotNames[fullSlotName] != undefined) {
					name += ' (<i>' + this.materialSlotNames[fullSlotName] + '</i>)';
				}

				if(type == 0)
					inputs.push([name, id, undefined, serializedSlot, fullSlotName]);
				else if(type == 1)
					outputs.push([name, id, undefined, serializedSlot, fullSlotName]);
			});

			this.renderSlotInputs(inputs, guid, slotContainer);
			this.renderSlotOutputs(outputs, guid, slotContainer);

			this.containerElement.appendChild(nodeElement);
		},

		renderNodeSettings : function(node, name, fullNodeName, slots)
		{
			if (!this.isNewGraph 
				&& (fullNodeName != this.customFunctionNodeType
				&& fullNodeName != this.subgraphNodeType)) {
				return;
			}

			let innerHTML = '';

			innerHTML += '<strong>' + name + ' Node</strong>';

			if (node['m_Precision'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Precision</dt><dd>' + this.precision[node['m_Precision']] + '</dd>';
				innerHTML += '</dl>';
			}

			if (node['m_PreviewMode'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Preview</dt><dd>' + this.previewMode[node['m_PreviewMode']] + '</dd>';
				innerHTML += '</dl>';
			}

			if (node['m_PositionSource'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Source</dt><dd>' + this.positionSource[node['m_PositionSource']] + '</dd>';
				innerHTML += '</dl>';
			}

			if (fullNodeName == this.customFunctionNodeType
				&& slots.length > 0)
			{
				innerHTML += '<div class="slots">';
				innerHTML += '<h6>Inputs</h6>';
				slots.forEach((slot) => {
					var slotType = null;
					var slotFullName = null;
					var slotOutputName = null;

					if (!this.isNewGraph)
					{
						let slotData = JSON.parse(slot['JSONnodeData']);
						slotType = slotData['m_SlotType'];
						slotOutputName = slotData['m_ShaderOutputName'];
						slotFullName = slot['typeInfo']['fullName'];
					}
					else
					{
						slotType = slot['m_SlotType'];
						slotOutputName = slot['m_ShaderOutputName'];
						slotFullName = slot['m_Type'];
					}

					if (slotType == 1)
						return;

					let materialSlot = slotFullName.match(/[^UnityEditor\.ShaderGraph\.](.*)[^MaterialSlot]/g);
					var materialSlotName = materialSlot;

					if (materialSlot == "Vector1")
						materialSlotName = "Float";

					innerHTML += '<dl><dt>' + slotOutputName + '</dt><dd>' + materialSlotName + '</dd></dl>';
				});

				innerHTML += '</div>';

				innerHTML += '<div class="slots">';
				innerHTML += '<h6>Outputs</h6>';

				slots.forEach((slot) => {
					var slotType = null;
					var slotFullName = null;
					var slotOutputName = null;

					if (!this.isNewGraph)
					{
						let slotData = JSON.parse(slot['JSONnodeData']);
						slotType = slotData['m_SlotType'];
						slotOutputName = slotData['m_ShaderOutputName'];
						slotFullName = slot['typeInfo']['fullName'];
					}
					else
					{
						slotType = slot['m_SlotType'];
						slotOutputName = slot['m_ShaderOutputName'];
						slotFullName = slot['m_Type'];
					}

					if (slotType == 0)
						return;

					let materialSlot = slotFullName.match(/[^UnityEditor\.ShaderGraph\.](.*)[^MaterialSlot]/g);
					var materialSlotName = materialSlot;

					if (materialSlot == "Vector1")
						materialSlotName = "Float";

					innerHTML += '<dl><dt>' + slotOutputName + '</dt><dd>' + materialSlotName + '</dd></dl>';
				});
				innerHTML += '</div>';
			}

			innerHTML += '<dl>';

			if(fullNodeName == this.customFunctionNodeType)
			{
				innerHTML += '<dt>Type</dt><dd>';

				if (node['m_SourceType'] == 0)
					innerHTML += 'File';
				else
					innerHTML += 'String';

				innerHTML += '</dd>';
				innerHTML += '</dl>';
				innerHTML += '<dl>';
				innerHTML += '<dt>Name</dt><dd>' + node['m_FunctionName'] + '</dd>';
				innerHTML += '</dl>';
				innerHTML += '<dl>';
				innerHTML += '<dt>Source</dt>';

				if (node['m_SourceType'] == 0)
					innerHTML += '<dd>None</dd></dl>';
				else
				{
					innerHTML += '</dl>';
					innerHTML += '<textarea disabled>';
					console.log(node);
					innerHTML += node['m_FunctionBody'];
					innerHTML += '</textarea>';
				}
			}
			else if(fullNodeName == this.subgraphNodeType)
			{
				let serializedSubGraph = JSON.parse(node['m_SerializedSubGraph']);
				let subgraphGUID = serializedSubGraph['subGraph']['guid'];

				if(typeof subgraphs != 'undefined'
					&& subgraphs[subgraphGUID] != undefined)
				{
					let subgraphID = subgraphs[subgraphGUID];

					innerHTML += '<dt>SubGraph GUID: </dt><dd><a href="/library/' + subgraphID + '/">' + serializedSubGraph['subGraph']['guid'] + '</a></dd>';
				}
				else
					innerHTML += '<dt>SubGraph GUID: </dt><dd>' + serializedSubGraph['subGraph']['guid'] + '</dd>';
			}

			innerHTML += '</dl>';

			this.inspector.setInnerHTML(innerHTML);
			this.inspector.show();
		},

		renderNode : function(node, nodeElement, fullNodeName, slots)
		{
			var guid = null;
			var groupGuid = undefined;

			if (this.isNewGraph)
			{
				guid = node['m_ObjectId'];
			 	groupGuid = node['m_Group']['m_Id'];
			}
			else
			{
			 	guid = node['m_GuidSerialized'];
				groupGuid = node['m_GroupGuidSerialized'];
			}

			let drawState = node['m_DrawState'];
			let position = drawState['m_Position'];
			let name = node['m_Name'];
			let nodePositionX = position.x - this.startX;
			let nodePositionY = position.y - this.startY;
			let expanded = drawState['m_Expanded'];
			let propertyGuid = (node['m_Property'] != undefined ? node['m_Property']['m_Id'] : undefined);

			if (groupGuid != undefined && groupGuid.length > 0)
			{				
				if(this.groupTable[groupGuid] == undefined)
					this.groupTable[groupGuid] = [];

				this.groupTable[groupGuid].push(guid);
			}

			nodeElement.className = "node";

			var isProperty = false;

			if(fullNodeName == this.propertyNodeType) {
				nodeElement.className += ' property';
				nodeElement.dataset['property'] = propertyGuid;
				isProperty = true;
			}
			else if (fullNodeName == this.dropdownNodeType) {
				if (node['m_Dropdown'] != undefined && node['m_Dropdown']['m_Id'] != undefined) {
					nodeElement.dataset['property'] = node['m_Dropdown']['m_Id'];
					nodeElement.className += ' dropdown';
				}
			}
			else if (fullNodeName == this.keywordNodeType) {
				if (node['m_Keyword'] != undefined && node['m_Keyword']['m_Id'] != undefined) {// new format
					nodeElement.dataset['property'] = node['m_Keyword']['m_Id'];
					nodeElement.className += ' keyword';
				} else if (node['m_KeywordGuidSerialized'] != undefined) { // old format
					nodeElement.dataset['property'] = node['m_KeywordGuidSerialized'];
					nodeElement.className += ' keyword';
				}
			}
			else if (fullNodeName == this.blockNodeType)
				nodeElement.className += ' block';

			nodeElement.dataset['expanded'] = (expanded === true ? '1' : '0');
			nodeElement.dataset['fullname'] = fullNodeName;
			nodeElement.dataset['groupguid'] = groupGuid;
			nodeElement.setAttribute('title', name);
			nodeElement.setAttribute('id', guid);

			if (fullNodeName == this.blockNodeType) {
				var context = null;

				if (node['m_SerializedDescriptor'].includes('SurfaceDescription')
					|| node['m_SerializedDescriptor'].includes('Material.')
					|| node['m_SerializedDescriptor'].includes('.Color'))
					context = this.fragmentContext
				else if (node['m_SerializedDescriptor'].includes('VertexDescription'))
					context = this.vertexContext;

				if (context == null) {
					console.error('Context not found! ' + node['m_SerializedDescriptor']);
					return;
				}

				var index = 0;

				for (var i = 0; i < context['m_Blocks'].length; i++)
				{
					if (context['m_Blocks'][i]['m_Id'] == guid)
						break;

					index += 1;
				}

				let groupPosition = context['m_Position'];
				let nodePositionX = groupPosition.x - this.startX;
				let nodePositionY = groupPosition.y - this.startY;

				nodeElement.style.top = (nodePositionY + 50 + index * 40) + 'px';
				nodeElement.style.left = nodePositionX + 'px';

			}
			else {
				nodeElement.style.top = nodePositionY + 'px';
				nodeElement.style.left = nodePositionX + 'px';
				nodeElement.style.minWidth = position.width + 'px';
			}

			if (fullNodeName != this.blockNodeType)
			{
				let self = this;

				nodeElement.onmousedown = function(event)
				{
					self.renderNodeSettings(node, name, fullNodeName, slots);

					if(event.detail == 2
						&& node['m_SerializedSubGraph'] != undefined)
					{
						let serializedSubGraph = JSON.parse(node['m_SerializedSubGraph']);
						let subgraphGUID = serializedSubGraph['subGraph']['guid'];

						if(typeof subgraphs != 'undefined'
							&& subgraphs[subgraphGUID] != undefined)
						{
							let subgraphID = subgraphs[subgraphGUID];
							let url = '/library/' + subgraphID + '/';

							if(self.isEmbedded)
								window.open(url, '_blank');
							else
								window.location = url;

							return;
						}
					}

					if(!self.isEmbedded)
						self.dragStartCallback(event, this);
				}

				if(!this.isEmbedded)
				{
					nodeElement.onmouseenter = function(event) {
						this.dataset['hovering'] = true;
						document.body.dataset['hovering'] = 1;
						if (nodeElement.dataset['property'] != null) {
							let el = document.querySelector('#blackboard-container .property-list h3[data-id="'+ nodeElement.dataset['property'] +'"]');

							if (el != undefined)
								el.classList.add('emphasis');
						}
					}
					nodeElement.onmouseleave = function(event) {
						this.dataset['hovering'] = false;
						document.body.dataset['hovering'] = 0;
						if (nodeElement.dataset['property'] != null) {
							let el = document.querySelector('#blackboard-container .property-list h3[data-id="'+ nodeElement.dataset['property'] +'"]');

							if (el != undefined)
								el.classList.remove('emphasis');
						}
					}
				}
			}

			if(fullNodeName != this.propertyNodeType
				&& fullNodeName != this.blockNodeType
				&& fullNodeName != this.redirectNodeType)
			{
				let nodeHeader = document.createElement('h5');

				let innerHTML = '<span>' + name + '</span>';

				innerHTML += '<span class="tools">';
				innerHTML += '<em data-expanded="' + (expanded === true ? '1' : '0') + '" class="chevron"></em>';
				innerHTML += '</span>';

				nodeHeader.innerHTML = innerHTML;

				nodeElement.appendChild(nodeHeader);
				let self = this;
				nodeElement.querySelector('.chevron').addEventListener('click', function(event) {

					if(this.dataset['disabled'] == '1')
						return;

					let expanded = (nodeElement.dataset['expanded'] == '1');

					if(expanded)
					{
						[...nodeElement.querySelectorAll('.slot-container li:not(.filled)')].forEach((el) => el.style.display = 'none');
						this.dataset['expanded'] = '0';
						nodeElement.dataset['expanded'] = '0';
					}
					else
					{
						[...nodeElement.querySelectorAll('.slot-container li:not(.filled)')].forEach((el) => el.style.display = 'flex');
						this.dataset['expanded'] = '1';
						nodeElement.dataset['expanded'] = '1';
					}

					self.moveNodeWithGuid(nodeElement.id);

					event.preventDefault();
				});
			}
			else if(this.serializedProperties[propertyGuid] != undefined)
			{
				let serializedProperty = this.serializedProperties[propertyGuid];

				nodeElement.setAttribute('data-generatepropertyblock', true);//serializedProperty['m_GeneratePropertyBlock']);
			}

			this.renderSlots(nodeElement, slots, guid, isProperty);


			if (fullNodeName == this.comparisonNodeType)
			{
				let slotContainer = document.createElement('div');
				slotContainer.className = 'extra-properties';
				let comparisonType = node['m_ComparisonType'];
				var comparisonString = 'Unknown';
				switch (comparisonType)
				{
					case 0:
						comparisonString = 'Equal';
						break;
					case 1:
						comparisonString = 'NotEqual';
						break;
					case 2:
						comparisonString = 'Less';
						break;
					case 3:
						comparisonString = 'LessOrEqual';
						break;
					case 4:
						comparisonString = 'Greater';
						break;
					case 5:
						comparisonString = 'GreaterOrEqual';
						break;
				}
				slotContainer.innerText = comparisonString;

				nodeElement.appendChild(slotContainer);
			}

			if (fullNodeName == this.colorNodeType)
			{
				let color = node['m_Color'];
				let colorValue = color['color'];
				let colorModeValue = color['mode'];

				let colorContainer = document.createElement('div');
				colorContainer.className = 'color-container';

				var value = '<div class="color" style="background-color:rgb('+(255*colorValue['r'])+','+(255*colorValue['g'])+','+(255*colorValue['b'])+');">&nbsp;</div>';
				value += '<div class="opacity" style="width:' + (parseFloat(colorValue['a']) * 100) + '%">&nbsp;</div>';
				value += '</div>';
				colorContainer.innerHTML = value;
				nodeElement.appendChild(colorContainer);

				let slotContainer = document.createElement('div');
				slotContainer.className = 'extra-properties';
				slotContainer.innerHTML = '<dl><dt>Mode</dt><dd>' + this.colorMode[colorModeValue] + '</dd></dl>';
				nodeElement.appendChild(slotContainer);
			}
		},

		renderGraphSettings : function(serializedGraph, graphDataNode)
		{
			let innerHTML = '';

			if (graphDataNode['m_GraphPrecision'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Precision</dt><dd>' + this.graphPrecision[graphDataNode['m_GraphPrecision']] + '</dd>';
				innerHTML += '</dl>';
			}
			else if (graphDataNode['m_ConcretePrecision'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Precision</dt><dd>' + this.graphPrecision[graphDataNode['m_ConcretePrecision']] + '</dd>';
				innerHTML += '</dl>';
			}

			if (graphDataNode['m_ActiveTargets'] != undefined
				&& graphDataNode['m_ActiveTargets'].length > 0)
			{
				innerHTML +=  '<strong>Target Settings</strong>';

				graphDataNode['m_ActiveTargets'].forEach((target) => {
					innerHTML += '<div class="target">';
					let targetNode = this.findNodeWithId(serializedGraph, target['m_Id']);
					let targetName = targetNode['m_Type'].split(/\./)[2];

					innerHTML += '<h6>' + targetName + '</h6>';

					if (targetNode['m_AllowMaterialOverride'] != undefined)
						innerHTML += '<dl><dt>Allow Material Override</dt><dd>' + (targetNode['m_AllowMaterialOverride'] == true ? "Yes" : "No") + '</dd></dl>';

					if (targetNode['m_AlphaClip'] != undefined)
						innerHTML += '<dl><dt>Alpha Clipping</dt><dd>' + (targetNode['m_AlphaClip'] == true ? "Yes" : "No") + '</dd></dl>';

					if (targetNode['m_CastShadows'] != undefined)
						innerHTML += '<dl><dt>Cast Shadows</dt><dd>' + (targetNode['m_CastShadows'] == true ? "Yes" : "No") + '</dd></dl>';

					if (targetNode['m_ReceiveShadows'] != undefined)
						innerHTML += '<dl><dt>Receive Shadows</dt><dd>' + targetNode['m_ReceiveShadows'] + '</dd></dl>';

					if (targetNode['m_SurfaceType'] != undefined)
						innerHTML += '<dl><dt>Surface Type</dt><dd>' + this.surfaceType[targetNode['m_SurfaceType']] + '</dd></dl>';

					if (targetNode['m_RenderFace'] != undefined)
						innerHTML += '<dl><dt>Render Face</dt><dd>' + this.renderFace[targetNode['m_RenderFace']] + '</dd></dl>';

					if (targetNode['m_ZTestMode'] != undefined)
						innerHTML += '<dl><dt>Depth Test</dt><dd>' + this.zTestMode[targetNode['m_ZTestMode']] + '</dd></dl>';

					if (targetNode['m_ZWriteControl'] != undefined)
						innerHTML += '<dl><dt>Depth Write</dt><dd>' + this.zWriteControl[targetNode['m_ZWriteControl']] + '</dd></dl>';

					if (targetNode['m_ActiveSubTarget'] != undefined)
					{
						let subtargetNode = this.findNodeWithId(serializedGraph, targetNode['m_ActiveSubTarget']['m_Id']);

						if (subtargetNode != null)
						{
							let type = subtargetNode['m_Type'];

							if (subtargetNode['m_ClearCoat'] != undefined)
								innerHTML += '<dl><dt>Clear Coat</dt><dd>' + (subtargetNode['m_ClearCoat'] == true ? "Yes" : "No") + '</dd></dl>';

							if (subtargetNode['m_WorkflowMode'] != undefined)
							{
								var workflowMode = "Undefined";

								if (type == "UnityEditor.Rendering.Universal.ShaderGraph.UniversalLitSubTarget")
									workflowMode = this.universalWorkflowMode[subtargetNode['m_WorkflowMode']];
								else if (type == "UnityEditor.Rendering.BuiltIn.ShaderGraph.BuiltInLitSubTarget")
									workflowMode = this.litWorkflowMode[subtargetNode['m_WorkflowMode']];

								innerHTML += '<dl><dt>Workflow Mode</dt><dd>' + workflowMode + '</dd></dl>';
							}

							if (subtargetNode['m_NormalDropOffSpace'] != undefined)
								innerHTML += '<dl><dt>Fragment Normal Space</dt><dd>' + this.normalDropOffSpace[subtargetNode['m_NormalDropOffSpace']] + '</dd></dl>';
						}
					}

					innerHTML += '</div>';
				});
			}

			this.inspector.setInnerHTML(innerHTML, true);
		},

		parseNew : function(serializedGraph)
		{
			console.log('New shader graph schema detected. Reconstructing...');

			this.initializeVariables();

			let graphDataNode = this.findNodeWithType(serializedGraph, this.graphDataType);

			if (graphDataNode == null)
			{
				alert('No graph data node found, bailing');
				return;
			}

			this.inspector.toggleNav(true);
			this.renderGraphSettings(serializedGraph, graphDataNode);

			var nodes = [];

			graphDataNode['m_Nodes'].forEach((node) => {
				let nodeProperty = this.findNodeWithId(serializedGraph, node['m_Id']);

				if (nodeProperty == null)
					return;

				nodes.push(nodeProperty);
			});

			var blackboardCategories = [];

			if (graphDataNode['m_CategoryData'] != undefined)
			{
				graphDataNode['m_CategoryData'].forEach((node) => {
					let nodeProperty = this.findNodeWithId(serializedGraph, node['m_Id']);

					if (nodeProperty == null)
						return;

					blackboardCategories.push(nodeProperty);
				});
			}
			else
			{
				var fakeCategoryData = {
					'm_Name': '',
					'm_ChildObjectList': []
				};

				if (graphDataNode['m_Properties'] != undefined)
				{
					graphDataNode['m_Properties'].forEach((property) => {
						fakeCategoryData['m_ChildObjectList'].push(property);
					});
				}

				if (graphDataNode['m_Keywords'] != undefined)
				{
					graphDataNode['m_Keywords'].forEach((keyword) => {
						fakeCategoryData['m_ChildObjectList'].push(keyword);
					});
				}

				if (graphDataNode['m_Dropdowns'] != undefined)
				{
					graphDataNode['m_Dropdowns'].forEach((dropdown) => {
						fakeCategoryData['m_ChildObjectList'].push(dropdown);
					});
				}

				blackboardCategories.push(fakeCategoryData);
			}

			var stickyNotes = [];

			graphDataNode['m_StickyNoteDatas'].forEach((node) => {
				let nodeProperty = this.findNodeWithId(serializedGraph, node['m_Id']);

				if (nodeProperty == null)
					return;

				stickyNotes.push(nodeProperty);
			});

			var groups = [];

			graphDataNode['m_GroupDatas'].forEach((node) => {
				let groupGuid = node['m_Id'];
				let nodeProperty = this.findNodeWithId(serializedGraph, groupGuid);

				if (nodeProperty == null)
					return;

				groups.push(nodeProperty);
				this.groupTable[groupGuid] = [];
			});

			this.vertexContext = graphDataNode['m_VertexContext'];

			if (window.FileLoader.isSubgraph && this.vertexContext['m_Blocks'].length == 0)
				this.vertexContext = null;

			this.fragmentContext = graphDataNode['m_FragmentContext'];

			if (window.FileLoader.isSubgraph && this.fragmentContext['m_Blocks'].length == 0)
				this.fragmentContext = null;

			if(nodes == undefined)
				return null;

			this.updateBlackboardHeader(graphDataNode['m_Path']);

			console.log('Parsing properties...');

			if (blackboardCategories.length > 0)
			{
				this.blackboard.blackboardElement.querySelector('ul').className = 'new';
				this.blackboard.blackboardElement.querySelector('h6').style.display = 'none';

				blackboardCategories.forEach((blackboardCategory) => {
					let name = blackboardCategory['m_Name'];
					let listElement = document.createElement('li');
					var innerHTML = '';

					if (name.length > 0)
					{
						listElement.className = 'named';
						innerHTML += '<h6>';
						innerHTML += '<em data-expanded="1" class="chevron"></em>';
						innerHTML += name + '</h6>';
					}

					var children = [];
					blackboardCategory['m_ChildObjectList'].forEach((child) => {
						let childNode = this.findNodeWithId(serializedGraph, child['m_Id']);

						if (childNode == null)
							return;

						innerHTML += '<div>' + this.renderProperty(childNode, childNode['m_Type']) + '</div>';
					});

					listElement.innerHTML = innerHTML;

					if (listElement.querySelector('.chevron') != undefined) {
						listElement.querySelector('.chevron').addEventListener('click', function() {

							let expanded = (this.dataset['expanded'] == "1");

							this.dataset['expanded'] = (expanded ? "0" : "1");

							[...listElement.querySelectorAll('div')].forEach((el) => {
								el.style.display = expanded ? 'none' : 'block';
							})
						});
					}

					listElement.querySelectorAll('h3').forEach((element) => {
						element.addEventListener('mouseenter', () => {
							[...document.querySelectorAll('div[data-property="'+ element.dataset.id +'"]')].forEach((el) => {
								el.classList.add('emphasis');
							});
						});
						element.addEventListener('mouseleave', () => {
							[...document.querySelectorAll('div[data-property="'+ element.dataset.id +'"]')].forEach((el) => {
								el.classList.remove('emphasis');
							});
						});
						element.addEventListener('click', () => {
							let node = this.findNodeWithId(serializedGraph, element.dataset.id);
							let innerHTML = this.renderPropertySettings(node, node['m_Type'], true);

							this.inspector.setInnerHTML('<div class="property">' + innerHTML + '</div>', false);
							this.inspector.show();
						});
					})

					this.blackboard.blackboardElement.querySelector('ul').appendChild(listElement);
				});

				if(!this.isEmbedded)
					this.blackboard.show();
			}

			console.log('Calculating canvas size...');

			let contexts = [ ];

			if (this.vertexContext != null)
				contexts.push(this.vertexContext);

			if (this.fragmentContext != null)
				contexts.push(this.fragmentContext);

			for (var i = 0; i < contexts.length; i++) {
				let context = contexts[i];
				let position = context['m_Position'];
				let guid = (i == 0 ? 'vertex-context' : 'fragment-context');

				this.calculateDimensionsForElementWithPosition(position, guid);
			};

			nodes.forEach((node) => {
				let drawState = node['m_DrawState'];
				let position = drawState['m_Position'];
				let guid = node['m_ObjectId'];

				this.calculateDimensionsForElementWithPosition(position, guid);
			});

			if(stickyNotes != undefined
				&& stickyNotes.length > 0)
			{
				stickyNotes.forEach((stickyNote) => {
					let position = stickyNote['m_Position'];
					let guid = stickyNote['m_ObjectId'];

					this.calculateDimensionsForElementWithPosition(position, guid);
				});
			}

			this.calculateFinalDimensions();
			
			for (var i = 0; i < contexts.length; i++)
			{
				let context = contexts[i];
				var blocks = [];

				if (context['m_Blocks'] != undefined)
				{
					context['m_Blocks'].forEach((block) => {
						blocks.push(block['m_Id']);
					});
				}

				let groupGuid = (i == 0 ? 'vertex-context' : 'fragment-context');

				this.groupTable[groupGuid] = [];

				blocks.forEach((blockId) => {
					this.groupTable[groupGuid].push(blockId);
				});

				let simulatedGroup = {
					'm_Title' : (i == 0 ? 'Vertex' : 'Fragment'),
					'm_Position': context['m_Position'],
					'm_ObjectId': groupGuid,
					'is_simulated': true
				}

				groups.push(simulatedGroup);
			}

			console.log('Drawing nodes...');

			nodes.forEach((node) => {
				let fullNodeName = node['m_Type'];
				let nodeElement = document.createElement('div');

				var slots = [];

				if (node['m_Slots'] != undefined)
				{
					node['m_Slots'].forEach((mSlot) => {
						let slot = this.findNodeWithId(serializedGraph, mSlot['m_Id']);
					
						if (slot == null)
							return;

						slots.push(slot);
					});
				}

				this.renderNode(node, nodeElement, fullNodeName, slots);

				this.containerElement.appendChild(nodeElement);
			});

			this.calculateEdges(graphDataNode['m_Edges']);

			this.renderStickyNotes(stickyNotes);

			this.renderGroups(groups);

			let leftMostElement = document.getElementById(this.leftMostStruct['guid']);
			let leftMostElementLeft = parseInt(leftMostElement.style.left);
			let leftMostElementTop = parseInt(leftMostElement.style.top);
			let leftMostElementWidth = leftMostElement.offsetWidth;
			let leftMostElementHeight= leftMostElement.offsetHeight;

			return {
				x: leftMostElementLeft + (leftMostElementWidth / 2),
				y: leftMostElementTop + (leftMostElementHeight / 2),
			}
		},

		findNodeWithType : function(serializedGraph, type)
		{
			for (var i = 0; i < serializedGraph.length; i++)
			{
				if (serializedGraph[i]['m_Type'] == type)
					return serializedGraph[i];
			}

			return null;
		},

		findNodeWithId : function(serializedGraph, id)
		{
			for (var i = 0; i < serializedGraph.length; i++)
			{
				if (serializedGraph[i]['m_ObjectId'] == id)
					return serializedGraph[i];
			}

			return null;
		},

		renderPropertySettings : function(serializedProperty, typeInfo, showHeader = false)
		{
			let isExposed = serializedProperty['m_GeneratePropertyBlock'] === true;
			var innerHTML = '';
			let reference = (serializedProperty['m_OverrideReferenceName'] != undefined && serializedProperty['m_OverrideReferenceName'] !='' ? serializedProperty['m_OverrideReferenceName'] : serializedProperty['m_DefaultReferenceName']);

			var value = serializedProperty['m_Value'];

			if (typeInfo == this.shaderKeyword
				&& serializedProperty['m_KeywordType'] == 0)
			{
				value = (value === 1.0 ? 'Yes' : 'No');
			}
			else if(typeof value == 'object')
			{
				if(typeInfo == this.textureShaderProperty 
					|| typeInfo == this.textureShaderPropertyInternal
					|| typeInfo == this.texture2DArrayShaderProperty
					|| typeInfo == this.texture2DArrayShaderPropertyInternal
					|| typeInfo == this.texture3DShaderProperty
					|| typeInfo == this.texture3DShaderPropertyInternal
					|| typeInfo == this.virtualTextureShaderProperty)
					value = '<em class="texture"></em>Texture';
				else if(typeInfo == this.cubemapShaderProperty
					|| typeInfo == this.cubemapShaderPropertyInternal)
					value = '<em class="texture"></em>Cubemap';
				else if(typeInfo == this.colorShaderProperty 
					|| typeInfo == this.colorShaderPropertyInternal)
				{
					let colorValue = value;

					value = '<div class="color-container">';
					value += '<div class="color" style="background-color:rgb('+(255*colorValue['r'])+','+(255*colorValue['g'])+','+(255*colorValue['b'])+');">&nbsp;</div>';
					value += '<div class="opacity" style="width:' + (parseFloat(colorValue['a']) * 100) + '%">&nbsp;</div>';
					value += '</div>';
				}
				else if(typeInfo == this.vector2ShaderProperty || typeInfo == this.vector2ShaderPropertyInternal)
					value = 'X:' + this.normalizedSlotValue(value['x']) + ' Y:' + this.normalizedSlotValue(value['y']);
				else if(typeInfo == this.vector3ShaderProperty || typeInfo == this.vector3ShaderPropertyInternal)
					value = 'X:' + this.normalizedSlotValue(value['x']) + ' Y:' + this.normalizedSlotValue(value['y']) + ' Z:' + this.normalizedSlotValue(value['z']);
				else if(typeInfo == this.vector4ShaderProperty || typeInfo == this.vector4ShaderPropertyInternal)
					value = 'X:' + this.normalizedSlotValue(value['x']) + ' Y:' + this.normalizedSlotValue(value['y']) + ' Z:' + this.normalizedSlotValue(value['z']) + ' W:' + this.normalizedSlotValue(value['w']);
				else {
					// TODO: Add more support for properties like Gradient, Matrix2,3,4 etc
					console.log('Unsupported inspector type detected: ' + typeInfo);
					console.log(serializedProperty);
					value = undefined;
				}
			}
			else if(typeof value == 'boolean')
			{
				value = (value === true ? 'Yes' : 'No');
			}
			else if(typeof value == 'number')
			{
				value = this.normalizedSlotValue(value);
			}

			if (showHeader) 
			{
				innerHTML += '<h6>' + (typeInfo == this.shaderKeyword ? 'Keyword' : 'Property') + ': ' + serializedProperty['m_Name'] + '</h6>';

				innerHTML += '<dl>';
				innerHTML += '<dt>Name</dt><dd>' + serializedProperty['m_Name'] + '</dd>';
				innerHTML += '</dl>';
			}

			if (reference != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Reference</dt><dd>' + reference + '</dd>';
				innerHTML += '</dl>';
			}

			if (serializedProperty['useTilingAndOffset'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Use Tiling And Offset</dt><dd>' + (serializedProperty['useTilingAndOffset'] ? 'Yes' : 'No') + '</dd>';
				innerHTML += '</dl>';
			}

			if (serializedProperty['hlslDeclarationOverride'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Override Property Declaration</dt><dd>' + (serializedProperty['hlslDeclarationOverride'] ? 'Yes' : 'No') + '</dd>';
				innerHTML += '</dl>';
			}			

			innerHTML += '<dl>';
			innerHTML += '<dt>Exposed</dt><dd>' + (isExposed ? 'Yes' : 'No') + '</dd>';
			innerHTML += '</dl>';

			if (value != undefined) {
	 			innerHTML += '<dl>';
				innerHTML += '<dt>Default</dt><dd>' + value + '</dd>';
				innerHTML += '</dl>';
			}

			if(serializedProperty['m_FloatType'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Mode</dt><dd>' + this.mode[serializedProperty['m_FloatType']] + '</dd>';
				innerHTML += '</dl>';
			}

			if(serializedProperty['m_ColorMode'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Mode</dt><dd>' + this.colorMode[serializedProperty['m_ColorMode']] + '</dd>';
				innerHTML += '</dl>';
			}

			if (!this.isNewGraph || serializedProperty['m_Precision'] != undefined)
			{
				innerHTML += '<dl>';
				innerHTML += '<dt>Precision</dt><dd>';

				if(serializedProperty['m_Precision'] == undefined)
					innerHTML += this.precision[0] + '</dd>';
				else
					innerHTML += this.precision[serializedProperty['m_Precision']] + '</dd>';

				innerHTML += '</dl>';
			}

			if (serializedProperty['m_KeywordDefinition'] != undefined)
			{
				innerHTML += '<dl><dt>Definition</dt><dd>';

				if (serializedProperty['m_KeywordDefinition'] == 0)
					innerHTML += 'Shader Feature';
				else if (serializedProperty['m_KeywordDefinition'] == 1)
					innerHTML += 'Multi Compile';
				else if (serializedProperty['m_KeywordDefinition'] == 2)
					innerHTML += 'Predefined';
				else
					innerHTML += 'Undefined';

				innerHTML += '</dd></dl>';
			}

			if (serializedProperty['m_KeywordScope'] != undefined)
			{
				innerHTML += '<dl><dt>Scope</dt><dd>';

				if (serializedProperty['m_KeywordScope'] == 0)
					innerHTML += 'Local';
				else if (serializedProperty['m_KeywordScope'] == 1)
					innerHTML += 'Global';
				else
					innerHTML += 'Undefined';

				innerHTML += '</dd></dl>';
			}

			if (serializedProperty['m_KeywordStages'] != undefined)
			{
				innerHTML += '<dl><dt>Stages</dt><dd>';

				let keywordStagesKeys = Object.keys(this.keywordStages);

				for (var i = 0; i < keywordStagesKeys.length; i++)
				{
					let key = keywordStagesKeys[i];
					if (this.keywordStages[key] == serializedProperty['m_KeywordStages'])
					{
						innerHTML += key;
						break;
					}
				}

				innerHTML += '</dd></dl>';
			}

			return innerHTML;
		},

		renderProperty : function(serializedProperty, typeInfo)
		{
			let listElement = document.createElement('li');
			let isExposed = true; //serializedProperty['m_GeneratePropertyBlock'] === true;

			var innerHTML = '<header>';

			if (!this.isNewGraph)
			{
				innerHTML += '<div class="left">';
				innerHTML += '<em data-expanded="1" class="chevron"></em>'
			}

			innerHTML += '<h3';

			if (this.isNewGraph)
				innerHTML += ' data-id="' + serializedProperty['m_ObjectId'] + '"';
			if(isExposed)
				innerHTML += ' class="exposed"';

			innerHTML += '>' + serializedProperty['m_Name'];
			innerHTML += '</h3>';

			if (!this.isNewGraph)
				innerHTML += '</div>';

			if(typeInfo == this.shaderKeyword)
				innerHTML += '<span>' + this.keywordType[serializedProperty['m_KeywordType']] + ' Keyword</span>';
			else if(typeInfo == this.vector1ShaderProperty || typeInfo == this.vector1ShaderPropertyInternal)
				innerHTML += '<span>Float</span>';
			else if(typeInfo == this.vector2ShaderProperty || typeInfo == this.vector2ShaderPropertyInternal)
				innerHTML += '<span>Vector2</span>';
			else if(typeInfo == this.vector3ShaderProperty || typeInfo == this.vector3ShaderPropertyInternal)
				innerHTML += '<span>Vector3</span>';
			else if(typeInfo == this.vector4ShaderProperty || typeInfo == this.vector4ShaderPropertyInternal)
				innerHTML += '<span>Vector4</span>';
			else if(typeInfo == this.colorShaderProperty || typeInfo == this.colorShaderPropertyInternal)
				innerHTML += '<span>Color</span>';
			else if(typeInfo == this.booleanShaderProperty || typeInfo == this.booleanShaderPropertyInternal)
				innerHTML += '<span>Boolean</span>';
			else if(typeInfo == this.gradientShaderProperty)
				innerHTML += '<span>Gradient</span>';
			else if(typeInfo == this.textureShaderProperty || typeInfo == this.textureShaderPropertyInternal)
				innerHTML += '<span>Texture2D</span>';
			else if(typeInfo == this.texture2DArrayShaderProperty || typeInfo == this.texture2DArrayShaderPropertyInternal)
				innerHTML += '<span>Texture2DArray</span>';
			else if(typeInfo == this.texture3DShaderProperty || typeInfo == this.texture3DShaderPropertyInternal)
				innerHTML += '<span>Texture3D</span>';
			else if(typeInfo == this.cubemapShaderProperty || typeInfo == this.cubemapShaderPropertyInternal)
				innerHTML += '<span>Cubemap</span>';
			else if(typeInfo == this.virtualTextureShaderProperty)
				innerHTML += '<span>VirtualTexture</span>';
			else if(typeInfo == this.matrix2ShaderProperty)
				innerHTML += '<span>Matrix2</span>';
			else if(typeInfo == this.matrix3ShaderProperty)
				innerHTML += '<span>Matrix3</span>';
			else if(typeInfo == this.matrix4ShaderProperty)
				innerHTML += '<span>Matrix4</span>';
			else if(typeInfo == this.samplerStateShaderProperty)
				innerHTML += '<span>SamplerState</span>';
			else if(typeInfo == this.shaderDropdown)
				innerHTML += '<span>Dropdown</span>';
			else {
				// TODO: Keep an eye for new property types.
				console.log(typeInfo);
			}

			innerHTML += '</header>';

			if (!this.isNewGraph) 
				innerHTML += this.renderPropertySettings(serializedProperty, typeInfo);

			this.serializedProperties[serializedProperty['m_ObjectId']] = serializedProperty;

			if (this.isNewGraph)
				return innerHTML;

			listElement.innerHTML = innerHTML;

			listElement.querySelector('.chevron').addEventListener('click', function() {

				let expanded = (this.dataset['expanded'] == "1");

				this.dataset['expanded'] = (expanded ? "0" : "1");

				[...listElement.querySelectorAll('dl')].forEach((el) => {
					el.style.display = expanded ? 'none' : 'flex';
				})
			});

			this.blackboard.blackboardElement.querySelector('ul').appendChild(listElement);
		},

		minPoint: undefined,
		maxPoint: undefined,
		leftMostStruct: undefined,
		startX : 0,
		startY : 0,
		fragmentContext : null,
		vertexContext : null,
		contextEdge : undefined,

		initializeVariables : function()
		{
			this.containerElement.innerHTML = "";
			this.containerElement.style.transform = "";

			this.edgeElements = {};
			this.edgeTable = {};
			this.slotInputs = {}
			this.slotOutputs = {};
			this.serializedProperties = {};
			this.canvasSize = {
				width : 0,
				height: 0
			};
			this.groupTable = {};
			this.svgElement = null;

			this.minPoint = undefined;
			this.maxPoint = undefined;
			this.leftMostStruct = undefined;
			this.startX = 0;
			this.startY = 0;

			this.fragmentContext = null;
			this.vertexContext = null;
			this.contextEdge = undefined;
		},

		updateBlackboardHeader : function(headerText)
		{
			var blackboardHeader = this.filename.split(/\./)[0];

			if(headerText != undefined)
				blackboardHeader += '<span>' + headerText + '</span>';

			this.blackboard.blackboardElement.querySelector('h5').innerHTML = blackboardHeader;
		},

		calculateDimensionsForElementWithPosition : function(position, guid)
		{
			let nodePositionX = position.x;
			let nodePositionY = position.y;

			if(this.minPoint == undefined)
			{
				this.minPoint = {
					x: nodePositionX,
					y: nodePositionY
				}
			}

			if(this.maxPoint == undefined)
			{
				this.maxPoint = {
					x: nodePositionX,
					y: nodePositionY
				}
			}

			if(nodePositionX < this.minPoint.x)
				this.minPoint.x = nodePositionX;

			if(nodePositionY < this.minPoint.y)
				this.minPoint.y = nodePositionY;

			if(nodePositionX > this.maxPoint.x)
				this.maxPoint.x = nodePositionX;

			if(nodePositionY > this.maxPoint.y)
				this.maxPoint.y = nodePositionY;

			let element = {
				x: nodePositionX,
				y: nodePositionY,
				'guid': guid
			};

			if(this.leftMostStruct == undefined
				|| nodePositionX < this.leftMostStruct.x)
				this.leftMostStruct = element;
		},

		renderSlotInputs : function(inputs, guid, slotContainer)
		{
			if (inputs.length == 0)
				return;

			let slotInputs = document.createElement('ul');
			slotInputs.className = 'slot-inputs';
			slotContainer.appendChild(slotInputs);

			inputs.forEach((input) => {
				let slotElement = document.createElement('li');
				slotElement.setAttribute('data-slotid', input[1]);

				if(input[2] != undefined)
					slotElement.setAttribute('data-value', input[2]);

				let knot = document.createElement('em');
				slotElement.appendChild(knot);

				let slotName = document.createElement('span');
				slotName.innerHTML = input[0];
				slotElement.appendChild(slotName);

				let value = input[3]['m_Value'];

				if(value != undefined)
				{
					let inputSlot = document.createElement('div');
					inputSlot.className = 'input-slot';

					var html = '';

					if (input[3]['m_Type'] == this.colorSlot)
					{
						html += '<span class="color" style="background-color: rgb(' + (parseFloat(value['x']) * 255) + ',' + (parseFloat(value['y']) * 255) + ',' + (parseFloat(value['z']) * 255) + ');">&nbsp;</span>';
					}
					else if (input[3]['m_Type'] == this.tangentSlot ||
						input[3]['m_Type'] == this.positionSlot ||
						input[3]['m_Type'] == this.normalSlot)
					{
						let space = parseInt(input[3]['m_Space']);

						if (space == 0)
							html += 'Object Space';
						else if (space == 1)
							html += 'View Space';
						else if (space == 2)
							html += 'World Space';
						else if (space == 3)
							html += 'Tangent Space';
						else
							html += 'X <span>' + this.normalizedSlotValue(value['x']) + '</span> Y <span>' + this.normalizedSlotValue(value['y']) + '</span> Z <span>' + this.normalizedSlotValue(value['z']) + '</span>';
					}
					else if(typeof value == 'object')
					{
						let labels = ['X', 'Y', 'Z', 'W'];
						var dimensions = Object.keys(value).length;

						if(dimensions > 3)
						{
							var initialValue = undefined;
							var allValuesEqual = true;

							dimensions = 1;

							for(i in value)
							{
								if(initialValue == undefined)
									initialValue = value[i];
								else if(initialValue != value[i])
								{
									allValuesEqual = false;
									dimensions += 1;
									break;
								}
							}

							if(allValuesEqual)
							{
								inputSlot.innerHTML = labels[0] + ' <span>' + this.normalizedSlotValue(initialValue) + '</span>';
								dimensions = 1;
							}
						}

						var index = 0;

						for(i in value)
						{
							if(index > dimensions - 1)
								break;

							html += labels[index] + ' <span>' + this.normalizedSlotValue(value[i]) + '</span> ';
							index += 1;
						}
					}
					else if (typeof value == 'boolean')
					{
						html += '<span>' + (value === true ? "Yes" : "No") + '</span>';
					}
					else if (typeof value == 'number')
					{
						html += 'X <span>' + this.normalizedSlotValue(value) + '</span>';
					}
					else {
						console.warn('Unexpected value: ' + value + ' typeof: ' + (typeof value));
						html += '<span>???</span>';
					}

					inputSlot.innerHTML = html;

					slotElement.appendChild(inputSlot);
				}

				slotInputs.appendChild(slotElement);

				this.edgeTable[guid]['i'][input[1]] = knot;
			});
		},

		renderSlotOutputs : function(outputs, guid, slotContainer)
		{
			if (outputs.length == 0)
				return;

			let slotOutputs = document.createElement('ul');
			slotOutputs.className = 'slot-outputs';
			slotContainer.appendChild(slotOutputs);

			outputs.forEach((output) => {

				let slotElement = document.createElement('li');
				slotElement.setAttribute('data-slotid', output[1]);

				if(output[2] != undefined)
					slotElement.setAttribute('data-value', output[2]);

				let slotName = document.createElement('span');
				slotName.innerHTML = output[0];
				slotElement.appendChild(slotName);

				let knot = document.createElement('em');
				if (output[4] != undefined) {
					knot.setAttribute('data-slotname', output[4]);
				}
				slotElement.appendChild(knot);

				slotOutputs.appendChild(slotElement);

				this.edgeTable[guid]['o'][output[1]] = knot;
			});
		},

		calculateFinalDimensions : function()
		{
			let width = parseInt(Math.abs(this.minPoint.x - this.maxPoint.x));
			let height = parseInt(Math.abs(this.minPoint.y - this.maxPoint.y));
			let finalWidth = width + (2 * this.extraHorizontalPadding);
			let finalHeight = height + (2 * this.extraVerticalPadding);
			this.startX = this.minPoint.x - this.extraHorizontalPadding;
			this.startY = this.minPoint.y - this.extraVerticalPadding;

			this.canvasSize.width = finalWidth;
			this.canvasSize.height= finalHeight;

			this.containerElement.style.width = this.canvasSize.width + 'px';
			this.containerElement.style.height = this.canvasSize.height + 'px';
		},

		parse : function(serializedGraph)
		{
			this.inspector.toggleNav(false);

			console.log('Old shader graph schema detected. Reconstructing...');

			this.initializeVariables();

			let nodes = serializedGraph['m_SerializableNodes'];
			let properties = serializedGraph['m_SerializedProperties'];
			let keywords = serializedGraph['m_SerializedKeywords'];
			let stickyNotes = serializedGraph['m_StickyNotes'];
			let groups = serializedGraph['m_Groups'];

			if(nodes == undefined)
				return null;

			this.updateBlackboardHeader(serializedGraph['m_Path']);

			console.log('Parsing properties...');

			var blackboardElementCreated = false;

			if(properties != undefined
				&& properties.length > 0)
			{
				this.blackboard.blackboardElement.querySelector('ul').className = '';
				this.blackboard.blackboardElement.querySelector('h6').style.display = 'block';
				blackboardElementCreated = true;

				properties.forEach((property) => {
					let propertyData = property['JSONnodeData'];
					let typeInfo = property['typeInfo']['fullName'];
					let serializedProperty = JSON.parse(propertyData);

					this.renderProperty(serializedProperty, typeInfo);
				});

				if(!this.isEmbedded)
					this.blackboard.show();
			}

			console.log('Parsing keywords...');

			if(keywords != undefined
				&& keywords.length > 0)
			{
				if (!blackboardElementCreated) 
				{
					this.blackboard.blackboardElement.querySelector('ul').className = '';
					this.blackboard.blackboardElement.querySelector('h6').style.display = 'block';
				}

				keywords.forEach((keyword) => {
					let keywordData = keyword['JSONnodeData'];
					let typeInfo = keyword['typeInfo']['fullName'];
					let serializedKeyword = JSON.parse(keywordData);

					this.renderProperty(serializedKeyword, typeInfo);
				});

				if(!this.isEmbedded)
					this.blackboard.show();
			}

			console.log('Calculating canvas size...');

			nodes.forEach((node) => {
				let nodeData = node['JSONnodeData'];
				let serializedNode = JSON.parse(nodeData);
				let drawState = serializedNode['m_DrawState'];
				let position = drawState['m_Position'];
				let guid = serializedNode['m_GuidSerialized'];

				this.calculateDimensionsForElementWithPosition(position, guid);
			});

			if(stickyNotes != undefined
				&& stickyNotes.length > 0)
			{
				stickyNotes.forEach((stickyNote) => {
					let position = stickyNote['m_Position'];
					let guid = stickyNote['m_GuidSerialized'];

					this.calculateDimensionsForElementWithPosition(position, guid);
				});
			}

			this.calculateFinalDimensions();

			console.log('Drawing nodes...');

			nodes.forEach((node) => {
				let nodeElement = document.createElement('div');

				let nodeData = node['JSONnodeData'];
				let serializedNode = JSON.parse(nodeData);
				let slots = serializedNode['m_SerializableSlots'];
				let fullNodeName = node['typeInfo']['fullName'];

				this.renderNode(serializedNode, nodeElement, fullNodeName, slots);

				this.containerElement.appendChild(nodeElement);
			});

			this.calculateEdges(serializedGraph['m_SerializableEdges']);

			this.renderStickyNotes(stickyNotes);

			this.renderGroups(groups);

			let leftMostElement = document.getElementById(this.leftMostStruct['guid']);
			let leftMostElementLeft = parseInt(leftMostElement.style.left);
			let leftMostElementTop = parseInt(leftMostElement.style.top);
			let leftMostElementWidth = leftMostElement.offsetWidth;
			let leftMostElementHeight= leftMostElement.offsetHeight;

			return {
				x: leftMostElementLeft + (leftMostElementWidth / 2),
				y: leftMostElementTop + (leftMostElementHeight / 2),
			}
		},

		normalizedSlotValue : function(value)
		{
			if (value == 0)
				return 0;

			let number = parseFloat(value);
			let fixedPointDouble = number.toFixed(2);
			let numberAfterComma = parseInt(fixedPointDouble.split(".")[1]);
			if (numberAfterComma == 0)
				return number.toFixed(0);
			else if (numberAfterComma % 10 == 0)
				return number.toFixed(1);
			else
				return fixedPointDouble;
		},

		recursivelyUpdateEdges : function(nodeGUID)
		{
			let edgeEntries = this.edgeElements[nodeGUID];

			if(edgeEntries == undefined)
				return;

			edgeEntries.forEach((serializedEdge) => {

				let inputSlot = serializedEdge['m_InputSlot'];
				let inputGuid = (this.isNewGraph ? inputSlot['m_Node']['m_Id'] : inputSlot['m_NodeGUIDSerialized']);
				let inputSlotId = inputSlot['m_SlotId'];

				let outputSlot = serializedEdge['m_OutputSlot'];
				let outputGuid = (this.isNewGraph ? outputSlot['m_Node']['m_Id'] : outputSlot['m_NodeGUIDSerialized']);
				let outputSlotId = outputSlot['m_SlotId'];

				// We only care about edge connections that the
				// current node (nodeGUID) is outputing
				if(outputGuid != nodeGUID)
					return;

				this.updateSlotNumberFromNode(outputGuid, outputSlotId,
											inputGuid, inputSlotId);

				// Repeat process for the next node
				this.recursivelyUpdateEdges(inputGuid);
			});
		},

		drawEdges : function()
		{
			for(let guid in this.edgeElements) {

				this.edgeElements[guid].forEach((serializedEdge) => {
					this.updateOrCreateEdge(serializedEdge);
				});
			}
		},

		updateSlotNumberFromNode : function(outputNodeGUID, outputSlotID, inputNodeGUID, inputSlotID)
		{
			let outputSlotNumberElement = document.getElementById(outputNodeGUID).querySelector('.slot-outputs li[data-slotid="' + outputSlotID + '"] i');

			if(outputSlotNumberElement == undefined)
				return;

			let slotNumber = outputSlotNumberElement.innerText;

			let inputNode = document.getElementById(inputNodeGUID);
			let inputFullName = inputNode.dataset['fullname'];

			// Don't change the input of certain nodes
			if(inputFullName == this.blendNodeType
				|| inputFullName == this.gradientNodeType
				|| inputFullName == this.unlitMasterNodeType
				|| inputFullName == this.gradientNoiseNodeType
				|| inputFullName == this.remapNodeType)
				return;

			let inputSlotNumber = inputNode.querySelector('.slot-inputs li[data-slotid="' + inputSlotID + '"] i');

			if(inputSlotNumber == undefined)
				return;
			let slotInputNumbers = inputNode.querySelectorAll('.slot-inputs li i');
			let outputSlotNumbers = inputNode.querySelectorAll('.slot-outputs li i');

			if(inputFullName == this.multiplyNodeType
				&& inputNode.dataset['assigned'] != undefined)
			{
				var maxValue = parseInt(inputNode.dataset['assigned']);

				if(slotNumber > maxValue)
					maxValue = slotNumber;

				inputNode.dataset['assigned'] = maxValue;
				slotNumber = maxValue;
				slotInputNumbers.forEach((slotNumberElement) => {
					this.updateSlotNumberValue(slotNumberElement, maxValue);
				});
			}
			else
			{
				this.updateSlotNumberValue(inputSlotNumber, slotNumber);
				inputNode.dataset['assigned'] = slotNumber;
			}

			// Don't change the output of certain nodes
			if(inputFullName == this.vector3NodeType
				|| inputFullName == this.randomRangeNodeType)
				return;

			if(outputSlotNumbers == undefined
				|| outputSlotNumbers.length == 0)
				return;

			if(inputFullName == this.multiplyNodeType)
			{
				this.updateSlotNumberValue(outputSlotNumbers[0], slotNumber);
			}
			else if(inputFullName == this.divideNodeType
				|| inputFullName == this.addNodeType
				|| inputFullName == this.subtractNodeType)
			{
				var minValue = 1;

				slotInputNumbers.forEach((slotNumberElement) => {
					let value = parseInt(slotNumberElement.innerText);

					if(value < minValue)
						minValue = value;
				});

				this.updateSlotNumberValue(outputSlotNumbers[0], minValue);
			}
			else
			{
				if(outputSlotNumbers.length > 1)
					return;

				outputSlotNumbers.forEach((slotNumberElement) => {
					this.updateSlotNumberValue(slotNumberElement, slotNumber);
				});
			}
		},

		updateSlotNumberValue(slotElement, value)
		{
			slotElement.innerText = value;
			slotElement.parentNode.parentNode.dataset['value'] = value;
		},

		resizeGroup : function(groupElement, isContext = false)
		{
			let groupGuid = groupElement.id
			var minLeft = 0;
			var minTop = 0;

			if (this.groupTable[groupGuid].length == 0)
				return;

			this.groupTable[groupGuid].forEach((nodeGUID) => {
				let nodeElement = document.getElementById(nodeGUID);

				let nodeLeft = parseInt(nodeElement.style.left);
				let nodeTop = parseInt(nodeElement.style.top);

				if(minLeft == 0 || minLeft > nodeLeft)
					minLeft = nodeLeft;

				if(minTop == 0 || minTop > nodeTop)
					minTop = nodeTop;
			});

			let horizontalPadding = (isContext ? 20 : 40);
			let verticalPadding = 40;

			minLeft -= horizontalPadding;
			minTop -= verticalPadding;

			var groupWidth = 0;
			var groupHeight= 0;

			this.groupTable[groupGuid].forEach((nodeGUID) => {
				let nodeElement = document.getElementById(nodeGUID);

				let nodeLeft = parseInt(nodeElement.style.left);
				let nodeTop = parseInt(nodeElement.style.top);
				let nodeWidth = nodeElement.offsetWidth;
				let nodeHeight= nodeElement.offsetHeight;

				let relativeLeft = nodeLeft - minLeft;
				let relativeTop = nodeTop - minTop;

				if(groupWidth < relativeLeft + nodeWidth)
					groupWidth = relativeLeft + nodeWidth;

				if(groupHeight < relativeTop + nodeHeight)
					groupHeight = relativeTop + nodeHeight;
			});

			groupElement.style.top = minTop + 'px';
			groupElement.style.left = minLeft + 'px';
			groupElement.style.width = (groupWidth + horizontalPadding) + 'px';
			groupElement.style.height = (isContext ? groupHeight + 10 : groupHeight + verticalPadding) + 'px';
		}
	};

	function inIframe () {
		try {
			return window.self !== window.top;
		} catch (e) {
			return true;
		}
	}

	window.isInIframe = inIframe();
	window.ShaderGraphExtractor = ShaderGraphExtractor;
	window.PannerDragger = PannerDragger;
	window.FileLoader = FileLoader;
	window.Blackboard = Blackboard;
	window.Inspector = Inspector;
	window.CryptoSuite = CryptoSuite;
	window.OverlaidForm = OverlaidForm;

	document.body.dataset['iframe'] = window.isInIframe ? '1' : '0';
})();

document.addEventListener('DOMContentLoaded', () => {

	let uploaderButton = document.getElementById('uploader-button');
	let uploaderElement = document.getElementById('uploader');
	let containerElement = document.querySelector('.container');
	let blackboardElement = document.getElementById('blackboard-container');
	let blackboardButton = document.getElementById('blackboard');
	let graphInspectorButton = document.getElementById('graph-inspector');
	let inspectorElement = document.getElementById('inspector');
	let zoomElement = document.getElementById('zoom');

	let cryptoSuite = CryptoSuite.initialize();
	let inspector = Inspector.initialize(inspectorElement, graphInspectorButton);
	let blackboard = Blackboard.initialize(blackboardElement, blackboardButton);
	let pannerDragger = PannerDragger.initialize(containerElement, zoomElement, blackboard, inspector);

	let embedder = OverlaidForm.initialize(
		document.getElementById('embed'),
		document.getElementById('embed-container'),
		() => {
			document.body.dataset['presenting'] = '0';
			pannerDragger.isPresenting = false;
		}
	);

	window.fileLoader = FileLoader.initialize(
		uploaderButton,
		uploaderElement,
		containerElement,
		blackboard,
		pannerDragger,
		inspector,
		cryptoSuite,
		embedder);
});
