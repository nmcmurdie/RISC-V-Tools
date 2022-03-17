var elemPressed, currRipple, removeCountdown, tooltipDelayTimer, hovering = false, totalTooltips = 0, sbOpen = false;

function addRipplesTo(elem) {
	elem.addEventListener("mousedown", createRipple);
	elem.addEventListener("mouseup", removeRipple);
	elem.addEventListener("mouseout", () => endRipples(true));
}

function createRipple(event) {
	var container, ripple = document.createElement("div"), ref = elemPressed ? document.getElementById(elemPressed.id) : true,
		style, color, bgcolor;
	if (!elemPressed || elemPressed != event.target || ref) {
		if (elemPressed && ref) elemPressed.removeChild(document.getElementById("_ripple-container"));
		container = document.createElement("div");
		elemPressed = event.target;
		container.classList.add("-ripple-container");
		container.id = "_ripple-container";
		elemPressed.appendChild(container);
	} else container = document.getElementById("_ripple-container");
	style = window.getComputedStyle(elemPressed);
	color = style.getPropertyValue("color");
	bgcolor = style.getPropertyValue("background-color");
	bgcolor = bgcolor.substring(0, bgcolor.length - 1).split("(")[1].split(",");
	if (color !== "rgb(0, 0, 0)") ripple.style.backgroundColor = color;
	else if (+bgcolor[0] + +bgcolor[1] + +bgcolor[2] > 500 && !(bgcolor.length > 3 && +bgcolor[3] < .3)) ripple.style.backgroundColor = "#6c6c6c";
	ripple.classList.add("-ripple-item");
	ripple.style.left = event.offsetX + "px";
	ripple.style.top = event.offsetY + "px";
	container.appendChild(ripple);
	currRipple = ripple;
	setTimeout(() => ripple.classList.add("-ripple-visible"), 0);
}

function removeRipple() {
	var rip = currRipple, cont = document.getElementById("_ripple-container");
	if (rip) setTimeout(function() {
		rip.style.opacity = 0;
		setTimeout(function() {
			if (cont && cont.contains(rip)) cont.removeChild(rip);
			if (!removeCountdown) endRipples();
		}, 300);
	}, 200);
}

function endRipples(confirm) {
	var cont = document.getElementById("_ripple-container");
	if (elemPressed && document.getElementById(elemPressed.id)) {
		if (confirm) {
			removeRipple();
			setTimeout(endRipples, 300);
		} else if (cont && cont.childElementCount === 0) {
			elemPressed.removeChild(cont);
			elemPressed = undefined;
			clearTimeout(removeCountdown);
			removeCountdown = undefined;
		} else removeCountdown = setTimeout(endRipples, 20);
	}
}

function addTooltip(elem, optTooltip) {
	if (elem) {
		if (!elem.id) elem.id = "tooltip_" + totalTooltips;
		if (optTooltip) elem.setAttribute("tooltip", optTooltip);
		elem.addEventListener("mouseover", preTooltip);
		elem.addEventListener("mouseout", closeTooltip);
		elem.addEventListener("mousedown", closeTooltip);
		totalTooltips++;
	}
}

function preTooltip(event) {
	hovering = true;
	tooltipDelayTimer = setTimeout(function() {if (hovering) tooltip(event)}, 500);
}

function tooltip(event) {
	var parent = event.target, viewHeight = window.screen.availHeight, viewWidth = document.body.clientWidth, rect = parent.getBoundingClientRect(),
		tooltip = document.createElement("div"), ripple = document.createElement("div"),
		top = rect.top + parent.scrollTop + parent.clientHeight + 10, left = rect.left + (parent.clientWidth / 2);
	let targetRect = event.target.getBoundingClientRect(),
		locX = targetRect.left,
		locY = targetRect.top;
	
	tooltip.classList.add("-tooltip");
	tooltip.appendChild(document.createTextNode(parent.getAttribute("tooltip")));

	if (locY + targetRect.height + 52 >= viewHeight) {
		console.log("Override top");
		top = rect.top + parent.scrollTop - 42;
		tooltip.classList.add("-tooltip-bottom");
	}
	if (locX + targetRect.width + 62 >= viewWidth) {
		console.log("Override left");
		left = viewWidth - tooltip.clientWidth - 10;
		tooltip.classList.add("-tooltip-right");
	}
	tooltip.style.left = Math.round(left) + "px";
	tooltip.style.top = Math.round(top) + "px";
	tooltip.id = "_tooltip_" + parent.id;
	ripple.classList.add("-ripple");
	tooltip.appendChild(ripple);
	document.body.appendChild(tooltip);
	setTimeout(
		function() {
			tooltip.classList.add("-tooltip-visible");
			ripple.classList.add("-tooltip-visible");
		}, 0
	);
}

function closeTooltip(event) {
	var elem = document.getElementById("_tooltip_" + event.target.id);
	hovering = false;
	clearTimeout(tooltipDelayTimer);
	if (elem) elem.style.opacity = 0;
	setTimeout(
		function() {
			if (elem && document.body.contains(elem)) document.body.removeChild(elem);
		}, 200
	);
}

function snackbar(txt) {
	var sb = document.getElementById("snackbar");
	sb.firstChild.nodeValue = txt;
	if (sbOpen) {
		clearTimeout(sbTimer);
		sb.style.animation = "snackbar .5s ease";
		setTimeout(() => sb.style.removeProperty("animation"), 500);
	} else {
		sb.classList.add("snackbar-visible");
		sbOpen = true;
	}
	sbTimer = setTimeout(function() {
		sb.classList.remove("snackbar-visible");
		sbOpen = false;
	}, 150 * txt.length);
}