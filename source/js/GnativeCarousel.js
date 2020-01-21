export default class GnativeCarousel {
	constructor(settings) {
		this.defaultSettings = {
			animationTime: 300,
			sliderContainer: undefined,
			itemsContainer: undefined,
			staticItem: undefined,
			btnsContainer: undefined,
			btnNext: undefined,
			btnPrev: undefined,
			mainElement: {
				class: undefined,
				keepOrder: false
			},
			itemsOnSide: 3,
			adaptive: false,
			responsive: true,
			breakpoints: undefined,
		}

		this.finalSettings = this.mergeSettings(this.defaultSettings, settings)

		//for rebuilding Slider on resize
		this.flagForRebuilding = 'large'

		//table of virtual positions which is filled in the setTableOfPositions() {width, height, left, zIndex, invert}
		this.tableOfPositions = {}
		//{[actual position of item in array]: [virtual position]}. This is filled in setItemsMap()
		this.itemsMap = {}
		//This is filled in setTableOfSteps(). 
		//{stepWidth: { toPrev: null, toNext: null }, stepHeight: { ..., ...},stepLeft: {...,...},stepInvert:{...,...}
		this.tableOfSteps = {}
		//time options for animation. It uses in this.animationBehavior()
		this.timeOptions = {
			animationTime: this.finalSettings.animationTime,
			interval: 5,
			perToRight: 20
		}

		//setResponsiveOptions
		this.responsiveOptions = {
			responsive: !this.finalSettings.adaptive,
			adaptive: this.finalSettings.adaptive,
			itemsOnSide: this.finalSettings.itemsOnSide
		}

		//for responsive swipe on a mouse and a touch event
		this.startPosition = null
		this.animation = {
			currentStep: null,
			leftX: null,
			widthX: null,
			heightX: null,
			inAnimationFlag: false,
			reverseFlag: false
		}

		//for the stack of calls
		this.stackNext = 0
		this.stackPrev = 0

		//it sets in setSliderHeight() setSliderWidth()
		this.sizeOfSliderContainer = {
			height: null,
			width: null
		}

		this.sliderContainer = document.querySelector(this.finalSettings.sliderContainer)
		this.itemsContainer = document.querySelector(this.finalSettings.itemsContainer)
		this.staticItem = document.querySelector(this.finalSettings.staticItem)
		this.items = this.itemsContainer.children

		this.btnsContainer = document.querySelector(this.finalSettings.btnsContainer)
		this.btnNext = document.querySelector(this.finalSettings.btnNext)
		this.btnPrev = document.querySelector(this.finalSettings.btnPrev)
	}

	doSlide(element, direction) {
		if (direction === 'next')
			element.addEventListener('click', () => {
				this.createClickNext()
			})
		else if (direction === 'prev')
			element.addEventListener('click', () => {
				this.createClickPrev()
			})
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
		let final = Object.assign(defaultSettings, settings)

		if (final.breakpoints !== undefined) {
			const arrOfPoints = Object.keys(final.breakpoints)
			let firstOptions = { responsive: final.responsive, adaptive: final.adaptive, itemsOnSide: final.itemsOnSide }
			for (let i = arrOfPoints.length - 1; i >= 0; i--) {
				if (i === arrOfPoints.length - 1) {
					final.breakpoints[arrOfPoints[i]].adaptive = final.breakpoints[arrOfPoints[i]].adaptive ? final.breakpoints[arrOfPoints[i]].adaptive : firstOptions.adaptive
					final.breakpoints[arrOfPoints[i]].responsive = !final.breakpoints[arrOfPoints[i]].adaptive
					final.breakpoints[arrOfPoints[i]].itemsOnSide = final.breakpoints[arrOfPoints[i]].itemsOnSide ? final.breakpoints[arrOfPoints[i]].itemsOnSide : firstOptions.itemsOnSide
				} else {
					if (final.breakpoints[arrOfPoints[i]].adaptive || final.breakpoints[arrOfPoints[i]].responsive) {
						if (final.breakpoints[arrOfPoints[i]].adaptive) {
							final.breakpoints[arrOfPoints[i]].adaptive = final.breakpoints[arrOfPoints[i]].adaptive
							final.breakpoints[arrOfPoints[i]].responsive = !final.breakpoints[arrOfPoints[i]].adaptive
						} else {
							final.breakpoints[arrOfPoints[i]].responsive = final.breakpoints[arrOfPoints[i]].responsive
							final.breakpoints[arrOfPoints[i]].adaptive = !final.breakpoints[arrOfPoints[i]].responsive
						}
					} else {
						final.breakpoints[arrOfPoints[i]].adaptive = final.breakpoints[arrOfPoints[i + 1]].adaptive
						final.breakpoints[arrOfPoints[i]].responsive = final.breakpoints[arrOfPoints[i + 1]].responsive
					}
					final.breakpoints[arrOfPoints[i]].itemsOnSide = final.breakpoints[arrOfPoints[i]].itemsOnSide ? final.breakpoints[arrOfPoints[i]].itemsOnSide : final.breakpoints[arrOfPoints[i + 1]].itemsOnSide
				}
			}
		}
		return final
	}

	setResponsiveOptions() {
		for (let point in this.finalSettings.breakpoints) {
			if (window.innerWidth < parseInt(point)) {
				this.responsiveOptions = Object.assign(this.responsiveOptions, this.finalSettings.breakpoints[point])
				this.flagForRebuilding = point
				return true
			}
		}
		this.responsiveOptions = {
			responsive: !this.finalSettings.adaptive,
			adaptive: this.finalSettings.adaptive,
			itemsOnSide: this.finalSettings.itemsOnSide
		}
	}

	buildMainElement() {
		if (typeof this.finalSettings.mainElement.class === 'string') {
			const classNm = (this.finalSettings.mainElement.class[0] === '.') ? this.finalSettings.mainElement.class : `.${this.finalSettings.mainElement.class}`
			const mainElem = this.itemsContainer.querySelector(classNm)

			if (this.isNode(mainElem)) {
				const indexOfMaintEl = Math.floor(this.items.length / 2)

				if (this.finalSettings.mainElement.keepOrder) {
					let i = (indexOfMaintEl === this.items.length / 2) ? 1 : 0
					while (i <= indexOfMaintEl) {
						this.itemsContainer.append(this.items[0])
						i++
					}

				} else {
					this.items[indexOfMaintEl].after(mainElem)
				}
			}
		}
	}

	makeBoxSizing() {
		if (this.getPropertyOfElement(this.sliderContainer, 'box-sizing') !== 'border-box')
			this.sliderContainer.style.boxSizing = 'border-box'
	}

	//function for finding a biggest inner element and define height of the slider and
	//set a value for the this.sizeOfSliderContainer object
	//it needs for finding mistakes with sizes, both in the slider and outside it
	//and set a height of a parent if the slider has position absolute in function setParentHeight()
	setSliderHeight() {
		const getBiggestInnerElement = (...elems) => {

			let elem = { sum: 0 }

			elems.forEach(nodeElem => {
				if (this.isNode(nodeElem)) {
					const boxShadow = isNaN(parseInt(this.getPropertyOfElement(nodeElem, 'box-shadow').split('px ')[2]) * 2) ?
						0 :
						parseInt(this.getPropertyOfElement(nodeElem, 'box-shadow').split('px ')[2]) * 2

					const height = parseInt(this.getPropertyOfElement(nodeElem, 'height'))

					const sum = boxShadow + height

					if ((typeof boxShadow === 'number' && !isNaN(boxShadow)) && (typeof height === 'number' && !isNaN(height)))
						if (sum > elem.sum)
							elem = { boxShadow, height, sum: boxShadow + height }
				}
			})

			return elem
		}

		//finding actual height of the slider
		const sliderPaddingY = parseInt(this.getPropertyOfElement(this.sliderContainer, 'padding-top'))
			+ parseInt(this.getPropertyOfElement(this.sliderContainer, 'padding-bottom'))
		const sliderBorderY = parseInt(this.getPropertyOfElement(this.sliderContainer, 'border-top'))
			+ parseInt(this.getPropertyOfElement(this.sliderContainer, 'border-bottom'))
		const calculatedHeight = parseInt(this.getPropertyOfElement(this.sliderContainer, 'height'))
		const sliderHeight = (calculatedHeight <= sliderPaddingY + sliderBorderY) ?
			calculatedHeight - (sliderPaddingY + sliderBorderY) :
			calculatedHeight

		//determine a biggestElem
		const biggestElem = getBiggestInnerElement(this.staticItem, this.items[0])

		if (sliderHeight < biggestElem.sum) {
			if (sliderHeight < biggestElem.height && sliderHeight !== 0) {
				throw new Error("a height of biggest inner element of slider is bigger then slider's height")
			} else {
				this.sizeOfSliderContainer.height = biggestElem.sum
				const height = this.responsiveOptions.responsive ? `${biggestElem.sum / (window.innerWidth / 100)}vw` :
					`${biggestElem.sum}px`
				this.sliderContainer.style.height = height
			}
		}
	}

	setSliderWidth() {
		//static item
		const staticItemWidth = parseInt(this.getPropertyOfElement(this.staticItem, 'width'))
		const staticItemBoxShadow = isNaN(parseInt(this.getPropertyOfElement(this.staticItem, 'box-shadow').split('px ')[2]) * 2) ?
			0 :
			parseInt(this.getPropertyOfElement(this.staticItem, 'box-shadow').split('px ')[2]) * 2
		const sumWidthOfStaticItem = staticItemWidth + staticItemBoxShadow

		//items container
		let itemWidth = this.items[0].getBoundingClientRect().width
		itemWidth = itemWidth - (itemWidth / 100 * 15)

		let itemsContainerWidth = itemWidth / 100 * 60 + this.items[0].getBoundingClientRect().width / 2
		for (let i = 0; i < this.responsiveOptions.itemsOnSide - 1; i++) {
			itemWidth = itemWidth - (itemWidth / 100 * 5)
			itemsContainerWidth += itemWidth / 100 * 15
		}
		itemsContainerWidth = itemsContainerWidth * 2

		//get biggest width
		const biggestWidth = Math.max(sumWidthOfStaticItem, itemsContainerWidth)

		//set width to slider container and set width to this.sizeOfSliderContainer
		this.sizeOfSliderContainer.width = biggestWidth
		const width = this.responsiveOptions.responsive ? `${biggestWidth / (window.innerWidth / 100)}vw` :
			`${biggestWidth}px`
		this.sliderContainer.style.width = width
	}

	setParentHeight() {
		if (this.getPropertyOfElement(this.sliderContainer, 'position') === 'absolute') {
			const heightOfParent = this.getPropertyOfElement(this.sliderContainer.parentNode, 'height')
			const heightOfSlider = this.sizeOfSliderContainer.height
			if (parseInt(heightOfParent) < heightOfSlider && this.responsiveOptions.responsive) {
				if (parseInt(heightOfParent) !== 0) {
					console.error(`The parent of the slider has a height which is less than the height of the slider. The parent height was changed to "${heightOfSlider / (window.innerWidth / 100)}vw", and min-height was changed to "${heightOfParent}"`)
					this.sliderContainer.parentNode.style.minHeight = heightOfParent
				}
				this.sliderContainer.parentNode.style.height = `${heightOfSlider / (window.innerWidth / 100)}vw`
			}
			else if (parseInt(heightOfParent) < heightOfSlider && !this.responsiveOptions.responsive) {
				if (parseInt(heightOfParent) !== 0) {
					console.error(`The parent of the slider has a height which is less than the height of the slider. The parent height was changed to "${heightOfSlider}px", and min-height was changed to "${heightOfParent}"`)
					this.sliderContainer.parentNode.style.minHeight = heightOfParent
				}
				this.sliderContainer.parentNode.style.height = `${heightOfSlider}px`
			}
		}
	}

	//reset all js style which were added to elements before new building on resize
	resetJsStyles() {
		//for staticItem [left, top, width, height]
		this.staticItem.style.left = ''
		this.staticItem.style.top = ''
		this.staticItem.style.width = ''
		this.staticItem.style.height = ''

		//for btnsContainer [zIndex]
		this.btnsContainer.style.zIndex = ''

		//for parent of slider [height, minHeight]
		this.sliderContainer.parentNode.style.height = ''
		this.sliderContainer.parentNode.style.minHeight = ''

		//fot slider container [height, width]
		this.sliderContainer.style.height = ''
		this.sliderContainer.style.width = ''

		//for items [width, height, left, zIndex, filter, cursor]
		for (let i = 0; i < this.items.length; i++) {
			this.items[i].style.width = ''
			this.items[i].style.height = ''
			this.items[i].style.left = ''
			this.items[i].style.zIndex = ''
			this.items[i].style.filter = ''
			this.items[i].style.cursor = ''
		}
	}

	centeringTheStaticItem() {
		const containerWidth = this.sizeOfSliderContainer.width
		const staticItemWidth = this.staticItem.getBoundingClientRect().width
		const left = ((containerWidth - staticItemWidth) / 2) / containerWidth * 100
		this.staticItem.style.left = `${left}%`

		const containerHeight = this.sizeOfSliderContainer.height
		const staticItemHeight = this.staticItem.getBoundingClientRect().height
		const top = ((containerHeight - staticItemHeight) / 2) / containerHeight * 100
		this.staticItem.style.top = `${top}%`

		//set width and height
		const height = `${staticItemHeight / containerHeight * 100}%`
		const width = `${staticItemWidth / containerWidth * 100}%`
		this.staticItem.style.height = height
		this.staticItem.style.width = width
	}

	//for this.tableOfPositions and sizes
	setTableOfPositions() {
		const containerWidth = this.sizeOfSliderContainer.width
		const containerHeight = this.sizeOfSliderContainer.height

		//getting any element
		const itemWidth = this.items[0].getBoundingClientRect().width//?
		const mainElement = Math.floor(this.items.length / 2)

		//todo rewrite it in the its own function
		this.btnsContainer.style.zIndex = `${mainElement + this.responsiveOptions.itemsOnSide}`

		this.tableOfPositions[mainElement] = {
			width: itemWidth / containerWidth * 100, //?
			height: this.items[0].getBoundingClientRect().height / containerHeight * 100,
			left: ((containerWidth - itemWidth) / 2) / containerWidth * 100,
			zIndex: mainElement + 2,
			opacity: 1,
			invert: 0
		}

		//first part of positions
		for (let i = mainElement - 1; i >= 0; i--) {
			let width
			let height
			let left
			let zIndex = i + 1
			let invert

			if (mainElement - 1 === i) {
				this.staticItem.style.zIndex = mainElement + 1
				width = this.tableOfPositions[mainElement].width - (this.tableOfPositions[mainElement].width / 100 * 15)
				height = this.tableOfPositions[mainElement].height - (this.tableOfPositions[mainElement].height / 100 * 15)
				left = this.tableOfPositions[mainElement].left - (width / 100 * 60)
				invert = 0.05
			}
			else if (mainElement - this.responsiveOptions.itemsOnSide <= i) {
				width = this.tableOfPositions[i + 1].width - (this.tableOfPositions[i + 1].width / 100 * 5)
				height = this.tableOfPositions[i + 1].height - (this.tableOfPositions[i + 1].height / 100 * 5)
				left = this.tableOfPositions[i + 1].left - (width / 100 * 15)
				invert = this.tableOfPositions[i + 1].invert + 0.05
			}
			else {
				width = this.tableOfPositions[mainElement - this.responsiveOptions.itemsOnSide].width
				height = this.tableOfPositions[mainElement - this.responsiveOptions.itemsOnSide].height
				left = this.tableOfPositions[mainElement - this.responsiveOptions.itemsOnSide].left
				invert = this.tableOfPositions[mainElement - this.responsiveOptions.itemsOnSide].invert
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
			else if (mainElement + this.responsiveOptions.itemsOnSide >= i) {
				width = this.tableOfPositions[i - 1].width - (this.tableOfPositions[i - 1].width / 100 * 5)
				height = this.tableOfPositions[i - 1].height - (this.tableOfPositions[i - 1].height / 100 * 5)
				left = this.tableOfPositions[i - 1].left + this.tableOfPositions[i - 1].width - (width / 100 * 85)
				invert = this.tableOfPositions[i - 1].invert + 0.1
			}
			else {
				width = this.tableOfPositions[mainElement + this.responsiveOptions.itemsOnSide].width
				height = this.tableOfPositions[mainElement + this.responsiveOptions.itemsOnSide].height
				left = this.tableOfPositions[mainElement + this.responsiveOptions.itemsOnSide].left
				invert = this.tableOfPositions[mainElement + this.responsiveOptions.itemsOnSide].invert
			}

			this.tableOfPositions[i] = { width, height, left, zIndex, invert }
		}

		// console.log('setTableOfPosition', this.tableOfPositions)
	}

	//for this.itemsMap
	setItemsMap() {
		for (let i = 0; i < this.items.length; i++) {
			this.itemsMap[i] = i
		}
		// console.log('setItemsMap', this.itemsMap)
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

		// console.log('setTableOfSteps', this.tableOfSteps)
	}

	//building actual elements into virtual positions by tableOfPosition
	alignmentOfItems() {
		for (let i = 0; i < this.items.length; i++) {
			this.items[i].style.width = `${this.tableOfPositions[i].width}%`
			this.items[i].style.height = `${this.tableOfPositions[i].height}%`
			this.items[i].style.left = `${this.tableOfPositions[i].left}%`
			this.items[i].style.zIndex = `${this.tableOfPositions[i].zIndex}`
			this.items[i].style.filter = `invert(${this.tableOfPositions[i].invert})`
			this.items[i].style.cursor = 'pointer'
		}
	}

	//function for switching between responsive swipe and an animation
	setAnimationOptions(settings) {
		const mainElement = Math.floor(this.items.length / 2)
		//getting a desired element depending on a direction
		const numOfEl = settings.direction === 'toPrev' ? mainElement - 1 : mainElement + 1

		if (settings.refreshFlag && !settings.reverseFlag) {
			this.animation = {
				//to save direction for the animationBehavior when reverseFlag: true
				direction: settings.direction,
				//correct current step for responsive swipe
				currentStep: 0,
				//coordinates and sizes of nonlinear elements
				leftX: this.tableOfPositions[numOfEl].left,
				widthX: this.tableOfPositions[numOfEl].width,
				heightX: this.tableOfPositions[numOfEl].height,
				inAnimationFlag: settings.hasOwnProperty('inAnimationFlag') ? settings.inAnimationFlag : false,
				reverseFlag: false
			}
		}
		else
			//updating data
			this.animation = Object.assign(this.animation, settings)
	}

	animationBehavior(direction, singleCall = false) {
		//the flag defining of start reverse steps in a animation
		let reverseFlag = false
		//if we started to swipe the slider using a responsive swipe and a actual direction(direction)
		// doesn't match a saved direction(this.animation.direction) the reverseFlag is true
		if (this.animation.inAnimationFlag) {
			reverseFlag = (direction === this.animation.direction) ? false : true
			direction = (direction === this.animation.direction) ? direction : this.animation.direction
		}

		return new Promise((resolve) => {
			//changing virtual positions numbers for actual elements in itemsMap after animation
			//and setting items on correct virtual positions
			const callback = (direction) => {

				this.setAnimationOptions({ refreshFlag: true })

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
				// console.log('animationBehavior itemsMap{fact: virt}: ', this.itemsMap)

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

			//number of main element(element which stays in center upon reload)
			const mainElement = Math.floor(this.items.length / 2)

			//amount of steps that we miss width and height increasing and go to the reverse direction
			const numOfMissedSteps = Math.round(amountOfSteps / 100 * this.timeOptions.perToRight)
			//amount of remaining steps
			const numOfRemainingSteps = Math.round(amountOfSteps / 100 * (100 - this.timeOptions.perToRight))

			const numOfEl = direction === 'toPrev' ? mainElement - 1 : mainElement + 1
			const plusWidth = this.tableOfSteps[numOfEl].stepWidth[direction] * numOfMissedSteps / numOfRemainingSteps
			const plusHeight = this.tableOfSteps[numOfEl].stepHeight[direction] * numOfMissedSteps / numOfRemainingSteps

			//width which hidden behind the mainElement of its neighboring elements
			const hiddenWidth = this.tableOfPositions[numOfEl].width / 100 * 40
			//step size to go to show a hidden width
			const stepLeftToRight = hiddenWidth / numOfMissedSteps

			//function that make non linear animation
			const trajectoryChanger = (i, direction) => {
				//non linear animation for elements which are next to the mainElement
				if (this.itemsMap[i] === mainElement - 1 || this.itemsMap[i] === mainElement + 1) {
					//if we are going back
					if (direction === 'toPrev' && this.itemsMap[i] === mainElement - 1) {
						if (this.animation.currentStep < numOfMissedSteps) {
							if (!reverseFlag)
								this.animation.leftX += stepLeftToRight * -1
							else
								this.animation.leftX -= stepLeftToRight * -1

							this.items[i].style.left = `${this.animation.leftX}%`
						} else {
							if (this.animation.currentStep === numOfMissedSteps && !reverseFlag) {
								this.items[i].style.zIndex = mainElement + 2
								this.items[i === this.items.length - 1 ? 0 : i + 1].style.zIndex = mainElement + 1
							} else if (this.animation.currentStep === numOfMissedSteps && reverseFlag) {
								this.items[i].style.zIndex = mainElement
								this.items[i === this.items.length - 1 ? 0 : i + 1].style.zIndex = mainElement + 2
							}

							//product of all missed steps + sum of hidden width an element / (remaining steps + 5.3) - I don't know why, but 5.3 makes it correct
							let plusToLeft = ((this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] * numOfMissedSteps + hiddenWidth) / (numOfRemainingSteps + 5.3))
							if (!reverseFlag) {
								this.animation.leftX += this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] + plusToLeft
								this.animation.widthX += this.tableOfSteps[this.itemsMap[i]].stepWidth[direction] + plusWidth
								this.animation.heightX += this.tableOfSteps[this.itemsMap[i]].stepHeight[direction] + plusHeight
							} else {
								this.animation.leftX -= this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] + plusToLeft
								this.animation.widthX -= this.tableOfSteps[this.itemsMap[i]].stepWidth[direction] + plusWidth
								this.animation.heightX -= this.tableOfSteps[this.itemsMap[i]].stepHeight[direction] + plusHeight
							}
							this.items[i].style.left = `${this.animation.leftX}%`
							this.items[i].style.width = `${this.animation.widthX}%`
							this.items[i].style.height = `${this.animation.heightX}%`
						}
						//if we are going forward 
					} else if (direction === 'toNext' && this.itemsMap[i] === mainElement + 1) {
						if (this.animation.currentStep < numOfMissedSteps) {
							if (!reverseFlag)
								this.animation.leftX += stepLeftToRight
							else
								this.animation.leftX -= stepLeftToRight
							this.items[i].style.left = `${this.animation.leftX}%`
						} else {
							if (this.animation.currentStep === numOfMissedSteps && !reverseFlag) {
								this.items[i].style.zIndex = mainElement + 2
								this.items[i === 0 ? this.items.length - 1 : i - 1].style.zIndex = mainElement + 1
							} else if (this.animation.currentStep === numOfMissedSteps && reverseFlag) {
								this.items[i].style.zIndex = mainElement
								this.items[i === 0 ? this.items.length - 1 : i - 1].style.zIndex = mainElement + 2
							}

							//product of all missed steps + sum of hidden width an element / (remaining steps + 5.3) - I don't know why, but 5.3 makes it correct
							let plusToLeft = ((Math.abs(this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] * numOfMissedSteps) + hiddenWidth) / (numOfRemainingSteps + 5.3)) * -1
							if (!reverseFlag) {
								this.animation.leftX += this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] + plusToLeft
								this.animation.widthX += this.tableOfSteps[this.itemsMap[i]].stepWidth[direction] + plusWidth
								this.animation.heightX += this.tableOfSteps[this.itemsMap[i]].stepHeight[direction] + plusHeight
							} else {
								this.animation.leftX -= this.tableOfSteps[this.itemsMap[i]].stepLeft[direction] + plusToLeft
								this.animation.widthX -= this.tableOfSteps[this.itemsMap[i]].stepWidth[direction] + plusWidth
								this.animation.heightX -= this.tableOfSteps[this.itemsMap[i]].stepHeight[direction] + plusHeight
							}
							this.items[i].style.left = `${this.animation.leftX}%`
							this.items[i].style.width = `${this.animation.widthX}%`
							this.items[i].style.height = `${this.animation.heightX}%`
						}
						//linear animation for the mainElement
					} else {
						if (!reverseFlag) {
							this.items[i].style.width = `${parseFloat(this.items[i].style.width) + this.tableOfSteps[this.itemsMap[i]].stepWidth[direction]}%`
							this.items[i].style.height = `${parseFloat(this.items[i].style.height) + this.tableOfSteps[this.itemsMap[i]].stepHeight[direction]}%`
							this.items[i].style.left = `${parseFloat(this.items[i].style.left) + this.tableOfSteps[this.itemsMap[i]].stepLeft[direction]}%`
						} else {
							this.items[i].style.width = `${parseFloat(this.items[i].style.width) - this.tableOfSteps[this.itemsMap[i]].stepWidth[direction]}%`
							this.items[i].style.height = `${parseFloat(this.items[i].style.height) - this.tableOfSteps[this.itemsMap[i]].stepHeight[direction]}%`
							this.items[i].style.left = `${parseFloat(this.items[i].style.left) - this.tableOfSteps[this.itemsMap[i]].stepLeft[direction]}%`
						}

					}
					//linear animation for elements which aren't next to the mainElement
				} else {
					if (!reverseFlag)
						this.items[i].style.left = `${parseFloat(this.items[i].style.left) + this.tableOfSteps[this.itemsMap[i]].stepLeft[direction]}%`
					else
						this.items[i].style.left = `${parseFloat(this.items[i].style.left) - this.tableOfSteps[this.itemsMap[i]].stepLeft[direction]}%`
				}
			}

			//animation function
			const animation = (direction) => {
				//this is some kind of callback to change this.animation.direction, since we write it only once when we start
				//the responsive swipe in mouseMove(), but when a reverse direction happens we don't pass the correct direction
				//back to the this.animation
				if (this.animation.currentStep === 0 && reverseFlag) {
					direction = direction === 'toPrev' ? 'toNext' : 'toPrev'
					reverseFlag = false
					this.setAnimationOptions({ direction, refreshFlag: true, inAnimationFlag: true })
				}

				if (singleCall && reverseFlag)
					this.animation.currentStep--
				else
					this.animation.currentStep++

				for (let i = 0; i < this.items.length; i++) {
					if (!(this.itemsMap[i] === mainElement - 1) && !(this.itemsMap[i] === mainElement + 1)) {
						if (!reverseFlag) {
							this.items[i].style.width = `${parseFloat(this.items[i].style.width) + this.tableOfSteps[this.itemsMap[i]].stepWidth[direction]}%`
							this.items[i].style.height = `${parseFloat(this.items[i].style.height) + this.tableOfSteps[this.itemsMap[i]].stepHeight[direction]}%`
						} else {
							this.items[i].style.width = `${parseFloat(this.items[i].style.width) - this.tableOfSteps[this.itemsMap[i]].stepWidth[direction]}%`
							this.items[i].style.height = `${parseFloat(this.items[i].style.height) - this.tableOfSteps[this.itemsMap[i]].stepHeight[direction]}%`
						}
					}

					//todo may be it also needs change
					// this.items[i].style.filter = `invert(${parseInt(this.items[i].style.filter) + this.tableOfSteps[i].invert[direction]})`

					trajectoryChanger(i, direction)

					//changing zIndex on the fly for an element which is last in tableOfPositions
					if ((this.animation.currentStep === amountOfSteps / 2) && this.itemsMap[i] === this.items.length - 1 && direction === 'toPrev') {
						this.items[i].style.zIndex = '0'
					}
					//changing zIndex on the fly for an element which is first in tableOfPositions
					if ((this.animation.currentStep === amountOfSteps / 2) && this.itemsMap[i] === 0 && direction === 'toNext') {
						this.items[i].style.zIndex = '0'
					}
				}

				// if current step >= amount of steps, we stop animation and call callback function
				if (this.animation.currentStep >= amountOfSteps) {
					clearInterval(startAnimate)
					callback(direction)
					resolve(true)
				}
			}
			//start of animation
			if (!singleCall)
				startAnimate = setInterval(() => { animation(direction) }, 5)
			else
				animation(direction)
		})
	}

	createSlider() {
		//preparing the slider container
		//get data about the slider container and a parent and set correct height and width for them
		this.makeBoxSizing()
		this.setResponsiveOptions()
		this.setSliderHeight()
		this.setSliderWidth()
		this.setParentHeight()

		//het data for items
		this.setTableOfPositions()
		this.setItemsMap()
		this.setTableOfSteps()

		//then we build the slider and elements
		this.buildMainElement()
		this.centeringTheStaticItem()
		this.alignmentOfItems()

		//then we set event listeners
		this.setEventListeners()
	}

	async stackWatcher() {
		if (this.stackNext > 0) {
			//if we're in animation we already have some steps with which the animationBehavior() will start an animation
			//if we aren't in animation the we need to update a data to default and start a new animation
			if (!this.animation.inAnimationFlag)
				//The direction is necessary to define a correct nonlinear element
				//The refreshFlag is necessary to update data for animation
				this.setAnimationOptions({ direction: 'toNext', refreshFlag: true })
			await this.animationBehavior('toNext')
			this.stackNext--
			this.stackWatcher()

		} else if (this.stackPrev > 0) {
			if (!this.animation.inAnimationFlag)
				this.setAnimationOptions({ direction: 'toPrev', refreshFlag: true })
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

	/*== touch events for mobile ==*/
	getFirstTouch = (e) => {
		if (e.target != this.itemsContainer && e.target != this.staticItem) {
			this.sliderContainer.addEventListener('touchmove', this.touchMove)
			this.sliderContainer.addEventListener('touchend', this.touchEnd)
			this.sliderContainer.addEventListener('touchcancel', this.touchEnd)
			this.startPosition = e.touches[0].clientX
		}
	}

	touchMove = (e) => {
		const width = this.items[Math.floor(this.items.length / 2)].getBoundingClientRect().width
		const stepInPX = width / (this.timeOptions.animationTime / this.timeOptions.interval)

		if (stepInPX <= Math.abs(this.startPosition - e.touches[0].clientX)) {
			if (this.startPosition - e.touches[0].clientX > 0) {
				if (this.stackNext === 0 && this.stackPrev === 0) {

					this.startPosition = e.touches[0].clientX

					if (!this.animation.inAnimationFlag)
						//The direction is necessary to define a correct nonlinear element and save this value for reverseFlag logic
						//The refreshFlag is necessary to update data for animation
						this.setAnimationOptions({ direction: 'toNext', refreshFlag: true, inAnimationFlag: true })

					this.animationBehavior('toNext', true)
				} else {
					this.setAnimationOptions({ inAnimationFlag: false })
					this.touchEnd()
					this.createClickNext()
				}

			} else {

				if (this.stackNext === 0 && this.stackPrev === 0) {
					this.startPosition = e.touches[0].clientX

					if (!this.animation.inAnimationFlag)
						//The direction is necessary to define a correct nonlinear element and save this value for reverseFlag logic
						//The refreshFlag is necessary to update data for animation
						this.setAnimationOptions({ direction: 'toPrev', refreshFlag: true, inAnimationFlag: true })

					this.animationBehavior('toPrev', true)
				} else {
					this.setAnimationOptions({ inAnimationFlag: false })
					this.touchEnd()
					this.createClickPrev()
				}
			}
		}
	}

	touchEnd = async () => {
		this.sliderContainer.removeEventListener('touchmove', this.touchMove)
		this.sliderContainer.removeEventListener('touchend', this.touchEnd)
		this.sliderContainer.removeEventListener('touchcancel', this.touchEnd)

		if (this.animation.inAnimationFlag) {
			if (this.animation.direction === 'toNext')
				this.createClickNext()
			else
				this.createClickPrev()
		}
	}
	/*== touch events for mobile ==*/

	setEventListeners() {
		window.addEventListener('resize', () => {
			const arrOfPoints = Object.keys(this.finalSettings.breakpoints)
			for (let point = 0; point < arrOfPoints.length; point++) {
				if (arrOfPoints[point] > window.innerWidth) {
					if (this.flagForRebuilding.toString() !== arrOfPoints[point].toString()) {
						this.flagForRebuilding = arrOfPoints[point]
						this.resetJsStyles()
						this.createSlider()
						return true
					}
					return true
				} else if (point === arrOfPoints.length - 1 && this.flagForRebuilding.toString() !== 'large') {
					this.flagForRebuilding = 'large'
					this.resetJsStyles()
					this.createSlider()
					return true
				}
			}
		})

		this.sliderContainer.addEventListener('touchstart', this.getFirstTouch)
		// this.itemsContainer.addEventListener('touchend', this.touchEnd)

		if (this.isNode(this.btnNext) && this.isNode(this.btnPrev)) {
			this.btnNext.addEventListener('click', this.createClickNext)
			this.btnNext.addEventListener('mousedown', (e) => e.stopPropagation())

			this.btnPrev.addEventListener('click', this.createClickPrev)
			this.btnNext.addEventListener('mousedown', (e) => e.stopPropagation())
		}

		if (this.isNode(this.itemsContainer)) {
			this.sliderContainer.addEventListener('mousedown', this.getMouseDown)
		}
	}

	/*== events for responsive swipe on mouse==*/
	getMouseDown = (e) => {
		e.preventDefault()

		if (e.which == 1)
			if (e.target != this.itemsContainer && e.target != this.staticItem) {
				this.startPosition = e.clientX
				this.sliderContainer.addEventListener('mousemove', this.mouseMove)
				this.sliderContainer.addEventListener('mouseup', this.mouseUp)
				this.sliderContainer.addEventListener('mouseleave', this.mouseUp)
			}
	}

	mouseMove = async (e) => {
		const width = this.items[Math.floor(this.items.length / 2)].getBoundingClientRect().width
		const stepInPX = width / (this.timeOptions.animationTime / this.timeOptions.interval)

		if (stepInPX <= Math.abs(this.startPosition - e.clientX)) {
			if (this.startPosition - e.clientX > 0) {
				if (this.stackNext === 0 && this.stackPrev === 0) {

					this.startPosition = e.clientX

					if (!this.animation.inAnimationFlag)
						//The direction is necessary to define a correct nonlinear element and save this value for reverseFlag logic
						//The refreshFlag is necessary to update data for animation
						this.setAnimationOptions({ direction: 'toNext', refreshFlag: true, inAnimationFlag: true })

					this.animationBehavior('toNext', true)
				} else {
					this.setAnimationOptions({ inAnimationFlag: false })
					this.mouseUp()
					this.createClickNext()
				}

			} else {

				if (this.stackNext === 0 && this.stackPrev === 0) {
					this.startPosition = e.clientX

					if (!this.animation.inAnimationFlag)
						//The direction is necessary to define a correct nonlinear element and save this value for reverseFlag logic
						//The refreshFlag is necessary to update data for animation
						this.setAnimationOptions({ direction: 'toPrev', refreshFlag: true, inAnimationFlag: true })

					this.animationBehavior('toPrev', true)
				} else {
					this.setAnimationOptions({ inAnimationFlag: false })
					this.mouseUp()
					this.createClickPrev()
				}
			}
		}
	}

	mouseUp = async () => {
		this.sliderContainer.removeEventListener('mousemove', this.mouseMove)
		this.sliderContainer.removeEventListener('mouseleave', this.mouseUp)
		this.sliderContainer.removeEventListener('mouseup', this.mouseUp)
		if (this.animation.inAnimationFlag) {
			if (this.animation.direction === 'toNext')
				this.createClickNext()
			else
				this.createClickPrev()
		}
	}
	/*== events for responsive swipe on mouse==*/
}