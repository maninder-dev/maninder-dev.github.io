// Topic 210: JavaScript Core: this, Prototypes and Classes  (Full-Stack Handbook, Part 11)
// Run: npm run ex 210        (or: node 210-this-prototypes.js)
// What it shows: the four ways `this` is decided (method, plain call, new, call/apply/bind) plus arrow
// functions; the prototype chain; class as sugar over prototypes; call vs apply vs bind.
import assert from 'node:assert/strict';

const user = {
  name: 'Ann',
  regular() { return this?.name; },
  arrow: () => this?.name,           // `this` of the module scope (undefined in ESM), not user
  later() { return new Promise((r) => setTimeout(() => r(this.name))); }, // arrow inside keeps `this`
};

assert.equal(user.regular(), 'Ann', 'called as a method: this = the object');
const fn = user.regular;
assert.equal(fn(), undefined, 'plain call in strict mode: this = undefined (object lost)');
assert.equal(user.regular.bind(user)(), 'Ann', 'bind fixes this');
assert.equal(user.arrow(), undefined, 'arrow ignores how it is called');
assert.equal(await user.later(), 'Ann', 'arrow callback inherits this from later()');
console.log('this          : method=Ann, detached=undefined, bound=Ann, arrow=undefined, arrow-in-method=Ann');

// The classic bug: passing a method as a callback
class Button {
  constructor(label) { this.label = label; this.handleBroken = function () { return this?.label; }; this.handleFixed = () => this.label; }
}
const b = new Button('Save');
const fire = (cb) => cb();
assert.equal(fire(b.handleBroken), undefined);
assert.equal(fire(b.handleFixed), 'Save');
console.log('callback      : function loses this, arrow class field keeps it');

// new: this is the fresh object, linked to the constructor's prototype
function Person(name) { this.name = name; }
Person.prototype.hello = function () { return `hi ${this.name}`; };
const p = new Person('Cy');
assert.equal(p.hello(), 'hi Cy');
assert.equal(Object.getPrototypeOf(p), Person.prototype);

// Prototype chain lookup
const animal = { speak() { return `${this.name} makes a sound`; } };
const dog = Object.create(animal);
dog.name = 'Rex';
assert.equal(dog.speak(), 'Rex makes a sound');
assert.equal(Object.hasOwn(dog, 'speak'), false, 'speak lives on the prototype, not on dog');
assert.equal(Object.getPrototypeOf(Object.getPrototypeOf(dog)), Object.prototype);
assert.equal(Object.getPrototypeOf(Object.prototype), null, 'the chain ends at null');
console.log('prototype     : dog -> animal -> Object.prototype -> null');

// class is sugar over the same mechanism
class Cat { constructor(n) { this.name = n; } meow() { return 'meow'; } }
class Lion extends Cat { meow() { return super.meow().toUpperCase(); } }
const tom = new Cat('Tom');
assert.equal(Object.getPrototypeOf(tom), Cat.prototype);
assert.equal(typeof Cat, 'function');
assert.equal(Object.getPrototypeOf(Lion.prototype), Cat.prototype);
assert.equal(new Lion('Leo').meow(), 'MEOW');
console.log('class         : Cat is a function; Lion.prototype -> Cat.prototype');

// call vs apply vs bind
function intro(greeting, punct) { return `${greeting}, I'm ${this.name}${punct}`; }
const ann = { name: 'Ann' };
assert.equal(intro.call(ann, 'Hi', '!'), "Hi, I'm Ann!");
assert.equal(intro.apply(ann, ['Hello', '.']), "Hello, I'm Ann.");
const sayHey = intro.bind(ann, 'Hey');
assert.equal(sayHey('?'), "Hey, I'm Ann?");
assert.equal(sayHey.call({ name: 'Bob' }, '?'), "Hey, I'm Ann?", 'a bound function ignores later call()');
console.log('call/apply/bind:', intro.call(ann, 'Hi', '!'), '|', intro.apply(ann, ['Hello', '.']), '|', sayHey('?'));
console.log('OK: this is decided by the call site (except arrows and bound functions)');
