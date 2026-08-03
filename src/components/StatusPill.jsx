import React from 'react';

const MAP = {
  // Ticket status
  Open: 'amber',
  'In Progress': 'blue',
  Resolved: 'teal',
  Closed: 'gray',
  // Priority
  Low: 'teal',
  Medium: 'amber',
  High: 'red',
  Critical: 'red',
  // Asset status
  Active: 'teal',
  'In Repair': 'amber',
  Retired: 'gray',
  Storage: 'blue'
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
