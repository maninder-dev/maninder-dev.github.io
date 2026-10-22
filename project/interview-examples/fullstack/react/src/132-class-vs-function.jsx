// Topic 132: Functional vs Class Components  (Full-Stack Handbook, Part 7)
// Run: npm run ex 132
// What it shows: the same counter as a class and as a function with hooks behave identically;
// componentDidMount maps to useEffect(..., []).
import { Component, useEffect, useState } from 'react';

export class ClassCounter extends Component {
  state = { count: 0 };
  // Arrow function class field: `this` is bound, so passing it as onClick is safe
  increment = () => this.setState({ count: this.state.count + 1 });
  componentDidMount() { document.title = 'Mounted (class)'; }
  render() {
    return <button onClick={this.increment}>{this.state.count}</button>;
  }
}

export function FunctionCounter() {
  const [count, setCount] = useState(0);
  useEffect(() => { document.title = 'Mounted (function)'; }, []);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
