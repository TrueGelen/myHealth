import GnativeCarousel from './GnativeCarousel'

window.addEventListener('load', () => {

	new GnativeCarousel({
		animationTime: 300,
		sliderContainer: '#GnativeCarousel',
		itemsContainer: '#GnativeCarousel__itemsContainer',
		staticItem: '#GnativeCarousel__staticItem',
		btnsContainer: '#GnativeCarousel__buttons',
		btnNext: '#GnativeCarousel__btnNext',
		btnPrev: '#GnativeCarousel__btnPrev',
		itemsOnSide: 3,
		adaptive: true,
		breakpoints: {
			'1360': {},
			'1100': {},
			'960': {},
			'768': { responsive: true },
		}
	}).createSlider()
})