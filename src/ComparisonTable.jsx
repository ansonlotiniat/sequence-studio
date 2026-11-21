import React from 'react';
import './comparison-table.css';

// Keep the same row/column relationships on phones without shrinking the type.
// Only one representation is exposed at a time, including to screen readers.
export default function ComparisonTable({ label, corner = '位置', columns, rows, stackBy = 'column', className = '' }) {
  const narrowColumns = stackBy === 'row' ? rows.map(row => row.label) : columns;
  const narrowRows = stackBy === 'row' ? columns.map((column, i) => ({ label: column, cells: rows.map(row => row.cells[i]) })) : rows;
  return <div className={`comparison ${className}`}>
    <div className="comparison-wide" tabIndex="0" role="region" aria-label={`${label}，表格可左右捲動`}>
      <table aria-label={label}>
        <thead><tr><th scope="col">{corner}</th>{columns.map((column, i) => <th scope="col" key={i}>{column}</th>)}</tr></thead>
        <tbody>{rows.map(({ label: rowLabel, cells, className: rowClass }, row) => <tr key={row} className={rowClass}>
          <th scope="row">{rowLabel}</th>{cells.map((cell, i) => <td key={i}>{cell}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <ol className="comparison-narrow" aria-label={label}>
      {narrowColumns.map((column, i) => <li key={i}>
        <h5>{corner} · {column}</h5>
        <dl>{narrowRows.map(({ label: rowLabel, cells, className: rowClass }, row) => <div key={row} className={rowClass}>
          <dt>{rowLabel}</dt><dd>{cells[i]}</dd>
        </div>)}</dl>
      </li>)}
    </ol>
  </div>;
}
