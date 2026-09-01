import React from 'react';

const MAP = {
  Open: 'amber', 'In Progress': 'blue', Resolved: 'teal', Closed: 'gray',
  Low: 'teal', Medium: 'amber', High: 'red', Critical: 'red',
  Active: 'teal', 'In Repair': 'amber', Retired: 'gray', Storage: 'blue'
};

export default function StatusPill({ value, label }) {
  const color = MAP[value] || 'gray';
  return (
    <span className={`pill ${color}`}>
      <span className="dot" />
      {label || value}
    </span>
  );
}
