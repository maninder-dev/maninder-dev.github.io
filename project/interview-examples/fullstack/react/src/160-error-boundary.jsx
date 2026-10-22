// Topic 160: Error Boundaries  (Full-Stack Handbook, Part 8)
// Run: npm run ex 160
// What it shows: a render error in a child shows the fallback instead of blanking the page, is
// reported via componentDidCatch, and "Try again" resets the boundary; an error thrown in an event
// handler is NOT caught by the boundary.
import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true }; // render phase: switch to fallback
  }
  componentDidCatch(error, info) {
    this.props.onReport?.(error, info.componentStack); // commit phase: log to Sentry etc.
  }
  render() {
    if (this.state.hasError) {
      return (
        <p>
          This section failed to load.{' '}
          <button onClick={() => { this.props.onReset?.(); this.setState({ hasError: false }); }}>Try again</button>
        </p>
      );
    }
    return this.props.children;
  }
}

export function RevenueChart({ data }) {
  if (!data) throw new Error('No revenue data');
  return <p>Revenue: {data.total}</p>;
}

export function ExportButton() {
  return <button onClick={() => { throw new Error('export failed'); }}>Export</button>;
}
