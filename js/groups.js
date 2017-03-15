function PixelGroupMapping(manager, group, id, name) {
	var self = this;

	this.group = group;
	this.model = group.model;

	this.mapping_valid = false;
	this.origin = {};
	this.proj_plane = {};

	var first_enable = true;
	this.tree_id = group.group_id + '-map-' + id;
	this.widget = new Cartesian2Widget(container);

	var screen = screenManager.addScreen(this.tree_id, {isOrtho: true, inheritOrientation: true});

	var elem = manager.tree.insertItem({
		id: self.tree_id,
		content: name,
		dataset: {mapping: self}
	}, group.group_id);

	this.mapPoint = function(point) {
		var fromOrigin = point.clone().sub(self.proj_plane.origin);
		return new THREE.Vector2(self.proj_plane.xaxis.dot(fromOrigin),
								 self.proj_plane.yaxis.dot(fromOrigin));
	}

	this.save = function() {
		self.origin = self.widget.data();
		var cam_quaternion = screenManager.activeScreen.camera.quaternion.clone();
		var cam_up = screenManager.activeScreen.camera.up.clone();

		// Create plane from the camera's look vector
		var plane_normal = new THREE.Vector3(0, 0, -1);
		plane_normal.applyQuaternion(cam_quaternion).normalize();
		self.proj_plane.plane = new THREE.Plane(plane_normal);
		console.log("plane normal:", plane_normal);

		// Create axes for the projection and rotate them appropriately
		self.proj_plane.yaxis = cam_up.clone().applyQuaternion(cam_quaternion);
		self.proj_plane.yaxis.applyAxisAngle(plane_normal, self.origin.angle);
		self.proj_plane.yaxis.normalize();

		self.proj_plane.xaxis = plane_normal.clone().cross(self.proj_plane.yaxis);
		self.proj_plane.xaxis.normalize();

		// Project the screen position of the origin widget onto the proejction
		// plane.  This is the 3d position of the mapping origin.
		var raycaster = new THREE.Raycaster();
		var widgetpos = new THREE.Vector2(self.origin.x_norm, self.origin.y_norm);
		raycaster.setFromCamera(widgetpos, screenManager.activeScreen.camera);
		self.proj_plane.origin = raycaster.ray.intersectPlane(self.proj_plane.plane);

		self.mapping_valid = true;
		global_test_mapping = self;
	}

	this.enable = function() {
		self.model.hideUnderlyingModel();
		screenManager.setActive(self.tree_id);

		if (first_enable) {
			first_enable = false;
			self.widget.showAt(200,200);
		} else {
			self.widget.show();
		}
	}

	this.disable = function() {
		//self.cameraState = screenManager.activeScreen.saveCameraState();
		self.model.showUnderlyingModel();
		screenManager.setActive('main');
		//screenManager.activeScreen.setCameraState(oldCameraState);
		self.widget.hide();
	}
}

/*
 * Pixel group management
 *
 * The group manager keeps track of all pixel groups for the current model.
 *
 * A group may consist of a set of pixels, xor a set of other groups, but not a
 * combination of the two.
 */

function PixelGroup(manager, id, pixels, name, color) {
	var self = this;
	this.group_id = 'group-'+id;
	var group_name = name ? name : "unnamed"
	var group_color = color ? color : new THREE.Color(0xff0000);
	var group_mappings = Immutable.Map();
	this.pixels = pixels ? pixels : Immutable.Map();
	this.model = manager.model;
	this.overlay = model.createOverlay(1);

	_nextid = 0;
	function newgid() {
		return _nextid++;
	}

	var elem = manager.tree.insertItem({
		id: this.group_id,
		content: group_name,
		dataset: {group: self}},
		'root'
	);

	var checkbox = new LiteGUI.Checkbox(true, function(v) {
		if (v) {
			self.show();
		} else {
			self.hide();
		}
	});

	checkbox.root.style.float = 'right';

	elem.querySelector('.postcontent').appendChild(checkbox.root);

	Object.defineProperty(this, 'name', {
		get: function() { return group_name; },
		set: function(v) {
			group_name = v;
			manager.tree.updateItem(this.group_id, {
				content: group_name,
				dataset: {group: this}
			});
		}
	});

	Object.defineProperty(this, 'color', {
		get: function() { return group_color; },
		set: function(v) {
			group_color = v;
			if (this.overlay.size() > 0)
				this.show();
		}
	});

	this.hide = function() {
		this.overlay.clear();
	}

	this.show = function() {
		this.overlay.setAllFromSet(this.pixels, this.color);
	}

	this.addMapping = function() {
		var map_id = newgid();

		var name = 'map-'+map_id;
		var mapping = new PixelGroupMapping(manager, this, map_id, name);

		group_mappings = group_mappings.set(map_id, mapping);
		worldState.checkpoint();

		return mapping;
	}

	this.snapshot = function() {
		return Immutable.fromJS({
			name: group_name,
			id: this.group_id,
			pixels: this.pixels,
			mappings: group_mappings,
			color: group_color,
			overlay: this.overlay.snapshot(),
		});
	}

	this.setFromSnapshot = function(snapshot) {
		this.name = snapshot.get("name");
		this.group_id = snapshot.get('id');
		group_mappings = snapshot.get("mappings");
		group_color = snapshot.get("color");
		this.pixels = snapshot.get("pixels");
		this.overlay.setFromSnapshot(snapshot.get('overlay'));
	}
}

function GroupManager(model) {
	var self = this;
	this.model = model;

	var currentGroup = undefined;
	var currentMapping = undefined;

	// Future work: nice group reordering UI, probably a layer on top of this
	// referencing group IDs, to keep groups in order
	this.groups = Immutable.Map();

	// Manually assign group id labels so that deleting a group doesn't
	// reassign ids
	_nextid = 0;
	function newgid() {
		return _nextid++;
	}

	var treePanel = new LiteGUI.Panel('group-tree', {
		title: 'Group Management',
		scroll: true
	});

	var panel = new LiteGUI.Panel('group-panel');

	var groupCmds = new LiteGUI.Inspector();
	groupCmds.addSeparator();
	groupCmds.addButton(undefined, 'Make Group', function() {
		var newgroup = self.createFromActiveSelection();
		self.tree.setSelectedItem(newgroup.group_id);
		setCurrentGroup(newgroup);
		clearCurrentMapping();
	});
	groupCmds.addSeparator();

	var currGroupInspector = new LiteGUI.Inspector();
	var currMappingInspector = new LiteGUI.Inspector();

	function setCurrentGroup(group) {
		currentGroup = group;
		currGroupInspector.clear();
		currGroupInspector.addSection('Current Group');
		currGroupInspector.addButton(null, 'Add Mapping', function() {
			var map = currentGroup.addMapping()
			self.tree.setSelectedItem(map.tree_id);
			setCurrentMapping(map);
		});
		currGroupInspector.addButton(null, 'Delete Group');
		currGroupInspector.addButton(null, 'Add Active Selection to Group');
		currGroupInspector.addButton(null, 'Deselect', function() {
			clearCurrentGroup()
		});
		currGroupInspector.addSeparator();
		currGroupInspector.addColor('color', group.color.toArray(), {
			callback: function(v) {
				currentGroup.color = new THREE.Color(v[0], v[1], v[2]);
			}
		});
		currGroupInspector.addString('name', group.name, {
			callback: function(v) {
				currentGroup.name = v;
			}
		});
	}

	function setCurrentMapping(mapping) {
		setCurrentGroup(mapping.group);
		currentMapping = mapping;

		currMappingInspector.clear();
		currMappingInspector.addSection('Current Mapping');
		// TODO hide/show based on in/out of mapping mode
		currMappingInspector.addButton(null, 'Edit', function() {
			currentMapping.enable();
		});
		currMappingInspector.addButton(null, 'Save', function() {
			currentMapping.save();
			currentMapping.disable();
		});
	}

	function clearCurrentMapping() {
		currentMapping = undefined;
		currMappingInspector.clear();
	}

	function clearCurrentGroup() {
		for (var elem of self.tree.root.querySelectorAll('.selected, .semiselected')) {
			elem.classList.remove('selected');
			elem.classList.remove('semiselected');
		}
		currentGroup = undefined;
		currGroupInspector.clear();
		clearCurrentMapping();
	}

	this.tree = new LiteGUI.Tree('group-tree',
		{id: 'root', children: [], visible: false},
		{height: '100%', allow_rename: true}
	);

	this.tree.onBackgroundClicked = function() {
		clearCurrentGroup();
	}

	this.tree.root.addEventListener('item_selected', function(event) {
		var dataset = event.detail.data.dataset;

		if (dataset.group) {
			setCurrentGroup(dataset.group);
			clearCurrentMapping();
		} else if (dataset.mapping) {
			setCurrentMapping(dataset.mapping);
		}
	});

	this.tree.root.addEventListener('item_renamed', function(event) {
		var dataset = event.detail.data.dataset;

		if (dataset.group) {
			var group = dataset.group;
			group.name = event.detail.new_name;
		}
	});

	console.log(treePanel);

	treePanel.add(this.tree);
	panel.add(groupCmds);
	panel.add(currGroupInspector);
	panel.add(currMappingInspector);

	UI.sidebar.split('vertical', ['30%', null], true);
	UI.sidebar.getSection(0).add(treePanel);
	UI.sidebar.getSection(1).add(panel);
	UI.sidebar = UI.sidebar.getSection(1); //hm
	//UI.sidebar.add(groupCmds);

	this.createFromActiveSelection = function() {
		// Don't create an empty group
		if (worldState.activeSelection.size() == 0)
			return;

		var groupPixels = worldState.activeSelection.getPixels();
		worldState.activeSelection.clear();
		var id = newgid();
		var defaultName = "group-" + id;

		var newgroup = new PixelGroup(self, id, groupPixels, defaultName,
			ColorPool.random());

		this.groups = this.groups.set(id, newgroup);


		newgroup.show();
		// Mark the group on the model
		worldState.checkpoint();

		return newgroup;
	}

	this.snapshot = function () {
		return this.groups.map(function(groupobj) {
			return groupobj.snapshot();
		});
	}

	this.setFromSnapshot = function(snapshot) {
		/*
		 * If a group already exists in the current manager, just update it.
		 * If it doesn't currently exist, we need to create a new one to
		 * update, and similarly if it stopped existing it should be deleted.
		 */
		var newgroups = snapshot.map(function(groupsnap, id) {
			var existingGroup = this.groups.get(id);
			if (existingGroup) {
				existingGroup.setFromSnapshot(groupsnap);
				return existingGroup;
			} else {
				var newGroup = new PixelGroup(self);
				newGroup.setFromSnapshot(groupsnap);
				return newGroup;
			}
		});
		// Check for destroyed groups
		this.groups.forEach(function(group, id) {
			if (!newgroups.get(id)) {
				group.cleanup();
			}
		});

		this.groups = newgroups;
	}
}
