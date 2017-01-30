ColorPool = {
	colors: [
		"#f0ffff",
		"#f5f5dc",
		"#0000ff",
		"#a52a2a",
		"#00ffff",
		"#00008b",
		"#008b8b",
		"#a9a9a9",
		"#006400",
		"#bdb76b",
		"#8b008b",
		"#556b2f",
		"#ff8c00",
		"#9932cc",
		"#8b0000",
		"#e9967a",
		"#9400d3",
		"#ff00ff",
		"#ffd700",
		"#008000",
		"#4b0082",
		"#f0e68c",
		"#add8e6",
		"#e0ffff",
		"#90ee90",
		"#d3d3d3",
		"#ffb6c1",
		"#ffffb0",
		"#00ff00",
		"#ff00ff",
		"#800000",
		"#808000",
		"#ffa500",
		"#ffc0cb",
		"#800080",
		"#ff0000",
		"#ffff00"],

	/* TODO make this not repeat colors
	this.unusedColors = colors;

	this.get = function() {};
	this.recycle = function() {};
	*/

	random: function() {
		return this.colors[Math.floor(Math.random() * this.colors.length)];
	}
};
