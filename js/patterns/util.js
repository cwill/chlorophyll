// Structural node types for the pattern graph
function OutputColor() {
	this.addInput('outcolor', 'CRGB');
}

OutputColor.prototype.onAdded = function() {
	this.graph.addGlobalOutput('outcolor');
}

OutputColor.prototype.onExecute = function() {
	this.graph.setGlobalOutputData('outcolor', this.getInputData(0));
}

OutputColor.title = 'Output Color';
OutputColor.visible_stages = [];

LiteGraph.registerNodeType("output/color", OutputColor);

function Cartesian2DInput() {
	this.addOutput('x', 'number');
	this.addOutput('y', 'number');
	this.addOutput('t', 'number');
	this.addOutput('color', 'CRGB');
}

Cartesian2DInput.prototype.onAdded = function() {
	this.graph.addGlobalInput('x');
	this.graph.addGlobalInput('y');
	this.graph.addGlobalInput('t');
	this.graph.addGlobalInput('color');
}

Cartesian2DInput.prototype.onExecute = function() {
	var x = this.graph.global_inputs['x'].value;
	var y = this.graph.global_inputs['y'].value;
	var t = this.graph.global_inputs['t'].value;
	var color = this.graph.global_inputs['color'].value;

	this.setOutputData(0, x);
	this.setOutputData(1, y);
	this.setOutputData(2, t);
	this.setOutputData(3, color);
}

Cartesian2DInput.title = 'Cartesian2DInput';
Cartesian2DInput.visible_stages = [];

LiteGraph.registerNodeType('input/cartesian2d', Cartesian2DInput);

// TODO refactor inputs to a common class, they're going to share everything
// except the number/names of coordinates.
function Polar2DInput() {
	this.addOutput('r', 'number');
	this.addOutput('theta', 'number');
	this.addOutput('t', 'number');
	this.addOutput('color', 'CRGB');
}

Polar2DInput.prototype.onAdded = function() {
	this.graph.addGlobalInput('r');
	this.graph.addGlobalInput('theta');
	this.graph.addGlobalInput('t');
	this.graph.addGlobalInput('color');
}

Polar2DInput.prototype.onExecute = function() {
	var r = this.graph.global_inputs['r'].value;
	var theta = this.graph.global_inputs['theta'].value;
	var t = this.graph.global_inputs['t'].value;
	var color = this.graph.global_inputs['color'].value;

	this.setOutputData(0, r);
	this.setOutputData(1, theta);
	this.setOutputData(2, t);
	this.setOutputData(3, color);
}

Polar2DInput.title = 'Polar2DInput';
Polar2DInput.visible_stages = [];

LiteGraph.registerNodeType('input/polar2d', Polar2DInput);

function PrecomputeOutput() {
	this.addProperty("name", null);
}

PrecomputeOutput.prototype.onAdded = function() {
	var self = this;
	LiteGUI.prompt('name', function(v) {
		self.addInput(v);
		self.properties["name"] = v;
		self.graph.addGlobalOutput(v);
	});
}

PrecomputeOutput.prototype.onExecute = function() {
	this.graph.setGlobalOutputData(this.properties['name'], this.getInputData(0));
}

PrecomputeOutput.visible_stages = ['precompute'];
PrecomputeOutput.title = 'Precompute Output';

LiteGraph.registerNodeType('output/value', PrecomputeOutput);
