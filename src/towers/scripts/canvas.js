function Canvas(canvas_id) {
  this.canvas_id = canvas_id;
  this.recreate();
}

Canvas.prototype.load_canvas = function() {
  this.canvas = document.getElementById(this.canvas_id);
  this.ctx = this.canvas.getContext('2d');
}

Canvas.prototype.set_width = function(width) {
  this.canvas.width = this.width = biggest(window.innerWidth, width); // this.width can be queried by external agents.
}

Canvas.prototype.set_height = function(height) {
  this.canvas.height = this.height = height; // this.height can be queried by external agents.
}

Canvas.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
}

// Necessary to quash bug in which redraw of old game state occurs after victory, redrawing old game state over new,
// rendering the new game invisible until player forces redraw by clicking on disk. For details, see comment beginning
// "All right, prepare for things to get downright wacky" in InputHandler.prototype.on_canvas_mouseup.
Canvas.prototype.recreate = function() {
  this.load_canvas();
  var canvas_prime = this.canvas.cloneNode(false);
  this.canvas.parentNode.replaceChild(canvas_prime, this.canvas);
  this.load_canvas();
}
// Takes array containing separate integers for RGB values.
function Colour(rgb) {
  this.rgb = rgb;
}

Colour.prototype.toString = function() {
  return 'rgb(' + this.rgb.join() + ')';
}

// Two random colour generation methods follow, both of which are intended to generate vibrant, bright colours that
// contrast well with the black towers. I'm not sure which method I prefer, so both have been preserved.
//
// The following algorithm generates an HSV colour and then converts it to RGB. HSV is used based on the reasoning that
// it more easily allows one to get a colour with the desired properties, for one can keep the saturation and value
// within a narrow range while picking the hue at random.
Colour.random = function() {
  return Colour.convert_hsv_to_rgb([random_int(0, 359),
                                    random_int(40, 80)/80,
                                    random_int(40, 80)/80]);
}

// Here three integers are chosen, each within a fairly narrow range. Each integer is then assigned randomly to the
// R, G, or B channel.
Colour.random_alternative = function() {
  var rgb = [random_int(0, 127), random_int(64, 192), random_int(128, 255)];
  shuffle(rgb);
  return new Colour(rgb);
}

// h must be in interval [0, 360), and s and v in [0, 1].
Colour.convert_hsv_to_rgb = function(hsv) {
  // Algorithm used from http://en.wikipedia.org/wiki/HSL_color_space#Conversion_from_HSV_to_RGB and
  // http://www.cs.rit.edu/~ncs/color/t_convert.html.
  var h = hsv[0], s = hsv[1], v = hsv[2];
  h = (h/60) % 6;
  var h_i = Math.floor(h);
  var f = h - h_i;
  var p = v*(1 - s);
  var q = v*(1 - f*s);
  var t = v*(1 - (1 - f)*s);

  switch(h_i) {
    case 0:
      var rgb = [v, t, p];
      break;
    case 1:
      var rgb = [q, v, p];
      break;
    case 2:
      var rgb = [p, v, t];
      break;
    case 3:
      var rgb = [p, q, v];
      break;
    case 4:
      var rgb = [t, p, v];
      break;
    case 5:
      var rgb = [v, p, q];
      break;
  }
  return new Colour(rgb.map(function(a) { return Math.round(a*256); }));
}
function Debug() {
  this.output = document.getElementById('debug');
}

Debug.prototype.msg = function(message) {
  this.output.innerHTML += '<p>' + message + '</p>';
}

Debug.prototype.clear = function() {
  this.output.innerHTML = '';
}
function Disk(tower, width, colour) {
  this.colour = colour;
  this.width = width;
  this.height = Disk.height;
  this.transfer_to_tower(tower);
}

// Specified as class property so that TowerManager can calculate how high to make towers, based on number of disks.
Disk.height = 15;

Disk.prototype.move_to = function(point) {
  this.position = point;
  this.centre = new Point(this.position.x + this.width/2, this.position.y + this.height/2);
}

Disk.prototype.transfer_to_tower = function(destination) {
  var top_disk = destination.get_top_disk();
  // Do not permit disks wider than tower's existing top disk to transfer to that
  // tower -- in such a case, move the disk back to its original tower.
  if(top_disk && top_disk.width < this.width) destination = this.tower;;

  if(this.tower) this.tower.remove_disk(this);
  this.move_to(new Point(destination.position.x + (destination.base.width - this.width)/2,
                         destination.disks_top - this.height));
  destination.add_disk(this);
  this.tower = destination;

  this.on_disk_transferred();
}

Disk.prototype.draw = function() {
  this.tower.ctx.beginPath();
  this.tower.ctx.rect(this.position.x, this.position.y, this.width, this.height);
  this.tower.ctx.closePath();

  this.tower.ctx.save();
  this.tower.ctx.fillStyle = this.colour;
  this.tower.ctx.fill();
  this.tower.ctx.restore();
}

Disk.prototype.is_clicked_on = function(point) {
  return point.x >= this.position.x              &&
         point.x <  this.position.x + this.width &&
         point.y >= this.position.y              &&
         point.y <  this.position.y + this.height;
}

Disk.prototype.is_top_disk = function() {
  return this == this.tower.get_top_disk();
}

Disk.prototype.toString = function() {
  return 'Disk(width=' + this.width + ', colour=' + this.colour + ')'
}

// Called when disk is transferred to any tower (including directly back to same tower). External agents
// may override to implement custom behaviour.
Disk.prototype.on_disk_transferred = function() { }
function ElementCoordinateFinder(element) {
  this.element = element;
}

ElementCoordinateFinder.prototype.get_mouse_coordinates = function(event) {
  return new Point(event.pageX - this.get_offset_x(), event.pageY - this.get_offset_y());
}

ElementCoordinateFinder.prototype.get_offset = function(type) {
  var offset_property = (type == 'x' ? 'offsetLeft' : 'offsetTop');
  var result = this.element[offset_property];
  for(var parent = this.element; parent = parent.offSetParent; parent != null) {
    result += parent[offset_property];
  }
  return result;
}

ElementCoordinateFinder.prototype.get_offset_x = function() {
  return this.get_offset('x');
}

ElementCoordinateFinder.prototype.get_offset_y = function() {
  return this.get_offset('y');
}
function Game(disks_count) {
  this.start_new(disks_count);
}

Game.prototype.start_new = function(disks_count) {
  debug.msg('New game');

  var canvas = new Canvas('canvas');
  var tower_manager = new TowerManager(canvas, disks_count);
  var input_handler = new InputHandler(canvas.ctx, tower_manager);
  var game_state = new GameState(tower_manager, input_handler);
  var victory_celebrator = new VictoryCelebrator(input_handler);
  game_state.on_victory = function() { victory_celebrator.on_victory(); }

  tower_manager.draw();
}
function GameState(tower_manager) {
  this.tower_manager = tower_manager;
  this.connect_to_disks();
  this.last_complete_tower = this.find_complete_tower();
}

GameState.prototype.on_disk_transferred = function() {
  var complete_tower = this.find_complete_tower();
  if(complete_tower && complete_tower != this.last_complete_tower) {
    this.last_complete_tower = complete_tower;
    this.on_victory();
  }
}

GameState.prototype.find_complete_tower = function() {
  var towers = this.tower_manager.towers;
  for(var i in towers) {
    if(towers[i].disks.length == this.count_total_disks()) return towers[i];
  }
}

GameState.prototype.count_total_disks = function() {
  return this.tower_manager.get_all_disks().length;
}

GameState.prototype.connect_to_disks = function() {
  var disks = this.tower_manager.get_all_disks();
  var self = this;
  for(var i in disks) {
    // Must use closure and 'self' -- only in so doing do we have access to GameState object.
    // 'this' refers to the object that calls the method -- in this case, the Disk object.
    disks[i].on_disk_transferred = function() { self.on_disk_transferred(); }
  }
}

// Called when player is victorious. External agents may override this property to implement victory behaviour.
GameState.prototype.on_victory = function() { }
function init() {
  debug = new Debug(); // TODO: convert to singleton to eliminate global variable.
  new Game(3);
  document.getElementById('start-new-game').addEventListener('click', function() {
    document.getElementById('introduction').style.display = 'none';
  }, false);
}
window.addEventListener('load', init, false);
function InputHandler(ctx, tower_manager) {
  this.ctx = ctx;
  this.tower_manager = tower_manager;
  this.canvas = ctx.canvas;
  this.coordinate_finder = new ElementCoordinateFinder(this.canvas);
  this.add_event_listeners();
  this.enable_input();
}

InputHandler.prototype.add_event_listeners = function() {
  debug.msg('Adding event listeners');
  // Must use 'self', for when event handler is called, 'this' will refer not to the InputHandler instance I expect,
  // but to the element on which the event occurred -- in this case, the canvas element.
  var self = this;
  // TODO: make clicked-on disk always draw on top of other disks.
  this.canvas.addEventListener('mousedown', function(event) { self.on_canvas_mousedown(event); }, false);
  this.canvas.addEventListener('mousemove', function(event) { self.on_canvas_mousemove(event); }, false);
  this.canvas.addEventListener('mouseup',   function(event) { self.on_canvas_mouseup(event); },   false);
}

InputHandler.prototype.on_canvas_mousedown = function(event) {
  if(!this.allow_input) return;
  var coords = this.coordinate_finder.get_mouse_coordinates(event);
  this.disk = this.tower_manager.get_clicked_disk(coords);
  if(!this.disk || !this.disk.is_top_disk()) return;

  this.mouse_delta = coords.subtract(this.disk.position);
  this.dragging = true;
}

InputHandler.prototype.on_canvas_mousemove = function(event) {
  if(!this.dragging) return;
  var coords = this.coordinate_finder.get_mouse_coordinates(event);
  this.disk.move_to(coords.subtract(this.mouse_delta));
  this.tower_manager.draw();
  this.show_distance_to_each_tower();
}

InputHandler.prototype.show_distance_to_each_tower = function() {
  debug.clear();
  debug.msg('Distance to tower 1: ' + this.disk.centre.distance_to(this.tower_manager.towers[0].top));
  debug.msg('Distance to tower 2: ' + this.disk.centre.distance_to(this.tower_manager.towers[1].top));
  debug.msg('Distance to tower 3: ' + this.disk.centre.distance_to(this.tower_manager.towers[2].top));
}

InputHandler.prototype.on_canvas_mouseup = function(event) {
  if(!this.dragging) return;
  this.dragging = false;
  var closest_tower = this.tower_manager.find_closest_tower(this.disk.centre);
  this.disk.transfer_to_tower(closest_tower);
  // All right, prepare for things to get downright wacky. The line below is at the root of a difficult-to-find
  // bug in which, after the game is won and a new one is started, the canvas is redrawn with the old disks in the
  // position that won the game, rendering the new disks invisible. The flow of the application is as follows:
  //
  //   * The line above (this.disk.transfer_to_tower) causes GameState's on_disk_transferred callback to be called.
  //   * When the game is won, GameState's on_disk_transferred in turn calls VictoryCelebrator's on_victory callback.
  //   * VictoryCelebrator's on_victory creates a new game. Everything happens as one would expect -- new towers and
  //     associated disks are created, and the canvas is redrawn to show the new towers & disks.
  //   * When Game's constructor exits, having initialized the new game, the call stack unwinds. Execution returns to
  //     the end of VictoryCelebrator.on_victory, then the end of GameState.on_disk_transferred, then the end of
  //     Disk.transfer_to_tower, then the end of InputHandler.on_canvas_mouseup -- that's here! (Call stack also
  //     unwinds through anonymous closures wrapping calls to VictoryCelebrator.on_victory and
  //     GameState.on_disk_transferred, but we don't count those.) With the call above to Disk.transfer_to_tower having
  //     completed, the line below is executed.
  //
  // The problem below is that this.tower_manager refers to the *old* TowerManager, with the old towers and the old
  // disks, but the same canvas element as is used in the new game. Thus, the canvas is overwritten with the old towers
  // and disks. To see the proper game state, the player must then click on the invisible new disk located on the
  // first tower -- doing so will force a redraw, showing the proper game state.
  //
  // I see no obvious way to correct this at this location, for the call to this.tower_manager.draw must come after the
  // disk being dragged by the player has been moved to its new tower. Instead, in Game's initialization code, I shall
  // recreate the canvas element. The post-victory redraw responsible for the bug shall then draw to a canvas element no
  // longer within the document (but still valid, for it remains in memory -- garbage collection will destroy it in
  // time).
  //
  // Incidentally, Firebug's Javascript debugger was invaluable in tracking the source of this issue -- without Firebug,
  // I doubt I'd have figured it out. For whatever reason, with Firebug 1.3.3, the debugger wouldn't work when the
  // document was accessed locally (through file://..., not through a Web server). Accessing the document on a remote
  // server allowed Firebug's Javascript debugger to work, however.
  this.tower_manager.draw();
}

InputHandler.prototype.disable_input = function() {
  debug.msg('Input disabled');
  this.allow_input = false;
}

InputHandler.prototype.enable_input = function() {
  debug.msg('Input enabled');
  this.allow_input = true;
}
// Returns random integer in range [min, max].
function random_int(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function shuffle(arr) {
  arr.sort(function(a, b) { return Math.random() - 0.5; });
}

function biggest(a, b) {
  return a > b ? a : b;
}
function Point(x, y) {
  this.x = x;
  this.y = y;
}

// Does not operate in-place -- returns new Point.
// I'd like to implement it as an operator, but no operator overloading until Javascript 2, alas.
Point.prototype.subtract = function(point) {
  return new Point(this.x - point.x, this.y - point.y);
}

Point.prototype.distance_to = function(other) {
  return Math.sqrt(Math.pow(other.x - this.x, 2) + Math.pow(other.y - this.y, 2));
}

Point.prototype.toString = function() {
  return '(' + this.x + ', ' + this.y + ')';
}
function Tower(position, base_width, stem_height, ctx) {
  this.position = position;
  this.ctx = ctx;
  this.disks = [];

  this.base = {'width': base_width, 'height': 20};
  this.stem = {'width': 20, 'height': stem_height};
  this.height = this.base.height + this.stem.height;
  this.base.position = new Point(this.position.x, this.position.y + this.stem.height);
  this.stem.position = new Point(this.position.x + (this.base.width/2 - this.stem.width/2), this.position.y);

  this.top = new Point(this.stem.position.x + this.stem.width/2, this.stem.position.y);
  this.disks_top = this.base.position.y;
}

Tower.prototype.toString = function() {
  return 'Tower(x=' + this.position.x + ', y=' + this.position.y + ')';
}

Tower.prototype.add_disk = function(disk) {
  this.disks.push(disk);
  this.disks_top -= disk.height;
}

Tower.prototype.remove_disk = function(disk) {
  this.disks.splice(this.disks.indexOf(disk), 1);
  this.disks_top += disk.height;
}

Tower.prototype.draw = function() {
  this.draw_self();
  this.draw_disks();
}

Tower.prototype.draw_self = function() {
  this.ctx.save();
  // Draw towers behind existing content, such as the disks of other towers.
  this.ctx.globalCompositeOperation = 'destination-over';
  this.ctx.beginPath();
  this.ctx.rect(this.base.position.x, this.base.position.y, this.base.width, this.base.height);
  this.ctx.rect(this.stem.position.x, this.stem.position.y, this.stem.width, this.stem.height);
  this.ctx.closePath();
  this.ctx.fill();
  this.ctx.restore();
}

Tower.prototype.draw_disks = function() {
  for(i in this.disks)
    this.disks[i].draw();
}

Tower.prototype.get_top_disk = function() {
  return this.disks[this.disks.length - 1];
}
function TowerManager(canvas, disks_count) {
  this.canvas = canvas;
  this.disks_count = parseInt(disks_count, 10);
  this.towers_count = 3;
  this.create_towers();
  this.add_initial_disks();
}

TowerManager.prototype.add_initial_disks = function() {
  var disk_widths = this.calculate_disk_widths();
  while(width = disk_widths.pop()) new Disk(this.towers[0], width, Colour.random().toString());
}

TowerManager.prototype.draw = function() {
  this.canvas.clear();
  for(i in this.towers) {
    this.towers[i].draw();
  }
}

TowerManager.prototype.create_towers = function() {
  this.towers = [];
  var base_width = this.calculate_disk_widths().pop() + 30;
  var stem_height = this.disks_count*Disk.height + 40;
  var base_horizontal_separation = biggest(16, base_width/10);
  var horizontal_padding = 42;
  var vertical_padding = 80;

  var towers_width = base_width*this.towers_count + base_horizontal_separation*(this.towers_count - 1);
  // Calls to this.canvas.set_width and this.canvas.set_height are not combined into a single call to
  // this.canvas.set_size, as canvas width must be known *before* tower is created (so that proper x-offset for tower
  // can be calculated), but canvas height can only be known *after* tower is created (since height of canvas depends
  // on height of tallest tower).
  this.canvas.set_width(towers_width + 2*horizontal_padding);
  var x = (this.canvas.width - towers_width)/2;

  for(var i = 0; i < this.towers_count; i++) {
    // Ideally, towers should be able to resize themselves based on the number of disks they hold, freeing TowerManager
    // from needing to know what size to create them. Rather than take such an approach, though, I have TowerManager
    // calculate the size of the towers for two reasons:
    //
    //   * All towers must be the same size, or otherwise visual consistency is ruined. This means that a tower would
    //     need to know how to resize its brethren, or TowerManager would need to query for the largest tower, then set
    //     the rest of the towers to that size. The first approach violates separation of concerns, since a tower
    //     should only know about itself; the second approach requires TowerManager to deal with resizing towers,
    //     which means I might as well have it calculate the size, too.
    //
    //   * Disks added to towers during game initialization are added in the same manner as when a disk is moved from
    //     tower to tower as a result of user input. As such, if towers were responsible for resizing themselves based
    //     on number of disks, I'd have to create two disk-adding routines: one during game initialization that causes
    //     the towers to dynamically resize, and one used during gameplay that does not cause such resizes to occur.
    //
    // Given these concerns, I determined that including tower size-calculation logic in TowerManager is acceptable.
    var tower = new Tower(new Point(x, vertical_padding), base_width, stem_height, this.canvas.ctx);
    this.towers.push(tower);
    x += base_width + base_horizontal_separation;
  }
  this.canvas.set_height(this.towers[0].height + 2*vertical_padding);
}

TowerManager.prototype.calculate_disk_widths = function() {
  var disk_widths = [];
  var width = 40;
  for(var i = 0; i < this.disks_count; i++) {
    disk_widths.push(width += 20);
  }
  return disk_widths;
}

TowerManager.prototype.get_clicked_disk = function(point) {
  var disks = this.get_all_disks();
  for(i in disks) {
    if(disks[i].is_clicked_on(point)) return disks[i];
  }
}

TowerManager.prototype.get_all_disks = function() {
  var disks = [];
  for(i in this.towers) disks = disks.concat(this.towers[i].disks);
  return disks;
}

TowerManager.prototype.find_closest_tower = function(point) {
  var distances = [];
  for(i in this.towers) {
    distances.push({'tower':    this.towers[i],
                    'distance': this.towers[i].top.distance_to(point)});
  }
  distances.sort(function(a, b) { return a.distance - b.distance; });
  return distances[0]['tower'];
}


TowerManager.prototype.toString = function() {
  return 'TowerManager( ' + this.towers + ' )';
}
function VictoryCelebrator(input_handler) {
  this.input_handler = input_handler;
}

VictoryCelebrator.prototype.on_victory = function() {
  this.input_handler.disable_input();

  var victory_notification = document.getElementById('victory-notification');
  victory_notification.style.display = 'block';
  document.getElementById('play-again').addEventListener('click', function() {
      victory_notification.style.display = 'none';
      new Game(document.getElementById('disks-count').value);
  }, false);
}