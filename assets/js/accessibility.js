document.addEventListener("DOMContentLoaded", function () {
	$('#main-content h3').addClass('roleHeader');
	$('#main-content h3').attr({
		'tabindex': 0,
		'role': 'button'
	});
	$('.roleHeader').click(function () {
		$(this).nextUntil('h3').stop(true, true).slideToggle();
	}).nextUntil('h3').hide();
	$('.roleHeader').keypress(function (e) {
		if (e.which == 13 || e.which == 32) { //Enter or space key pressed
			$(this).trigger('click');
		}
	});
})
