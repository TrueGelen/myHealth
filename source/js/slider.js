window.addEventListener('load', () => {

	new GnativeCarousel({
		itemsContainer: '#itemsContainer',
		staticItem: '#staticItem',
		btnsContainer: '#sliderBtns',
		btnNext: '#sliderBtns-next',
		btnPrev: '#sliderBtns-prev',
		animationTime: 400,
		responsive: true,
		breakpoints: [1360, 1100, 768]
	}).createSlider()
})

class GnativeCarousel {
	constructor(settings) {
		this.defaultSettings = {
			animationTime: 300,
			itemsContainer: undefined,
			staticItem: undefined,
			btnsContainer: undefined,
			btnNext: undefined,
			btnPrev: undefined,
			responsive: false,
			breakpoints: [],
		}

		this.finalSettings = this.mergeSettings(this.defaultSettings, settings)

		//for rebuilding Slider on resize
		this.flagForRebuilding = null

		//table of virtual positions which is filled in the setTableOfPositions() {width, height, left, zIndex, invert}
		this.tableOfPositions = {}
		//{[actual position of item in array]: [virtual position]}. This is filled in setItemsMap()
		this.itemsMap = {}
		//This is filled in setTableOfSteps(). 
		//{stepWidth: { toPrev: null, toNext: null }, stepHeight: { ..., ...},stepLeft: {...,...},stepInvert:{...,...}
		this.tableOfSteps = {}
		//
		this.timeOptions = {
			animationTime: this.finalSettings.animationTime,
			interval: 5,
			perToRight: 20
		}

		//for swipe functions: getFirstTouch(), getTouchEnd(); and listeners in setEventListeners()
		this.firstTouchX = 0
		this.firstTouchY = 0

		//for the stack of calls
		this.stackNext = 0
		this.stackPrev = 0

		this.itemsContainer = document.querySelector(this.finalSettings.itemsContainer)
		this.staticItem = document.querySelector(this.finalSettings.staticItem)
		this.items = this.itemsContainer.children

		this.btnsContainer = document.querySelector(this.finalSettings.btnsContainer)
		this.btnNext = document.querySelector(this.finalSettings.btnNext)
		this.btnPrev = document.querySelector(this.finalSettings.btnPrev)
	}

	isNode(node) {
		return node && (node.nodeType === 1 || node.nodeType == 11)
	}

	getPropertyOfElement(element, property) {
		if (element.style[property] === '') {
			return element.currentStyle ? element.currentStyle[property] : getComputedStyle(element, null)[property]
		}
		else
			return element.style[property]
	}

	mergeSettings(defaultSettings, settings) {
		return Object.assign(defaultSettings, settings)
	}

	//reset all js style which were added to elements before new building on resize
	resetJsStyles() {
		this.staticItem.style.left = ''
		this.btnsContainer.style.zIndex = ''

		for (let i = 0; i < this.items.length; i++) {
			this.items[i].style.width = ''
			this.items[i].style.height = ''
			this.items[i].style.left = ''
			this.items[i].style.zIndex = ''
			this.items[i].style.filter = ''
		}
	}

	centeringTheStaticItem() {
		let containerWidth = this.itemsContainer.getBoundingClientRect().width
		const staticItemWidth = this.staticItem.getBoundingClientRect().width
		const left = ((containerWidth - staticItemWidth) / 2) / containerWidth * 100
		this.staticItem.style.left = `${left}%`
	}

	//for this.tableOfPositions
	setTableOfPositions() {
		const containerWidth = this.itemsContainer.getBoundingClientRect().width
		const containerHeight = this.itemsContainer.getBoundingClientRect().height

		//getting any element
		const itemWidth = this.items[0].getBoundingClientRect().width
		const mainElement = Math.floor(this.items.length / 2)
		this.btnsContainer.style.zIndex = `${mainElement + 3}`

		this.tableOfPositions[mainElement] = {
			width: itemWidth / containerWidth * 100,
			height: this.items[0].getBoundingClientRect().height / containerHeight * 100,
			left: ((containerWidth - itemWidth) / 2) / containerWidth * 100,
			zIndex: mainElement + 2,
			opacity: 1,
			invert: 0
		}

		for (let i = mainElement - 1; i >= 0; i--) {
			let width
			let height
			let left
			let zIndex = i + 1
			let invert

			//first part of positions
			if (mainElement - 1 === i) {
				this.staticItem.style.zIndex = mainElement + 1
				width = this.tableOfPositions[mainElement].width - (this.tableOfPositions[mainElement].width / 100 * 15)
				height = this.tableOfPositions[mainElement].height - (this.tableOfPositions[mainElement].height / 100 * 15)
				left = this.tableOfPositions[mainElement].left - (width / 100 * 60)
				invert = 0.05
			}
			else {
				width = this.tableOfPositions[i + 1].width - (this.tableOfPositions[i + 1].width / 100 * 5)
				height = this.tableOfPositions[i + 1].height - (this.tableOfPositions[i + 1].height / 100 * 5)
				left = this.tableOfPositions[i + 1].left - (width / 100 * 15)
				invert = this.tableOfPositions[i + 1].invert + 0.05
			}

			this.tableOfPositions[i] = { width, height, left, zIndex, invert }
		}

		//second part of positions
		for (let i = mainElement + 1; i < this.items.length; i++) {
			let width
			let height
			let left
			let zIndex = this.items.length - i
			let invert

			if (mainElement + 1 === i) {
				width = this.tableOfPositions[mainElement].width - (this.tableOfPositions[mainElement].width / 100 * 15)
				height = this.tableOfPositions[mainElement].height - (this.tableOfPositions[mainElement].height / 100 * 15)
				left = this.tableOfPositions[mainElement].left + this.tableOfPositions[mainElement].width - (width / 100 * 40)
				invert = 0.1
			}
			else {
				width = this.tableOfPositions[i - 1].width - (this.tableOfPositions[i - 1].width / 100 * 5)
				height = this.tableOfPositions[i - 1].height - (this.tableOfPositions[i - 1].height / 100 * 5)
				left = this.tableOfPositions[i - 1].left + this.tableOfPositions[i - 1].width - (width / 100 * 85)
				invert = this.tableOfPositions[i - 1].invert + 0.1
			}

			this.tableOfPositions[i] = { width, height, left, zIndex, invert }
		}

		console.log('setTableOfPosition', this.tableOfPositions)
	}

	//for this.itemsMap
	setItemsMap() {
		for (let i = 0; i < this.items.length; i++) {
			this.itemsMap[i] = i
		}
		console.log('setItemsMap', this.itemsMap)
	}

	//for this.tableOfSteps
	setTableOfSteps() {
		const countOfSteps = this.timeOptions.animationTime / this.timeOptions.interval
		for (let i = 0; i < this.items.length; i++) {
			let buffer = {
				stepWidth: { toPrev: null, toNext: null },
				stepHeight: { toPrev: null, toNext: null },
				stepLeft: { toPrev: null, toNext: null },
				stepInvert: { toPrev: null, toNext: null }
			}

			if (i === 0) {
				buffer.stepWidth.toPrev = (this.tableOfPositions[i + 1].width - this.tableOfPositions[i].width) / countOfSteps
				buffer.stepWidth.toNext = false
				buffer.stepHeight.toPrev = (this.tableOfPositions[i + 1].height - this.tableOfPositions[i].height) / countOfSteps
				buffer.stepHeight.toNext = false
				buffer.stepInvert.toPrev = (this.tableOfPositions[i + 1].invert - this.tableOfPositions[i].invert) / countOfSteps
				buffer.stepInvert.toNext = false
				buffer.stepLeft.toPrev = (this.tableOfPositions[i + 1].left - this.tableOfPositions[i].left) / countOfSteps
				buffer.stepLeft.toNext = (this.tableOfPositions[this.items.length - 1].left - this.tableOfPositions[0].left) / countOfSteps
			} else if (i === this.items.length - 1) {
				buffer.stepWidth.toPrev = false
				buffer.stepWidth.toNext = (this.tableOfPositions[i - 1].width - this.tableOfPositions[i].width) / countOfSteps
				buffer.stepHeight.toPrev = false
				buffer.stepHeight.toNext = (this.tableOfPositions[i - 1].height - this.tableOfPositions[i].height) / countOfSteps
				buffer.stepInvert.toPrev = false
				buffer.stepInvert.toNext = (this.tableOfPositions[i - 1].invert - this.tableOfPositions[i].invert) / countOfSteps
				buffer.stepLeft.toPrev = (this.tableOfPositions[0].left - this.tableOfPositions[i].left) / countOfSteps
				buffer.stepLeft.toNext = (this.tableOfPositions[i - 1].left - this.tableOfPositions[i].left) / countOfSteps
			} else {
				buffer.stepWidth.toPrev = (this.tableOfPositions[i + 1].width - this.tableOfPositions[i].width) / countOfSteps
				buffer.stepWidth.toNext = (this.tableOfPositions[i - 1].width - this.tableOfPositions[i].width) / countOfSteps
				buffer.stepHeight.toPrev = (this.tableOfPositions[i + 1].height - this.tableOfPositions[i].height) / countOfSteps
				buffer.stepHeight.toNext = (this.tableOfPositions[i - 1].height - this.tableOfPositions[i].height) / countOfSteps
				buffer.stepInvert.toPrev = (this.tableOfPositions[i + 1].invert - this.tableOfPositions[i].invert) / countOfSteps
				buffer.stepInvert.toNext = (this.tableOfPositions[i - 1].invert - this.tableOfPositions[i].invert) / countOfSteps
				buffer.stepLeft.toPrev = (this.tableOfPositions[i + 1].left - this.tableOfPositions[i].left) / countOfSteps
				buffer.stepLeft.toNext = (this.tableOfPositions[i - 1].left - this.tableOfPositions[i].left) / countOfSteps
			}
			this.tableOfSteps[i] = buffer
		}

		console.log('setTableOfSteps', this.tableOfSteps)
	}

	//building actual elements into virtual positions by tableOfPosition
	alignmentOfItems() {
		for (let i = 0; i < this.items.length; i++) {
			this.items[i].style.width = `${this.tableOfPositions[i].width}%`
			this.items[i].style.height = `${this.tableOfPositions[i].height}%`
			this.items[i].style.left = `${this.tableOfPositions[i].left}%`
			this.items[i].style.zIndex = `${this.tableOfPositions[i].zIndex}`
			this.items[i].style.filter = `invert(${this.tableOfPositions[i].invert})`
		}
	}

	animationBehavior(direction) {
		return new Promise((resolve) => {
			//changing virtual positions numbers for actual elements in itemsMap after animation
			//and setting items on correct virtual positions
			const callback = (direction) => {
				if (direction === 'toPrev') {
					let firstForLast = this.itemsMap[0];
					for (let i = 0; i < this.items.length; i++) {
						(i === (this.items.length - 1)) ? this.itemsMap[i] = firstForLast : this.itemsMap[i] = this.itemsMap[i + 1]
					}
				} else {
					let lastForFirst = this.itemsMap[this.items.length - 1]
					for (let i = this.items.length - 1; i >= 0; i--) {
						(i === 0) ? this.itemsMap[i] = lastForFirst : this.itemsMap[i] = this.itemsMap[i - 1]
					}
				}
				console.log('animationBehavior itemsMap{fact: virt}: ', this.itemsMap)

				for (let i = 0; i < this.items.length; i++) {
					this.items[i].style.width = `${this.tableOfPositions[this.itemsMap[i]].width}%`
					this.items[i].style.height = `${this.tableOfPositions[this.itemsMap[i]].height}%`
					this.items[i].style.left = `${this.tableOfPositions[this.itemsMap[i]].left}%`
					this.items[i].style.zIndex = `${this.tableOfPositions[this.itemsMap[i]].zIndex}`
					this.items[i].style.filter = `invert(${this.tableOfPositions[this.itemsMap[i]].invert})`
				}
			}

			//variable for start and stop setInterval
			let startAnimate

			const amountOfSteps = this.timeOptions.animationTime / this.timeOptions.interval
			//current step number
			let numberOfStep = 0
			//number of main element(element which stays in center upon reload)
			const mainElement = Math.floor(this.items.length / 2)

			const numOfMissedSteps = Math.round(amountOfSteps / 100 * this.timeOptions.perToRight)
			const numOfRemainingSteps = amountOfSteps / 100 * (100 - this.timeOptions.perToRight)

			const plusWidth = this.tableOfSteps[mainElement - 1].stepWidth[direction] * numOfMissedSteps / numOfRemainingSteps
			const plusHeight = this.tableOfSteps[mainElement - 1].stepHeight[direction] * numOfMissedSteps / numOfRemainingSteps

			const hiddenWidth = this.tableOfPositions[mainElement - 1].width / 100 * 40
			const stepLeftToRight = hiddenWidth / (amountOfSteps / 100 * this.timeOptions.perToRight)

			//for changing zIndex for only one time in setInterval
			let zIndexFlag = false

			//function that make non linear animation
			const trajectoryChanger = (i, direction) => {
				//non linear animation for elements which are next to main element
				if (this.itemsMap[i] === mainElement - 1 || this.itemsMap[i] === mainElement + 1) {
					//if we are going back
					if (direction === 'toPrev' && this.itemsMap[i] === mainElement - 1) {
						if (numberOfStep < numOfMissedSteps) {
							this.items[i].style.left = `${parseFloat(this.items[i].style.left) + (stepLeftToRight * -1)}%`
						} else {
							if (!zIndexFlag) {
								this.items[i].style.zIndex = mainElement + 2
								this.items[i === this.items.length - 1 ? 0 : i + 1].style.zIndex = mainElement + 1
								zIndexFlag = true
							}
							//product of all missed steps + sum of hidden width an element / remaining steps
							let plusToLeft = ((this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] * numOfMissedSteps + hiddenWidth) / numOfRemainingSteps)
							this.items[i].style.left = `${parseFloat(this.items[i].style.left) + (this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] + plusToLeft)}%`
							this.items[i].style.width = `${parseFloat(this.items[i].style.width) + this.tableOfSteps[this.itemsMap[i]].stepWidth[direction] + plusWidth}%`
							this.items[i].style.height = `${parseFloat(this.items[i].style.height) + this.tableOfSteps[this.itemsMap[i]].stepHeight[direction] + plusHeight}%`
						}
						//if we are going forward 
					} else if (direction === 'toNext' && this.itemsMap[i] === mainElement + 1) {
						if (numberOfStep < numOfMissedSteps) {
							this.items[i].style.left = `${parseFloat(this.items[i].style.left) + stepLeftToRight}%`
						} else {
							if (!zIndexFlag) {
								this.items[i].style.zIndex = mainElement + 2
								this.items[i === 0 ? this.items.length - 1 : i - 1].style.zIndex = mainElement + 1
								zIndexFlag = true
							}
							let plusToLeft = ((Math.abs(this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] * numOfMissedSteps) + hiddenWidth) / numOfRemainingSteps) * -1
							this.items[i].style.left = `${parseFloat(this.items[i].style.left) + (this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] + plusToLeft)}%`
							this.items[i].style.width = `${parseFloat(this.items[i].style.width) + this.tableOfSteps[this.itemsMap[i]].stepWidth[direction] + plusWidth}%`
							this.items[i].style.height = `${parseFloat(this.items[i].style.height) + this.tableOfSteps[this.itemsMap[i]].stepHeight[direction] + plusHeight}%`
						}
					} else {
						this.items[i].style.width = `${parseFloat(this.items[i].style.width) + this.tableOfSteps[this.itemsMap[i]].stepWidth[direction]}%`
						this.items[i].style.height = `${parseFloat(this.items[i].style.height) + this.tableOfSteps[this.itemsMap[i]].stepHeight[direction]}%`
						this.items[i].style.left = `${parseFloat(this.items[i].style.left) + this.tableOfSteps[this.itemsMap[i]].stepLeft[direction]}%`
					}
					//linear animation for elements which aren't next to main element
				} else
					this.items[i].style.left = `${parseFloat(this.items[i].style.left) + this.tableOfSteps[this.itemsMap[i]].stepLeft[direction]}%`
			}

			//animation function
			const animation = (direction) => {
				numberOfStep++
				for (let i = 0; i < this.items.length; i++) {
					if (!(this.itemsMap[i] === mainElement - 1) && !(this.itemsMap[i] === mainElement + 1)) {
						// console.log(i)
						this.items[i].style.width = `${parseFloat(this.items[i].style.width) + this.tableOfSteps[this.itemsMap[i]].stepWidth[direction]}%`
						this.items[i].style.height = `${parseFloat(this.items[i].style.height) + this.tableOfSteps[this.itemsMap[i]].stepHeight[direction]}%`
					}

					//todo may be it also needs change
					// this.items[i].style.filter = `invert(${parseInt(this.items[i].style.filter) + this.tableOfSteps[i].invert[direction]})`

					trajectoryChanger(i, direction)

					//changing zIndex on the fly for an element which is last in tableOfPositions
					if ((numberOfStep === amountOfSteps / 2) && this.itemsMap[i] === this.items.length - 1 && direction === 'toPrev') {
						this.items[i].style.zIndex = '0'
					}
					//changing zIndex on the fly for an element which is first in tableOfPositions
					if ((numberOfStep === amountOfSteps / 2) && this.itemsMap[i] === 0 && direction === 'toNext') {
						this.items[i].style.zIndex = '0'
					}

				}

				//if current step >= amount of steps, we stop animation and call callback function
				if (numberOfStep >= amountOfSteps) {
					clearInterval(startAnimate)
					callback(direction)
					resolve()
				}
			}
			//start of animation
			startAnimate = setInterval(() => { animation(direction) }, 5)
		})
	}

	createSlider() {
		this.centeringTheStaticItem()
		this.setTableOfPositions()
		this.setItemsMap()
		this.setTableOfSteps()
		this.alignmentOfItems()
		this.setEventListeners()
	}

	async stackWatcher() {
		if (this.stackNext > 0) {
			await this.animationBehavior('toNext')
			this.stackNext--
			this.stackWatcher()
		} else if (this.stackPrev > 0) {
			await this.animationBehavior('toPrev')
			this.stackPrev--
			this.stackWatcher()
		}
	}

	//increase stack of calls for a next slide and then call stackWatcher()
	createClickNext = () => {
		this.stackNext++
		if (this.stackNext === 1 && this.stackPrev === 0) {
			this.stackWatcher()
		}

		if (this.stackPrev !== 0)
			this.stackPrev = 1
	}

	//increase stack of calls for a prev slide and then call stackWatcher()
	createClickPrev = () => {
		this.stackPrev++
		if (this.stackPrev === 1 && this.stackNext === 0) {
			this.stackWatcher()
		}

		if (this.stackNext !== 0)
			this.stackNext = 1
	}

	/*== touch event for mobile ==*/
	getFirstTouch = (e) => {
		this.itemsContainer.addEventListener('touchend', this.getTouchEnd)
		this.firstTouchX = e.touches[0].clientX
		this.firstTouchY = e.touches[0].clientY
		this.itemsContainer.removeEventListener('touchstart', this.getFirstTouch)
	}

	getTouchEnd = async (e) => {
		this.itemsContainer.removeEventListener('touchend', this.getTouchEnd)
		let direction = (Math.abs(this.firstTouchX - e.changedTouches[0].clientX) > Math.abs(this.firstTouchY - e.changedTouches[0].clientY))

		if (direction)
			if (this.firstTouchX > e.changedTouches[0].clientX)
				await this.animationBehavior('toNext')
			else
				await this.animationBehavior('toPrev')

		this.itemsContainer.addEventListener('touchstart', this.getFirstTouch)
	}
	/*== touch event for mobile ==*/

	setEventListeners() {
		//if slider is responsive
		if (this.finalSettings.responsive) {
			window.addEventListener('resize', () => {
				for (let i = this.finalSettings.breakpoints.length - 1; i >= 0; i--) {
					if (this.finalSettings.breakpoints[i] > window.innerWidth) {
						if (this.flagForRebuilding !== this.finalSettings.breakpoints[i].toString()) {
							this.flagForRebuilding = this.finalSettings.breakpoints[i].toString()
							this.resetJsStyles()
							this.createSlider()
							return false
						}
						if (this.flagForRebuilding === this.finalSettings.breakpoints[i].toString()) {
							return false
						}
					} else if (i === 0 && this.flagForRebuilding !== 'large') {
						this.flagForRebuilding = 'large'
						this.resetJsStyles()
						this.createSlider()
						return true
					}
				}
			})
		}

		this.itemsContainer.addEventListener('touchstart', this.getFirstTouch)
		this.itemsContainer.addEventListener('touchend', this.getTouchEnd)

		if (this.isNode(this.btnNext) && this.isNode(this.btnPrev)) {
			this.btnNext.addEventListener('click', this.createClickNext)

			this.btnPrev.addEventListener('click', this.createClickPrev)
		}
	}
}