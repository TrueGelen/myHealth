import regeneratorRuntime from 'regenerator-runtime'

window.addEventListener('load', () => {
	console.log('headerAnimations.js is working')

	/* global variables */
	//to disable/enable the ability to start animation on click
	let switchFlag = false

	const android = {}
	android.switcher = document.querySelector('#header_android')
	android.circle = android.switcher.querySelector('div');
	android.text = android.switcher.querySelector('p');
	android.phone = document.querySelector('#headerPhones_phone-android')
	android.isShow = true
	android.name = 'android'

	const ios = {}
	ios.switcher = document.querySelector('#header_ios')
	ios.circle = ios.switcher.querySelector('div')
	ios.text = ios.switcher.querySelector('p')
	ios.phone = document.querySelector('#headerPhones_phone-ios')
	ios.isShow = false
	ios.name = 'ios'

	const showOptions = {
		width: null,
		height: null,
		fontWeight: 'bold',
		background: '#757575',
		right: null,
		top: null
	}

	const hideOptions = {
		width: null,
		height: null,
		fontWeight: 'normal',
		background: 'none',
		right: null,
		top: null
	}

	/* function calls and adding eventListeners */
	onLoad()

	window.addEventListener('resize', () => {
		switchFlag = false
		resetJsStyles()
		onLoad()
	})

	// android.switcher.addEventListener('click', doSlide(android, ios))
	ios.switcher.addEventListener('click', async () => {
		if (!switchFlag && !ios.isShow) {
			switchFlag = true
			await doSlide(ios, android, ios.switcher)
			switchFlag = false
		}
	})

	ios.phone.addEventListener('click', async () => {
		if (!switchFlag && !ios.isShow) {
			switchFlag = true
			await doSlide(ios, android, ios.switcher)
			switchFlag = false
		}
	})

	android.switcher.addEventListener('click', async () => {
		if (!switchFlag && !android.isShow) {
			switchFlag = true
			await doSlide(android, ios, android.switcher)
			switchFlag = false
		}
	})

	android.phone.addEventListener('click', async () => {
		if (!switchFlag && !android.isShow) {
			switchFlag = true
			await doSlide(android, ios, android.switcher)
			switchFlag = false
		}
	})

	/* functions declaration */
	function getOptions() {
		//for getting width, height and margin in vw
		const widthOfScreen = window.innerWidth

		//for getting showOptions and hideOptions
		if (android.phone.getBoundingClientRect().width > ios.phone.getBoundingClientRect().width) {
			setSize(ios.phone, 'hide')
			setSize(android.phone, 'show')
			showOptions.right = parseInt(getPropertyOfElement(android.phone, 'right')) / widthOfScreen * 100
			hideOptions.right = parseInt(getPropertyOfElement(ios.phone, 'right')) / widthOfScreen * 100
			showOptions.top = parseInt(getPropertyOfElement(android.phone, 'top')) / widthOfScreen * 100
			hideOptions.top = parseInt(getPropertyOfElement(ios.phone, 'top')) / widthOfScreen * 100
			android.isShow = true
			ios.isShow = false
		}
		else {
			setSize(android.phone, 'hide')
			setSize(ios.phone, 'show')
			showOptions.right = parseInt(getPropertyOfElement(ios.phone, 'right')) / widthOfScreen * 100
			hideOptions.right = parseInt(getPropertyOfElement(android.phone, 'right')) / widthOfScreen * 100
			showOptions.top = parseInt(getPropertyOfElement(ios.phone, 'top')) / widthOfScreen * 100
			hideOptions.top = parseInt(getPropertyOfElement(android.phone, 'top')) / widthOfScreen * 100
			ios.isShow = true
			android.isShow = false
		}

		//setting size(width, height) to showOptions and hideOptions
		function setSize(phone, mod) {
			const width = phone.getBoundingClientRect().width
			const height = phone.getBoundingClientRect().height

			if (mod === 'show') {
				showOptions.width = width / widthOfScreen * 100
				showOptions.height = height / widthOfScreen * 100
			}
			else {
				hideOptions.width = width / widthOfScreen * 100
				hideOptions.height = height / widthOfScreen * 100
			}
		}

		//helper function(for getting margin)
		function getPropertyOfElement(element, property) {
			if (element.style[property] === '') {
				return element.currentStyle ? element.currentStyle[property] : getComputedStyle(element, null)[property]
			}
			else
				return element.style[property]
		}
	}

	function doSlide(selectedPhone, anotherPhone, context) {
		return new Promise((resolve) => {
			let flag = false
			const timeSettings = {
				speedOfStepRight: 1.5,
				interval: 5,
				time: 350
			}
			let startAnimate
			const forShow = {
				stepW: hideOptions.width,
				stepH: hideOptions.height,
				stepR: hideOptions.right,
				stepT: hideOptions.top
			}

			const forHide = {
				stepW: showOptions.width,
				stepH: showOptions.height,
				stepR: showOptions.right,
				stepT: showOptions.top
			}

			if (!selectedPhone.isShow) {

				const stepWidth = (showOptions.width - hideOptions.width) / (timeSettings.time / timeSettings.interval)
				const stepHeight = (showOptions.height - hideOptions.height) / (timeSettings.time / timeSettings.interval)
				const stepRight = ((hideOptions.right - showOptions.right) / (timeSettings.time / timeSettings.interval)) * timeSettings.speedOfStepRight
				const stepTop = (hideOptions.top - showOptions.top) / (timeSettings.time / timeSettings.interval)
				startAnimate = setInterval(() => {
					animate({
						stepWidth,
						stepHeight,
						stepRight,
						stepTop,
						selectedPhone,
						anotherPhone
					})
				}, timeSettings.interval)
			}

			function animateCallback(selectedPhone, anotherPhone) {
				flag = false
				selectedPhone.phone.style.right = `${showOptions.right}vw`
				selectedPhone.phone.style.top = `-${showOptions.top}vw`
				selectedPhone.phone.style.width = `${showOptions.width}vw`
				selectedPhone.phone.style.height = `${showOptions.height}vw`

				anotherPhone.phone.style.right = `${hideOptions.right}vw`
				anotherPhone.phone.style.top = `${hideOptions.top}vw`
				anotherPhone.phone.style.width = `${hideOptions.width}vw`
				anotherPhone.phone.style.height = `${hideOptions.height}vw`


				selectedPhone.isShow = true
				anotherPhone.isShow = false


				selectedPhone.circle.style.background = showOptions.background
				selectedPhone.text.style.fontWeight = showOptions.fontWeight
				anotherPhone.circle.style.background = hideOptions.background
				anotherPhone.text.style.fontWeight = hideOptions.fontWeight
			}

			function animate({
				stepWidth,
				stepHeight,
				stepRight,
				stepTop,
				selectedPhone,
				anotherPhone
			}) {
				(() => {
					forShow.stepW += stepWidth
					forShow.stepH += stepHeight
					forHide.stepW -= stepWidth
					forHide.stepH -= stepHeight

					forHide.stepT += stepTop
					forShow.stepT -= stepTop

					if (forHide.stepR <= (hideOptions.right + ((timeSettings.speedOfStepRight - 1) / 2 * hideOptions.right)) && !flag) {
						forHide.stepR += stepRight
						forShow.stepR -= stepRight
					}
					else {
						if (!flag) {
							selectedPhone.phone.style.zIndex = 2
							anotherPhone.phone.style.zIndex = 1
							flag = true
						}
						forHide.stepR -= stepRight
						forShow.stepR += stepRight
					}

					selectedPhone.phone.style.right = `${forShow.stepR}vw`
					selectedPhone.phone.style.top = `${forShow.stepT}vw`
					selectedPhone.phone.style.width = `${forShow.stepW}vw`
					selectedPhone.phone.style.height = `${forShow.stepH}vw`

					anotherPhone.phone.style.top = `${forHide.stepT}vw`
					anotherPhone.phone.style.right = `${forHide.stepR}vw`
					anotherPhone.phone.style.width = `${forHide.stepW}vw`
					anotherPhone.phone.style.height = `${forHide.stepH}vw`
				})()

				if (forShow.stepT <= showOptions.top) {
					clearInterval(startAnimate)
					animateCallback(selectedPhone, anotherPhone)
					resolve()
				}
			}
		})
	}

	function setSwitchOptions() {
		if (android.isShow) {
			android.circle.style.background = showOptions.background
			android.text.style.fontWeight = showOptions.fontWeight
			ios.circle.style.background = hideOptions.background
			ios.text.style.fontWeight = hideOptions.fontWeight
		}
		else {
			ios.circle.style.background = showOptions.background
			ios.text.style.fontWeight = showOptions.fontWeight
			android.circle.style.background = hideOptions.background
			android.text.style.fontWeight = hideOptions.fontWeight
		}
	}

	function resetJsStyles() {
		android.phone.style.right = ''
		android.phone.style.top = ''
		android.phone.style.width = ''
		android.phone.style.height = ''
		android.phone.style.zIndex = ''
		ios.phone.style.right = ''
		ios.phone.style.top = ''
		ios.phone.style.width = ''
		ios.phone.style.height = ''
		ios.phone.style.zIndex = ''
	}

	function onLoad() {
		getOptions()
		setSwitchOptions()
	}
})