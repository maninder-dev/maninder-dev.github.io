// Topic 170: Interview - Explain Reconciliation to a Junior  (Full-Stack Handbook, Part 8)
// Run: npm run ex 170
// What it shows: the LEGO house analogy made measurable: changing the door colour leaves every
// other DOM node alone; React swaps the door (one attribute), it does not rebuild the house.
export function House({ doorColor }) {
  return (
    <div className="house">
      <div className="roof">roof</div>
      <div className="walls">
        <span className="window">window</span>
        <span className={`door ${doorColor}`}>door</span>
        <span className="window">window</span>
      </div>
    </div>
  );
}
