Cartesian2Widget = function(p) {
	var pw = p.clientWidth, ph = p.clientHeight;

	var origin = new THREE.Vector2(50,50);

	var axesContainer = d3.select(p)
		.append('svg')
		.attr('width',  0.3*ph + 'px')
		.attr('height', 0.3*ph + 'px')
		.attr('viewBox', '0 0 100 100');
	var offsetX = 0.3 * ph / 2;
	var offsetY = 0.3 * ph / 2;
	var self = this;

	angle = 0;
	var x = parseInt(axesContainer.node().style.left || 0) + offsetX;
	var y = parseInt(axesContainer.node().style.top  || 0) + offsetY;

	var axes = axesContainer.append('g');
	var xhandle = axes.append("g");
	var yhandle = axes.append("g");

	function rotate(angleRad) {
		return 'rotate('+[THREE.Math.radToDeg(angleRad), origin.x, origin.y].join(',')+')';
	}

	var rotateBehavior = d3.drag().on('drag', function() {
		var clk = new THREE.Vector2(d3.event.x, d3.event.y).sub(origin);
		angle += clk.angle();
		axes.attr('transform', rotate(angle));
	});

	var resetAxes = function() {
		angle = 0;
		axes.attr('transform', rotate(angle));
	}

	function arrow(handle, color, angleOffset) {
		handle.attr('transform', rotate(-angleOffset))
			.append('line')
			.attr('x1', 50).attr('y1', 50)
			.attr('x2', 99).attr('y2', 50)
			.style('stroke', color);
		handle.append('polygon')
			.attr('class', 'handle')
			.attr('points', '91,46 99,50 91,54')
			.style('stroke', color)
			.style('fill', color)
			.on('dblclick', resetAxes)
			.call(rotateBehavior);
	}

	xhandle.call(arrow, "#f00", 0);
	yhandle.call(arrow, "#0f0", Math.PI/2);
	var startX, startY;

	axes.append('circle')
		.attr('class', 'handle')
		.attr('cx', 50).attr('cy', 50)
		.attr('r', '4')
		.style('stroke', '#fff')
		.style('fill', '#fff')
		.on('mousedown', function() {
			document.addEventListener("mousemove", _drag);
			document.addEventListener("mouseup", _endDrag);
			startX = d3.event.clientX;
			startY = d3.event.clientY;
			d3.event.preventDefault();
		});

	function _drag(event) {
		event.preventDefault();
		if (event.clientX - startX == 0 && event.clientY - startY == 0) {
			return;
		}
		self.setPos(x + event.clientX - startX,
		            y + event.clientY - startY);
		startX = x;
		startY = y;
	}
	function _endDrag(event) {
		document.removeEventListener("mousemove", _drag);
		document.removeEventListener("mouseup", _endDrag);
		startX = undefined;
		startY = undefined;
		event.preventDefault();
	}

	this.data = function() {
		return {x: x, y: y, angle: angle};
	}

	this.hide = function() {
		axesContainer.style('display', 'none');
	}

	this.show = function() {
		axesContainer.style('display', '');
	}

	this.showAt = function(vx, vy) {
		this.setPos(vx, vy);
		this.show();
	}

	this.setPos = function(vx, vy) {
		x = vx; y = vy;
		axesContainer.style('left', (x-offsetX)+'px')
			         .style('top',  (y-offsetY)+'px');
	}

	function onWindowResize() {
		var pctx = x / pw;
		var pcty = y / ph;

		pw = p.clientWidth;
		ph = p.clientHeight;

		axesContainer.attr('width',  0.3*ph + 'px')
		             .attr('height', 0.3*ph + 'px')
		             .attr('viewBox', '0 0 100 100');
		offsetX = 0.3 * ph / 2;
		offsetY = 0.3 * ph / 2;
		x = pctx * pw;
		y = pcty * ph;
		self.setPos(x,y);
	}

	window.addEventListener('resize', onWindowResize, false);
	this.hide();
}
