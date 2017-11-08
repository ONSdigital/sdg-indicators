$(window).resize(function () {
	let pageHeight = $(window).height()
	let contentHeight = $('body').height() + 40

	if ($('footer').hasClass('fixed')) {
		if (pageHeight > (contentHeight + $('footer').height())) {
			$('footer').addClass('fixed');
		} else {
			$('footer').removeClass('fixed');
		}
	} else {
		if (pageHeight > contentHeight) {
			$('footer').addClass('fixed');
		} else {
			$('footer').removeClass('fixed');
		}
	}
});

$( document ).ready(function(){
	$(window).trigger('resize');
	setTimeout(function(){$(window).trigger('resize')},50) //Ugly workaround for frontpage footer
})
